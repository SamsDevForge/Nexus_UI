"""Authenticated preferences, inbox and push registration. No implicit delivery."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import ConfigDict, Field
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from .api import SessionDependency, UserDependency, envelope
from .audit import record_audit
from .errors import ApiError
from .models import Notification, Preference, Profile, PushDelivery, PushDevice
from .notification_rules import utc
from .push import token_cipher
from .schemas import ApiModel, NotificationPreferences


async def enabled(request: Request) -> None:
    if not request.app.state.settings.notifications_enabled:
        raise ApiError(
            503, "notifications_disabled", "Notifications are not enabled on this server."
        )


router = APIRouter(
    prefix="/api/v1/notifications", tags=["Notifications"], dependencies=[Depends(enabled)]
)


class BriefPreferences(NotificationPreferences):
    model_config = ConfigDict(extra="forbid")
    morning_enabled: bool = False
    evening_enabled: bool = False


class TestBrief(ApiModel):
    model_config = ConfigDict(extra="forbid")
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r"^[\w-]+$")


class DeviceInput(ApiModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    fid: str = Field(min_length=20, max_length=4096, pattern=r"^[!-~]+$")
    platform: Literal["web", "android"] = "web"


def preference_payload(p: Preference, zone: str, request: Request) -> dict[str, Any]:
    settings = request.app.state.settings
    return {
        "style": p.notification_style,
        "inApp": p.in_app,
        "devicePush": p.device_push,
        "emailDigest": False,
        "morningEnabled": p.morning_brief_enabled,
        "eveningEnabled": p.evening_brief_enabled,
        "morningBriefAt": p.morning_brief_at.isoformat(timespec="minutes"),
        "eveningBriefAt": p.evening_brief_at.isoformat(timespec="minutes"),
        "quietHours": {
            "enabled": p.quiet_hours_enabled,
            "startsAt": p.quiet_hours_start.isoformat(timespec="minutes"),
            "endsAt": p.quiet_hours_end.isoformat(timespec="minutes"),
        },
        "timezone": zone,
        "paused": p.observation_paused or p.automations_paused,
        "pushAvailable": settings.push_enabled and bool(settings.fcm_web_vapid_public_key),
        "webVapidPublicKey": settings.fcm_web_vapid_public_key if settings.push_enabled else None,
    }


@router.get("/preferences")
async def get_preferences(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    p, profile = await session.get(Preference, user.id), await session.get(Profile, user.id)
    if p is None or profile is None:
        raise ApiError(409, "onboarding_required", "Complete onboarding before scheduling briefs.")
    return envelope(request, preference_payload(p, profile.timezone, request))


@router.put("/preferences")
async def put_preferences(
    body: BriefPreferences, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    p, profile = await session.get(Preference, user.id), await session.get(Profile, user.id)
    if p is None or profile is None:
        raise ApiError(409, "onboarding_required", "Complete onboarding before scheduling briefs.")
    if body.email_digest:
        raise ApiError(422, "email_unavailable", "Email delivery is not implemented in this phase.")
    p.notification_style, p.in_app, p.device_push = body.style, body.in_app, body.device_push
    p.morning_brief_enabled, p.evening_brief_enabled = body.morning_enabled, body.evening_enabled
    p.morning_brief_at, p.evening_brief_at = body.morning_brief_at, body.evening_brief_at
    p.quiet_hours_enabled = body.quiet_hours.enabled
    p.quiet_hours_start, p.quiet_hours_end = body.quiet_hours.starts_at, body.quiet_hours.ends_at
    await record_audit(
        session,
        user_id=user.id,
        event_type="notification.preferences.updated",
        request_id=request.state.request_id,
        target_type="notification-preferences",
        target_id=str(user.id),
        result="success",
        changed_fields=["schedule", "channels", "quiet_hours"],
    )
    await session.commit()
    return envelope(request, preference_payload(p, profile.timezone, request))


def item_payload(item: Notification, deliveries: list[PushDelivery]) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "kind": item.kind,
        "title": item.title,
        "body": item.body,
        "status": item.status,
        "reason": item.reason,
        "dueAt": utc(item.due_at).isoformat(),
        "expiresAt": utc(item.expires_at).isoformat(),
        "deliveredAt": utc(item.delivered_at).isoformat() if item.delivered_at else None,
        "readAt": utc(item.read_at).isoformat() if item.read_at else None,
        "evidence": item.evidence,
        "push": [{"status": d.status, "reason": d.reason} for d in deliveries],
    }


@router.get("")
async def inbox(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    items = (
        await session.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.due_at.desc())
            .limit(50)
        )
    ).all()
    delivery_rows = (
        (
            await session.scalars(
                select(PushDelivery)
                .join(Notification)
                .where(
                    Notification.user_id == user.id,
                    PushDelivery.notification_id.in_([i.id for i in items]),
                )
            )
        ).all()
        if items
        else []
    )
    return envelope(
        request,
        {
            "items": [
                item_payload(i, [d for d in delivery_rows if d.notification_id == i.id])
                for i in items
            ],
            "serverTime": datetime.now(UTC).isoformat(),
        },
    )


@router.patch("/{item_id}/read")
async def mark_read(
    item_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    item = await session.scalar(
        select(Notification).where(Notification.id == item_id, Notification.user_id == user.id)
    )
    if item is None or item.status != "delivered":
        raise ApiError(404, "notification_unavailable", "That notification is unavailable.")
    item.read_at = item.read_at or datetime.now(UTC)
    await session.commit()
    return envelope(request, {"id": str(item.id), "readAt": utc(item.read_at).isoformat()})


@router.post("/test")
async def test_brief(
    body: TestBrief, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    key, now = f"test:{body.idempotency_key}", datetime.now(UTC)
    existing = await session.scalar(
        select(Notification).where(Notification.user_id == user.id, Notification.dedup_key == key)
    )
    if existing:
        return envelope(request, item_payload(existing, []))
    profile = await session.get(Profile, user.id)
    p = await session.get(Preference, user.id)
    if not profile or not p or p.observation_paused or p.automations_paused:
        raise ApiError(
            409, "notifications_paused", "Complete onboarding and resume notifications first."
        )
    count = await session.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.kind == "test",
            Notification.created_at > now - timedelta(hours=1),
        )
    )
    if (count or 0) >= 3:
        raise ApiError(429, "test_limit", "At most three test briefs can be queued per hour.")
    item = Notification(
        user_id=user.id,
        kind="test",
        dedup_key=key,
        timezone=profile.timezone,
        due_at=now,
        expires_at=now + timedelta(hours=2),
        evidence={"requestedByUser": True, "scheduledAt": now.isoformat()},
    )
    session.add(item)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        duplicate = await session.scalar(
            select(Notification).where(
                Notification.user_id == user.id, Notification.dedup_key == key
            )
        )
        if duplicate is None:
            raise
        item = duplicate
    return envelope(request, item_payload(item, []))


@router.get("/devices")
async def devices(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    rows = (
        await session.scalars(
            select(PushDevice).where(PushDevice.user_id == user.id, PushDevice.active.is_(True))
        )
    ).all()
    return envelope(request, [{"id": str(d.id), "platform": d.platform} for d in rows])


@router.post("/devices")
async def register_device(
    body: DeviceInput, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    settings = request.app.state.settings
    if not settings.push_enabled:
        raise ApiError(503, "push_unavailable", "Push is not configured on this server.")
    p = await session.get(Preference, user.id)
    if p is None:
        raise ApiError(409, "onboarding_required", "Complete onboarding first.")
    digest = hashlib.sha256(body.fid.encode()).hexdigest()
    device = await session.scalar(select(PushDevice).where(PushDevice.token_hash == digest))
    if device and device.active and device.user_id != user.id:
        raise ApiError(
            409, "device_registered", "Unregister this browser before switching accounts."
        )
    count = await session.scalar(
        select(func.count())
        .select_from(PushDevice)
        .where(PushDevice.user_id == user.id, PushDevice.active.is_(True))
    )
    if (not device or not device.active or device.user_id != user.id) and (count or 0) >= 5:
        raise ApiError(409, "device_limit", "Remove a registered device before adding another.")
    encrypted = token_cipher(settings).encrypt(body.fid.encode()).decode()
    if device:
        device.user_id, device.token_encrypted = user.id, encrypted
        device.platform, device.active = body.platform, True
    else:
        device = PushDevice(
            user_id=user.id, token_hash=digest, token_encrypted=encrypted, platform=body.platform
        )
        session.add(device)
    p.device_push = True  # This endpoint is called only after the explicit opt-in action.
    try:
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise ApiError(409, "device_conflict", "Registration changed. Please retry.") from error
    return envelope(request, {"id": str(device.id), "platform": device.platform})


@router.delete("/devices/{device_id}")
async def revoke_device(
    device_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    device = await session.scalar(
        select(PushDevice).where(PushDevice.id == device_id, PushDevice.user_id == user.id)
    )
    if device is None:
        raise ApiError(404, "device_unavailable", "That registration is unavailable.")
    device.active, device.token_encrypted = False, ""
    await session.execute(
        update(PushDelivery)
        .where(PushDelivery.device_id == device.id, PushDelivery.status == "queued")
        .values(status="suppressed", reason="permission_revoked")
    )
    await session.flush()
    count = await session.scalar(
        select(func.count())
        .select_from(PushDevice)
        .where(PushDevice.user_id == user.id, PushDevice.active.is_(True))
    )
    if not count:
        p = await session.get(Preference, user.id)
        if p:
            p.device_push = False
    await record_audit(
        session,
        user_id=user.id,
        event_type="notification.device.revoked",
        request_id=request.state.request_id,
        target_type="push-device",
        target_id=str(device.id),
        result="success",
        changed_fields=["active"],
    )
    await session.commit()
    return envelope(request, {"id": str(device.id), "active": False})
