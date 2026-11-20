"""Owned encrypted email evidence and separate read-only consent."""

from __future__ import annotations

import json
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, func, select

from .api import SessionDependency, UserDependency
from .audit import record_audit
from .calendar_provider import CalendarFailure
from .calendar_rules import Provider, key
from .errors import ApiError
from .mail_provider import MailProvider, configuration, mail_cipher
from .mail_rules import MailCorrection
from .models import MailConnection, MailMessage, MailOAuthState, Preference, User
from .notification_rules import paused, utc


async def enabled(request: Request) -> None:
    if not request.app.state.settings.mail_enabled:
        raise ApiError(503, "mail_disabled", "Mail review is not enabled on this server.")
    mail_cipher(request.app.state.settings)


router = APIRouter(prefix="/api/v1/mail", tags=["Mail review"], dependencies=[Depends(enabled)])


def envelope(request: Request, data: Any) -> dict[str, Any]:
    return {"data": data, "requestId": request.state.request_id}


def payload(message: MailMessage, vault: Any) -> dict[str, Any]:
    original = json.loads(vault.decrypt(message.payload_encrypted.encode()))
    correction = (
        json.loads(vault.decrypt(message.correction_encrypted.encode()))
        if message.correction_encrypted
        else None
    )
    return {
        "id": str(message.id),
        "connectionId": str(message.connection_id),
        "receivedAt": utc(message.received_at).isoformat(),
        "expiresAt": utc(message.expires_at).isoformat(),
        "revision": message.revision,
        "original": original,
        "correction": correction,
        "sourceChanged": bool(correction and correction.get("basis") != original["fingerprint"]),
    }


@router.get("")
async def review(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    now = datetime.now(UTC)
    messages = (
        await session.scalars(
            select(MailMessage)
            .join(MailConnection, MailConnection.id == MailMessage.connection_id)
            .where(
                MailMessage.user_id == user.id,
                MailConnection.status == "connected",
                MailMessage.expires_at > now,
            )
            .order_by(MailMessage.received_at.desc())
            .limit(100)
        )
    ).all()
    connections = (
        await session.scalars(select(MailConnection).where(MailConnection.user_id == user.id))
    ).all()
    providers = {}
    for provider in ("google", "microsoft"):
        try:
            configuration(request.app.state.settings, provider)
            providers[provider] = True
        except ApiError:
            providers[provider] = False
    p = await session.get(Preference, user.id)
    return envelope(
        request,
        {
            "items": [payload(m, mail_cipher(request.app.state.settings)) for m in messages],
            "providers": providers,
            "paused": not p or paused(p),
            "serverTime": now.isoformat(),
            "connections": [
                {
                    "id": str(c.id),
                    "provider": c.provider,
                    "status": c.status,
                    "scopes": c.scopes,
                    "error": c.error_code,
                    "truncated": c.truncated,
                    "lastSyncedAt": utc(c.last_synced_at).isoformat() if c.last_synced_at else None,
                    "freshUntil": (utc(c.last_synced_at) + timedelta(minutes=5)).isoformat()
                    if c.last_synced_at
                    else None,
                }
                for c in connections
            ],
        },
    )


@router.put("/messages/{message_id}/correction")
async def correct(
    message_id: uuid.UUID,
    body: MailCorrection,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    # Serialize with disconnect/sync; correction cannot recreate a removed source.
    conn = await session.scalar(
        select(MailConnection)
        .join(MailMessage, MailMessage.connection_id == MailConnection.id)
        .where(
            MailMessage.id == message_id,
            MailConnection.user_id == user.id,
            MailConnection.status == "connected",
        )
        .with_for_update(of=MailConnection)
    )
    if not conn:
        raise ApiError(404, "mail_message_missing", "That message is unavailable.")
    message = await session.scalar(
        select(MailMessage)
        .where(
            MailMessage.id == message_id,
            MailMessage.user_id == user.id,
            MailMessage.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    if not message:
        raise ApiError(404, "mail_message_missing", "That message is unavailable.")
    if message.revision != body.revision:
        raise ApiError(
            409,
            "mail_review_changed",
            "This message changed. Refresh and review the latest evidence.",
        )
    vault = mail_cipher(request.app.state.settings)
    original = json.loads(vault.decrypt(message.payload_encrypted.encode()))
    allowed = {i["id"] for i in original["items"]}
    if len({i.id for i in body.items}) != len(body.items) or any(
        i.id not in allowed for i in body.items
    ):
        raise ApiError(
            422, "mail_item_unknown", "Only extracted items from this message can be corrected."
        )
    value = {
        "important": body.important,
        "items": [i.model_dump() for i in body.items],
        "basis": original["fingerprint"],
        "reviewedAt": datetime.now(UTC).isoformat(),
    }
    message.correction_encrypted = vault.encrypt(json.dumps(value).encode()).decode()
    message.revision += 1
    await record_audit(
        session,
        user_id=user.id,
        event_type="mail.review.saved",
        request_id=request.state.request_id,
        target_type="mail-message",
        target_id=str(message.id),
        result="success",
        changed_fields=["correction"],
    )
    await session.commit()
    return envelope(request, payload(message, vault))


@router.post("/oauth/{provider}/start")
async def start_consent(
    provider: Provider, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    configuration(request.app.state.settings, provider)
    p = await session.get(Preference, user.id)
    if not p or paused(p):
        raise ApiError(
            409,
            "mail_paused",
            "Resume observation and automations before connecting a mailbox.",
        )
    await session.refresh(user, with_for_update=True)
    now = datetime.now(UTC)
    count = await session.scalar(
        select(func.count())
        .select_from(MailOAuthState)
        .where(MailOAuthState.user_id == user.id, MailOAuthState.expires_at > now)
    )
    if (count or 0) >= 5:
        raise ApiError(
            429, "mail_consent_limit", "Wait before starting another mail consent request."
        )
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
    adapter: MailProvider = request.app.state.mail_provider
    url = await adapter.authorize_url(provider, state, verifier)
    session.add(
        MailOAuthState(
            state_hash=key(state),
            user_id=user.id,
            provider=provider,
            verifier_encrypted=mail_cipher(request.app.state.settings)
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
    values = getattr(request.state, "mail_oauth", {})
    now, settings = datetime.now(UTC), request.app.state.settings
    state = await session.scalar(
        select(MailOAuthState).where(MailOAuthState.state_hash == key(values.get("state", "")))
    )
    if not state or state.provider != provider or state.used_at or utc(state.expires_at) <= now:
        raise ApiError(
            400,
            "invalid_mail_state",
            "Mail consent expired or was already used. Start again.",
        )
    owner = await session.scalar(select(User).where(User.id == state.user_id).with_for_update())
    if not owner or owner.status != "active":
        raise ApiError(401, "account_unavailable", "This account is unavailable.")
    await session.refresh(state, with_for_update=True)
    if state.used_at or utc(state.expires_at) <= now:
        raise ApiError(400, "invalid_mail_state", "Start mail consent again.")
    verifier = mail_cipher(settings).decrypt(state.verifier_encrypted.encode()).decode()
    state.used_at, state.verifier_encrypted = now, ""
    await session.commit()
    status = "denied"
    if values.get("code") and not values.get("error"):
        adapter: MailProvider = request.app.state.mail_provider
        try:
            result = await adapter.tokens(provider, code=values["code"], verifier=verifier)
            # Serialize with disconnect and never resurrect a state invalidated during consent.
            await session.refresh(owner, with_for_update=True)
            current_state = await session.get(
                MailOAuthState, state.state_hash, populate_existing=True
            )
            preferences = await session.get(Preference, owner.id)
            if (
                not current_state
                or owner.status != "active"
                or not preferences
                or paused(preferences)
            ):
                raise CalendarFailure("revoked")
            conn = await session.scalar(
                select(MailConnection)
                .where(MailConnection.user_id == owner.id, MailConnection.provider == provider)
                .with_for_update()
            )
            vault = mail_cipher(settings)
            if not result.get("refresh_token"):
                raise CalendarFailure("consent_required")
            if conn:
                conn.generation += 1
                await session.execute(
                    delete(MailMessage).where(MailMessage.connection_id == conn.id)
                )
            else:
                conn = MailConnection(
                    user_id=owner.id, provider=provider, generation=1, sync_version=1
                )
                session.add(conn)
            conn.status, conn.error_code = "connected", None
            conn.access_encrypted = vault.encrypt(result["access_token"].encode()).decode()
            conn.refresh_encrypted = vault.encrypt(result["refresh_token"].encode()).decode()
            conn.expires_at = now + timedelta(seconds=int(result["expires_in"]))
            conn.scopes = ["gmail.readonly"] if provider == "google" else ["Mail.Read"]
            conn.last_synced_at = conn.lease_until = conn.lease_token = None
            conn.truncated = False
            conn.next_sync_at = now
            await session.commit()
            status = "connected"
        except Exception:
            await session.rollback()
            status = "failed"
    return RedirectResponse(
        f"{str(settings.mail_web_url).rstrip('/')}/app/mail?consent={status}",
        status_code=303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@router.post("/connections/{connection_id}/sync")
async def request_sync(
    connection_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    p = await session.get(Preference, user.id)
    if not p or paused(p):
        raise ApiError(409, "mail_paused", "Mail observation is paused.")
    conn = await session.scalar(
        select(MailConnection)
        .where(
            MailConnection.id == connection_id,
            MailConnection.user_id == user.id,
            MailConnection.status == "connected",
        )
        .with_for_update()
    )
    if not conn:
        raise ApiError(404, "mail_connection_missing", "Reconnect this mail source first.")
    conn.next_sync_at, conn.sync_version = datetime.now(UTC), conn.sync_version + 1
    await session.commit()
    return envelope(request, {"queued": True, "synced": False})


@router.delete("/connections/{connection_id}")
async def disconnect(
    connection_id: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    conn = await session.scalar(
        select(MailConnection)
        .where(MailConnection.id == connection_id, MailConnection.user_id == user.id)
        .with_for_update()
    )
    if not conn:
        raise ApiError(404, "mail_connection_missing", "That mail source is unavailable.")
    conn.status, conn.generation = "revoked", conn.generation + 1
    conn.access_encrypted = conn.refresh_encrypted = None
    conn.lease_token = conn.lease_until = None
    await session.execute(delete(MailMessage).where(MailMessage.connection_id == conn.id))
    await session.execute(
        delete(MailOAuthState).where(
            MailOAuthState.user_id == user.id, MailOAuthState.provider == conn.provider
        )
    )
    await record_audit(
        session,
        user_id=user.id,
        event_type="mail.connection.revoked",
        request_id=request.state.request_id,
        target_type="mail-connection",
        target_id=str(conn.id),
        result="success",
        changed_fields=["credentials", "copies"],
    )
    await session.commit()
    return envelope(
        request, {"disconnected": True, "copiesRemoved": True, "providerConsentRevoked": False}
    )
