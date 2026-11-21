"""Owned calendar copies, explicit consent and verified change signals; no provider writes."""

from __future__ import annotations

import asyncio
import secrets
import uuid
from datetime import UTC, date, datetime, time, timedelta
from hmac import compare_digest
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import PlainTextResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .api import SessionDependency, UserDependency
from .audit import record_audit
from .calendar_import import import_ics, timetable_events
from .calendar_provider import CalendarFailure, CalendarProvider, cipher, provider_configuration
from .calendar_rules import EventData, ManualEvent, Provider, TimetableInput, conflicts, key
from .errors import ApiError
from .models import (
    CalendarCollection,
    CalendarConnection,
    CalendarEvent,
    CalendarOAuthState,
    Preference,
    Profile,
    User,
)
from .notification_rules import paused, utc


async def enabled(request: Request) -> None:
    if not request.app.state.settings.calendar_enabled:
        raise ApiError(503, "calendar_disabled", "Calendar is not enabled on this server.")


router = APIRouter(prefix="/api/v1/calendar", tags=["Calendar"], dependencies=[Depends(enabled)])


def envelope(request: Request, data: Any) -> dict[str, Any]:
    # Personal calendar data must never enter shared HTTP caches.
    return {"data": data, "requestId": request.state.request_id}


class IcsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    timezone: str
    contents: str = Field(min_length=1, max_length=1_000_000)
    replace: bool = False

    @field_validator("name")
    @classmethod
    def meaningful_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Choose a name for this import.")
        return value.strip()


class TimetableRequest(TimetableInput):
    replace: bool = False


class PreparationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    minutes: int = Field(ge=0, le=240, strict=True)


def event_payload(event: CalendarEvent) -> dict[str, Any]:
    return {
        "id": str(event.id),
        "title": event.title,
        "location": event.location,
        "startsAt": utc(event.starts_at).isoformat(),
        "endsAt": utc(event.ends_at).isoformat(),
        "timezone": event.timezone,
        "allDay": event.all_day,
        "startsOn": event.starts_on,
        "endsOn": event.ends_on,
        "busy": event.busy,
        "status": event.status,
        "preparationMinutes": 0 if event.all_day else event.preparation_minutes,
        "prepareAt": (
            utc(event.starts_at) - timedelta(minutes=event.preparation_minutes)
        ).isoformat()
        if not event.all_day
        else None,
        "source": event.source,
        "collectionId": str(event.collection_id) if event.collection_id else None,
        "connectionId": str(event.connection_id) if event.connection_id else None,
        "sourceUpdatedAt": utc(event.source_updated_at).isoformat()
        if event.source_updated_at
        else None,
    }


@router.get("")
async def agenda(
    request: Request,
    session: SessionDependency,
    user: UserDependency,
    start: date | None = None,
    days: int = Query(default=7, ge=1, le=31),
) -> dict[str, Any]:
    profile = await session.get(Profile, user.id)
    p = await session.get(Preference, user.id)
    if not profile or not p:
        raise ApiError(409, "onboarding_required", "Complete onboarding first.")
    today = start or datetime.now(UTC).astimezone(ZoneInfo(profile.timezone)).date()
    begins = datetime.combine(today, time(), ZoneInfo(profile.timezone)).astimezone(UTC)
    ends = datetime.combine(
        today + timedelta(days=days), time(), ZoneInfo(profile.timezone)
    ).astimezone(UTC)
    events = (
        await session.scalars(
            select(CalendarEvent)
            .outerjoin(CalendarConnection, CalendarConnection.id == CalendarEvent.connection_id)
            .where(
                CalendarEvent.user_id == user.id,
                or_(
                    CalendarEvent.connection_id.is_(None), CalendarConnection.status == "connected"
                ),
                CalendarEvent.starts_at < ends,
                or_(
                    CalendarEvent.ends_at > begins,
                    and_(
                        CalendarEvent.starts_at == CalendarEvent.ends_at,
                        CalendarEvent.starts_at >= begins,
                    ),
                ),
            )
            .order_by(CalendarEvent.starts_at, CalendarEvent.id)
            .limit(1001)
        )
    ).all()
    items = [event_payload(event) for event in events[:1000]]
    connections = (
        await session.scalars(
            select(CalendarConnection).where(CalendarConnection.user_id == user.id)
        )
    ).all()
    collections = (
        await session.scalars(
            select(CalendarCollection).where(CalendarCollection.user_id == user.id)
        )
    ).all()
    availability = {}
    for provider in ("google", "microsoft"):
        try:
            provider_configuration(request.app.state.settings, provider)
            availability[provider] = True
        except ApiError:
            availability[provider] = False
    return envelope(
        request,
        {
            "timezone": profile.timezone,
            "startDate": today.isoformat(),
            "endDateExclusive": (today + timedelta(days=days)).isoformat(),
            "items": items,
            "conflicts": conflicts(items),
            "truncated": len(events) > 1000,
            "paused": paused(p),
            "providers": availability,
            "collections": [{"id": str(c.id), "kind": c.kind, "name": c.name} for c in collections],
            "connections": [
                {
                    "id": str(c.id),
                    "provider": c.provider,
                    "status": c.status,
                    "error": c.error_code,
                    "scopes": c.scopes,
                    "lastSyncedAt": utc(c.last_synced_at).isoformat() if c.last_synced_at else None,
                    "freshUntil": (utc(c.last_synced_at) + timedelta(minutes=5)).isoformat()
                    if c.last_synced_at
                    else None,
                    "watchExpiresAt": utc(c.watch_expires_at).isoformat()
                    if c.watch_expires_at
                    else None,
                }
                for c in connections
            ],
            "serverTime": datetime.now(UTC).isoformat(),
        },
    )


async def collection(session: AsyncSession, user: User, kind: str, name: str) -> CalendarCollection:
    await session.refresh(user, with_for_update=True)
    existing = await session.scalar(
        select(CalendarCollection).where(
            CalendarCollection.user_id == user.id,
            CalendarCollection.kind == kind,
            CalendarCollection.name == name,
        )
    )
    if existing:
        return existing
    value = CalendarCollection(user_id=user.id, kind=kind, name=name)
    session.add(value)
    await session.flush()
    return value


@router.post("/events")
async def add_manual(
    body: ManualEvent, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    profile = await session.get(Profile, user.id)
    if not profile:
        raise ApiError(409, "onboarding_required", "Complete onboarding first.")
    group = await collection(session, user, "manual", "Manual events")
    data = EventData(
        external_key=key(body.idempotency_key),
        timezone=profile.timezone,
        **body.model_dump(exclude={"idempotency_key"}),
    )
    existing = await session.scalar(
        select(CalendarEvent).where(
            CalendarEvent.collection_id == group.id, CalendarEvent.external_key == data.external_key
        )
    )
    if existing:
        if (
            existing.title != data.title
            or utc(existing.starts_at) != data.starts_at
            or utc(existing.ends_at) != data.ends_at
            or existing.location != data.location
            or existing.preparation_minutes != data.preparation_minutes
        ):
            raise ApiError(
                409, "calendar_key_reused", "That save key already belongs to a different event."
            )
        return envelope(request, event_payload(existing))
    event = CalendarEvent(
        user_id=user.id, collection_id=group.id, source="manual", **data.model_dump()
    )
    session.add(event)
    await session.flush()
    await record_audit(
        session,
        user_id=user.id,
        event_type="calendar.manual.saved",
        request_id=request.state.request_id,
        target_type="calendar-event",
        target_id=str(event.id),
        result="success",
        changed_fields=["event"],
    )
    await session.commit()
    return envelope(request, event_payload(event))


@router.put("/events/{event_id}")
async def edit_manual(
    event_id: uuid.UUID,
    body: ManualEvent,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    event = await session.scalar(
        select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id)
    )
    if not event:
        raise ApiError(404, "calendar_event_missing", "That event is unavailable.")
    if event.source != "manual":
        raise ApiError(
            409,
            "calendar_read_only",
            "Edit this event at its source; NEXUS provider access is read-only.",
        )
    values = body.model_dump(exclude={"idempotency_key"})
    values["starts_at"], values["ends_at"] = utc(body.starts_at), utc(body.ends_at)
    for field, value in values.items():
        setattr(event, field, value)
    await session.commit()
    return envelope(request, event_payload(event))


@router.delete("/events/{event_id}")
async def delete_manual(
    event_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    event = await session.scalar(
        select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id)
    )
    if not event:
        raise ApiError(404, "calendar_event_missing", "That event is unavailable.")
    if event.source != "manual":
        raise ApiError(
            409,
            "calendar_read_only",
            "Remove the imported collection or disconnect its source instead.",
        )
    await session.delete(event)
    await session.commit()
    return envelope(request, {"removed": True})


@router.patch("/events/{event_id}/preparation")
async def preparation(
    event_id: uuid.UUID,
    body: PreparationInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    event = await session.scalar(
        select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id)
    )
    if not event:
        raise ApiError(404, "calendar_event_missing", "That event is unavailable.")
    event.preparation_minutes = body.minutes
    await session.commit()
    return envelope(request, event_payload(event))


async def replace_collection(
    session: Any,
    user: User,
    kind: str,
    name: str,
    fingerprint: str,
    events: list[EventData],
    replace: bool,
) -> dict[str, Any]:
    group = await collection(session, user, kind, name.strip())
    if group.fingerprint == fingerprint:
        return {"collectionId": str(group.id), "imported": len(events), "alreadyImported": True}
    if group.fingerprint and not replace:
        raise ApiError(
            409,
            "calendar_replace_confirmation",
            "That import name already exists. Explicitly choose replacement to change it.",
        )
    await session.execute(
        delete(CalendarEvent).where(
            CalendarEvent.collection_id == group.id, CalendarEvent.user_id == user.id
        )
    )
    for data in events:
        session.add(
            CalendarEvent(
                id=uuid.uuid5(group.id, data.external_key),
                user_id=user.id,
                collection_id=group.id,
                source=kind,
                **data.model_dump(),
            )
        )
    group.fingerprint = fingerprint
    await session.commit()
    return {"collectionId": str(group.id), "imported": len(events), "alreadyImported": False}


@router.post("/imports/ics")
async def ics_import(
    body: IcsInput, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    try:
        ZoneInfo(body.timezone)
    except Exception:
        raise ApiError(
            422, "invalid_timezone", "Use an IANA timezone for floating ICS times."
        ) from None
    events = await asyncio.to_thread(import_ics, body.contents, body.timezone)
    return envelope(
        request,
        await replace_collection(
            session,
            user,
            "ics",
            body.name,
            key(body.contents + body.timezone),
            events,
            body.replace,
        ),
    )


@router.post("/imports/timetable")
async def timetable_import(
    body: TimetableRequest, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    return envelope(
        request,
        await replace_collection(
            session,
            user,
            "timetable",
            body.name,
            key(body.model_dump_json(exclude={"replace"})),
            timetable_events(body),
            body.replace,
        ),
    )


@router.delete("/collections/{collection_id}")
async def remove_collection(
    collection_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    group = await session.scalar(
        select(CalendarCollection).where(
            CalendarCollection.id == collection_id, CalendarCollection.user_id == user.id
        )
    )
    if not group:
        raise ApiError(404, "calendar_collection_missing", "That import is unavailable.")
    await session.execute(
        delete(CalendarEvent).where(
            CalendarEvent.collection_id == group.id, CalendarEvent.user_id == user.id
        )
    )
    await session.delete(group)
    await session.commit()
    return envelope(request, {"removed": True})


@router.post("/oauth/{provider}/start")
async def start_consent(
    provider: Provider, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    provider_configuration(request.app.state.settings, provider)
    p = await session.get(Preference, user.id)
    if not p or paused(p):
        raise ApiError(
            409,
            "calendar_paused",
            "Resume observation and automations before connecting a calendar.",
        )
    await session.refresh(user, with_for_update=True)
    now = datetime.now(UTC)
    count = await session.scalar(
        select(func.count())
        .select_from(CalendarOAuthState)
        .where(CalendarOAuthState.user_id == user.id, CalendarOAuthState.expires_at > now)
    )
    if (count or 0) >= 5:
        raise ApiError(
            429, "calendar_consent_limit", "Wait before starting another calendar consent request."
        )
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
    adapter: CalendarProvider = request.app.state.calendar_provider
    url = await adapter.authorize_url(provider, state, verifier)
    session.add(
        CalendarOAuthState(
            state_hash=key(state),
            user_id=user.id,
            provider=provider,
            verifier_encrypted=cipher(request.app.state.settings)
            .encrypt(verifier.encode())
            .decode(),
            expires_at=now + timedelta(minutes=10),
        )
    )
    await session.commit()
    return envelope(request, {"authorizationUrl": url, "access": "read-only"})


@router.get("/oauth/{provider}/callback")
async def consent_callback(
    provider: Provider, request: Request, session: SessionDependency
) -> RedirectResponse:
    values = getattr(request.state, "calendar_oauth", {})
    now, settings = datetime.now(UTC), request.app.state.settings
    state = await session.scalar(
        select(CalendarOAuthState).where(
            CalendarOAuthState.state_hash == key(values.get("state", ""))
        )
    )
    if not state or state.provider != provider or state.used_at or utc(state.expires_at) <= now:
        raise ApiError(
            400,
            "invalid_calendar_state",
            "Calendar consent expired or was already used. Start again.",
        )
    owner = await session.scalar(select(User).where(User.id == state.user_id).with_for_update())
    if not owner or owner.status != "active":
        raise ApiError(401, "account_unavailable", "This account is unavailable.")
    await session.refresh(state, with_for_update=True)
    if state.used_at or utc(state.expires_at) <= now:
        raise ApiError(400, "invalid_calendar_state", "Start calendar consent again.")
    verifier = cipher(settings).decrypt(state.verifier_encrypted.encode()).decode()
    state.used_at, state.verifier_encrypted = now, ""
    await session.commit()
    status = "denied"
    if values.get("code") and not values.get("error"):
        adapter: CalendarProvider = request.app.state.calendar_provider
        try:
            result = await adapter.tokens(provider, code=values["code"], verifier=verifier)
            # Serialize with disconnect and never resurrect a state invalidated during consent.
            await session.refresh(owner, with_for_update=True)
            current_state = await session.get(
                CalendarOAuthState, state.state_hash, populate_existing=True
            )
            if not current_state:
                raise CalendarFailure("revoked")
            conn = await session.scalar(
                select(CalendarConnection)
                .where(
                    CalendarConnection.user_id == owner.id, CalendarConnection.provider == provider
                )
                .with_for_update()
            )
            vault = cipher(settings)
            if not result.get("refresh_token"):
                raise CalendarFailure("consent_required")
            if conn:
                conn.generation += 1
                await session.execute(
                    delete(CalendarEvent).where(CalendarEvent.connection_id == conn.id)
                )
            else:
                conn = CalendarConnection(
                    user_id=owner.id, provider=provider, generation=1, sync_version=1
                )
                session.add(conn)
            conn.status, conn.error_code = "connected", None
            conn.access_encrypted = vault.encrypt(result["access_token"].encode()).decode()
            conn.refresh_encrypted = vault.encrypt(result["refresh_token"].encode()).decode()
            conn.expires_at = now + timedelta(seconds=int(result["expires_in"]))
            conn.scopes = (
                ["calendar.events.readonly"] if provider == "google" else ["Calendars.Read"]
            )
            conn.cursor_encrypted, conn.last_synced_at, conn.last_full_sync_at = None, None, None
            conn.watch_id = conn.watch_resource = conn.watch_secret_hash = None
            conn.watch_expires_at = conn.lease_until = conn.lease_token = None
            conn.next_sync_at = now
            await session.commit()
            status = "connected"
        except Exception:
            await session.rollback()
            status = "failed"
    return RedirectResponse(
        f"{str(settings.calendar_web_url).rstrip('/')}/app/calendar?consent={status}",
        status_code=303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@router.post("/connections/{connection_id}/sync")
async def request_sync(
    connection_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    p = await session.get(Preference, user.id)
    if not p or paused(p):
        raise ApiError(409, "calendar_paused", "Calendar observation is paused.")
    conn = await session.scalar(
        select(CalendarConnection)
        .where(
            CalendarConnection.id == connection_id,
            CalendarConnection.user_id == user.id,
            CalendarConnection.status == "connected",
        )
        .with_for_update()
    )
    if not conn:
        raise ApiError(404, "calendar_connection_missing", "Reconnect this calendar first.")
    conn.next_sync_at, conn.sync_version = datetime.now(UTC), conn.sync_version + 1
    await session.commit()
    return envelope(request, {"queued": True, "synced": False})


@router.delete("/connections/{connection_id}")
async def disconnect(
    connection_id: uuid.UUID,
    request: Request,
    background: BackgroundTasks,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    conn = await session.scalar(
        select(CalendarConnection)
        .where(CalendarConnection.id == connection_id, CalendarConnection.user_id == user.id)
        .with_for_update()
    )
    if not conn:
        raise ApiError(404, "calendar_connection_missing", "That calendar is unavailable.")
    identifier, resource, old_access, provider = (
        conn.watch_id,
        conn.watch_resource,
        conn.access_encrypted,
        conn.provider,
    )
    conn.status, conn.generation = "revoked", conn.generation + 1
    conn.access_encrypted = conn.refresh_encrypted = conn.cursor_encrypted = None
    conn.watch_id = conn.watch_resource = conn.watch_secret_hash = None
    conn.watch_expires_at = conn.lease_until = conn.lease_token = None
    await session.execute(delete(CalendarEvent).where(CalendarEvent.connection_id == conn.id))
    await session.execute(
        delete(CalendarOAuthState).where(
            CalendarOAuthState.user_id == user.id, CalendarOAuthState.provider == conn.provider
        )
    )
    await session.commit()
    if identifier and old_access:

        async def cleanup() -> None:
            async def permitted() -> bool:
                return True  # Cleanup only, never a source read.

            try:
                adapter: CalendarProvider = request.app.state.calendar_provider
                access = cipher(request.app.state.settings).decrypt(old_access.encode()).decode()
                await adapter.stop_watch(provider, access, identifier, resource, permitted)
            except Exception:
                pass  # Callback secrets already removed; old subscriptions expire.

        background.add_task(cleanup)
    return envelope(
        request, {"disconnected": True, "copiesRemoved": True, "providerConsentRevoked": False}
    )


@router.post("/webhooks/google")
async def google_webhook(request: Request, session: SessionDependency) -> dict[str, bool]:
    channel = request.headers.get("x-goog-channel-id", "")
    token, resource = (
        request.headers.get("x-goog-channel-token", ""),
        request.headers.get("x-goog-resource-id", ""),
    )
    conn = await session.scalar(
        select(CalendarConnection)
        .where(
            CalendarConnection.provider == "google",
            CalendarConnection.watch_id == channel,
            CalendarConnection.status == "connected",
        )
        .with_for_update()
    )
    if (
        conn
        and conn.watch_secret_hash
        and compare_digest(conn.watch_secret_hash, key(token))
        and conn.watch_resource
        and compare_digest(conn.watch_resource.encode(), resource.encode())
    ):
        conn.next_sync_at, conn.sync_version = datetime.now(UTC), conn.sync_version + 1
        await session.commit()
    return {"accepted": True}


@router.post("/webhooks/microsoft")
async def microsoft_webhook(request: Request, session: SessionDependency) -> Any:
    validation = getattr(request.state, "calendar_validation", None)
    if validation:
        return PlainTextResponse(validation, headers={"Cache-Control": "no-store"})
    try:
        values = (await request.json())["value"]
        if not isinstance(values, list) or len(values) > 100:
            raise ValueError()
    except Exception:
        raise ApiError(
            400, "invalid_calendar_notification", "Invalid change notification."
        ) from None
    for value in values:
        if not isinstance(value, dict):
            continue
        conn = await session.scalar(
            select(CalendarConnection)
            .where(
                CalendarConnection.provider == "microsoft",
                CalendarConnection.watch_id == str(value.get("subscriptionId", "")),
                CalendarConnection.status == "connected",
            )
            .with_for_update()
        )
        state = value.get("clientState")
        if (
            conn
            and conn.watch_secret_hash
            and isinstance(state, str)
            and compare_digest(conn.watch_secret_hash, key(state))
        ):
            conn.next_sync_at, conn.sync_version = datetime.now(UTC), conn.sync_version + 1
    await session.commit()
    return {"accepted": True}
