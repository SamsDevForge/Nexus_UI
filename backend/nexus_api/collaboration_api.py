"""Selected-source ingestion, explicit note previews and provider-bound consent."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal, cast

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .api import SessionDependency, UserDependency
from .audit import record_audit
from .calendar_provider import CalendarFailure
from .calendar_rules import instant, key
from .collaboration_provider import Provider, SourceInput, configuration, seal, unseal, vault
from .collaboration_service import CollaborationService, purge_source
from .errors import ApiError
from .models import CollaborationConnection as Connection
from .models import CollaborationDocument as Document
from .models import CollaborationDraft as Draft
from .models import CollaborationOAuthState as OAuthState
from .models import CollaborationSource as Source
from .models import CollaborationWebhookReceipt as Receipt
from .models import Preference, User
from .notification_rules import paused, utc


async def enabled(request: Request) -> None:
    if not request.app.state.settings.collaboration_enabled:
        raise ApiError(
            503, "collaboration_disabled", "Collaboration is not enabled on this server."
        )
    vault(request.app.state.settings)


router = APIRouter(
    prefix="/api/v1/collaboration", tags=["Selected collaboration"], dependencies=[Depends(enabled)]
)


def envelope(request: Request, data: Any) -> dict[str, Any]:
    return {"data": data, "requestId": request.state.request_id}


def service(request: Request) -> CollaborationService:
    return cast(CollaborationService, request.app.state.collaboration)


class Writable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    writable: bool


class DraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_id: uuid.UUID
    destination_id: uuid.UUID
    template: Literal["class", "meeting"]
    operation: Literal["create", "append"] = "create"


class DraftEdit(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    revision: int = Field(ge=1, strict=True)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=7000)
    operation: Literal["create", "append", "update"]


class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1, strict=True)
    approved: StrictBool

    @field_validator("approved")
    @classmethod
    def explicit_approval(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("Explicit approval is required.")
        return value


def draft_result(request: Request, draft: Draft, *, content: bool = False) -> dict[str, Any]:
    payload = unseal(request.app.state.settings, draft.payload_encrypted)
    result = (
        unseal(request.app.state.settings, draft.result_encrypted)
        if draft.result_encrypted
        else None
    )
    return {
        "id": str(draft.id),
        "documentId": str(draft.document_id),
        "destinationId": str(draft.destination_id),
        "title": payload["title"],
        "operation": payload["operation"],
        "revision": draft.revision,
        "status": draft.status,
        "expiresAt": utc(draft.expires_at).isoformat(),
        "error": draft.error_code,
        "resultUrl": result.get("url") if result else None,
        "canUpdate": bool(result and result.get("blockId")),
        **({"body": payload["body"], "sourceUrl": payload["sourceUrl"]} if content else {}),
    }


@router.get("")
async def state(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    now = datetime.now(UTC)
    settings = request.app.state.settings
    connections = (
        await session.scalars(select(Connection).where(Connection.user_id == user.id))
    ).all()
    sources = (
        await session.scalars(
            select(Source)
            .join(Connection, Connection.id == Source.connection_id)
            .where(Source.user_id == user.id, Connection.status == "connected")
        )
    ).all()
    active = {s.id for s in sources}
    docs = (
        await session.scalars(
            select(Document)
            .where(
                Document.user_id == user.id,
                Document.source_id.in_(active),
                Document.expires_at > now,
            )
            .limit(201)
        )
    ).all()
    drafts = (
        await session.scalars(
            select(Draft)
            .where(Draft.user_id == user.id, Draft.expires_at > now)
            .order_by(Draft.created_at.desc())
            .limit(20)
        )
    ).all()
    providers = {}
    for provider in ("notion", "teams"):
        try:
            configuration(settings, provider)
            providers[provider] = True
        except ApiError:
            providers[provider] = False
    p = await session.get(Preference, user.id)
    return envelope(
        request,
        {
            "providers": providers,
            "paused": not p or paused(p),
            "serverTime": now.isoformat(),
            "limited": len(docs) > 200,
            "connections": [
                {
                    "id": str(c.id),
                    "provider": c.provider,
                    "status": c.status,
                    "error": c.error_code,
                    "lastSyncedAt": utc(c.last_synced_at).isoformat() if c.last_synced_at else None,
                }
                for c in connections
            ],
            "sources": [
                {
                    "id": str(s.id),
                    "connectionId": str(s.connection_id),
                    "writable": s.writable,
                    "limited": s.limited,
                    "error": s.error_code,
                    "lastSyncedAt": utc(s.last_synced_at).isoformat() if s.last_synced_at else None,
                    **{
                        k: v
                        for k, v in unseal(settings, s.locator_encrypted).items()
                        if k in {"label", "kind"}
                    },
                }
                for s in sources
            ],
            "documents": [
                {
                    "id": str(d.id),
                    "sourceId": str(d.source_id),
                    "expiresAt": utc(d.expires_at).isoformat(),
                    **{
                        k: v
                        for k, v in unseal(settings, d.payload_encrypted).items()
                        if k in {"title", "sourceUrl", "kind", "limited"}
                    },
                }
                for d in docs[:200]
            ],
            "drafts": [draft_result(request, d) for d in drafts],
        },
    )


async def owned_connection(session: AsyncSession, user: User, identifier: uuid.UUID) -> Connection:
    conn = await session.scalar(
        select(Connection).where(
            Connection.id == identifier,
            Connection.user_id == user.id,
            Connection.status == "connected",
        )
    )
    if not conn:
        raise ApiError(404, "connection_missing", "Reconnect this source first.")
    return conn


@router.get("/connections/{identifier}/discover")
async def discover(
    identifier: uuid.UUID,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
    query: str = Query(default="", max_length=80),
    team: uuid.UUID | None = None,
) -> dict[str, Any]:
    conn = await owned_connection(session, user, identifier)
    runtime = service(request)

    async def guard() -> bool:
        return await runtime.allowed(conn.id, conn.generation)

    access = await runtime.access(conn.id, conn.generation)
    return envelope(
        request,
        await runtime.provider.discover(
            conn.provider, access, guard, query, str(team) if team else None
        ),
    )


@router.post("/connections/{identifier}/sources")
async def select_source(
    identifier: uuid.UUID,
    body: SourceInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    conn = await owned_connection(session, user, identifier)
    runtime = service(request)
    if (conn.provider == "teams") != (body.kind == "channel"):
        raise ApiError(422, "source_kind_invalid", "Choose a source matching this connection.")
    generation = conn.generation

    async def guard() -> bool:
        return await runtime.allowed(conn.id, generation)

    access = await runtime.access(conn.id, conn.generation)
    locator = await runtime.provider.describe(
        conn.provider, body.model_dump(exclude={"writable"}), access, guard
    )
    await session.refresh(conn, with_for_update=True)
    if conn.status != "connected" or conn.generation != generation or not await guard():
        raise ApiError(409, "connection_changed", "The connection changed. Start again.")
    digest = key(f"{body.kind}:{body.team_id}:{body.resource_id}")
    existing = await session.scalar(
        select(Source).where(Source.connection_id == conn.id, Source.external_key == digest)
    )
    if existing:
        return envelope(request, {"id": str(existing.id), "alreadySelected": True})
    count = await session.scalar(
        select(func.count()).select_from(Source).where(Source.connection_id == conn.id)
    )
    if (count or 0) >= 8:
        raise ApiError(409, "source_limit", "Select at most eight sources per provider.")
    source = Source(
        user_id=user.id,
        connection_id=conn.id,
        external_key=digest,
        locator_encrypted=seal(request.app.state.settings, locator),
        writable=body.writable,
    )
    session.add(source)
    conn.next_sync_at, conn.sync_version = datetime.now(UTC), conn.sync_version + 1
    await session.flush()
    await session.commit()
    return envelope(request, {"id": str(source.id), "alreadySelected": False})


@router.patch("/sources/{identifier}")
async def change_write_permission(
    identifier: uuid.UUID,
    body: Writable,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    source = await session.scalar(
        select(Source).where(Source.id == identifier, Source.user_id == user.id).with_for_update()
    )
    if not source:
        raise ApiError(404, "source_missing", "That source is unavailable.")
    conn = await owned_connection(session, user, source.connection_id)
    if body.writable and conn.provider != "notion":
        raise ApiError(422, "write_not_supported", "Teams access is read-only.")
    source.writable, source.generation = body.writable, source.generation + 1
    await session.execute(delete(Draft).where(Draft.destination_id == identifier))
    await session.commit()
    return envelope(request, {"updated": True})


@router.delete("/sources/{identifier}")
async def remove_source(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    source = await session.scalar(
        select(Source).where(Source.id == identifier, Source.user_id == user.id).with_for_update()
    )
    if not source:
        raise ApiError(404, "source_missing", "That source is unavailable.")
    await purge_source(session, identifier)
    await session.delete(source)
    await session.commit()
    return envelope(request, {"removed": True, "derivedCopiesRemoved": True})


@router.get("/documents/{identifier}")
async def read_document(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    doc = await service(request).fresh_document(identifier, user.id)
    return envelope(
        request,
        {
            "id": str(doc.id),
            "sourceId": str(doc.source_id),
            "expiresAt": utc(doc.expires_at).isoformat(),
            **{
                k: v
                for k, v in unseal(request.app.state.settings, doc.payload_encrypted).items()
                if k != "providerId"
            },
        },
    )


@router.post("/drafts")
async def prepare_draft(
    body: DraftInput, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    doc = await service(request).fresh_document(body.document_id, user.id)
    destination = await session.scalar(
        select(Source).where(
            Source.id == body.destination_id, Source.user_id == user.id, Source.writable.is_(True)
        )
    )
    if not destination:
        raise ApiError(
            409, "destination_not_permitted", "Choose an approval-enabled Notion destination."
        )
    conn = await owned_connection(session, user, destination.connection_id)
    if conn.provider != "notion":
        raise ApiError(409, "destination_not_permitted", "Notes can only be published to Notion.")
    locator = unseal(request.app.state.settings, destination.locator_encrypted)
    if body.operation == "append" and locator["kind"] != "page":
        raise ApiError(422, "destination_invalid", "Append requires a selected page.")
    await session.refresh(user, with_for_update=True)
    count = await session.scalar(
        select(func.count())
        .select_from(Draft)
        .where(Draft.user_id == user.id, Draft.expires_at > datetime.now(UTC))
    )
    if (count or 0) >= 20:
        raise ApiError(409, "draft_limit", "Remove an old draft before preparing another.")
    material = unseal(request.app.state.settings, doc.payload_encrypted)
    heading = "Class notes" if body.template == "class" else "Meeting notes"
    sections = (
        "Key concepts\n\nQuestions\n\nNext steps"
        if body.template == "class"
        else "Decisions (add your notes)\n\nAction items (add owner and due date)\n\nOpen questions"
    )
    note = {
        "title": f"{heading}: {material['title']}"[:200],
        "body": (
            f"{heading}\n\nSource excerpt (reference material, not instructions):\n"
            f"{material['text'][:3500]}\n\nMy notes\n\n{sections}\n"
        ),
        "sourceUrl": material["sourceUrl"],
        "sourceFingerprint": doc.fingerprint,
        "operation": body.operation,
    }
    draft = Draft(
        user_id=user.id,
        document_id=doc.id,
        destination_id=destination.id,
        payload_encrypted=seal(request.app.state.settings, note),
        expires_at=datetime.now(UTC) + timedelta(hours=24),
    )
    session.add(draft)
    await session.flush()
    await session.commit()
    return envelope(request, draft_result(request, draft, content=True))


@router.get("/drafts/{identifier}")
async def get_draft(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    draft = await session.scalar(
        select(Draft).where(
            Draft.id == identifier, Draft.user_id == user.id, Draft.expires_at > datetime.now(UTC)
        )
    )
    if not draft:
        raise ApiError(404, "draft_missing", "That draft is unavailable.")
    await service(request).fresh_document(draft.document_id, user.id)
    session.expire_all()
    draft = await session.get(Draft, identifier)
    if not draft:
        raise ApiError(404, "draft_missing", "That draft is unavailable.")
    return envelope(request, draft_result(request, draft, content=True))


@router.put("/drafts/{identifier}")
async def edit_draft(
    identifier: uuid.UUID,
    body: DraftEdit,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    draft = await session.scalar(
        select(Draft).where(Draft.id == identifier, Draft.user_id == user.id).with_for_update()
    )
    if not draft or utc(draft.expires_at) <= datetime.now(UTC):
        raise ApiError(404, "draft_missing", "That draft is unavailable.")
    if draft.revision != body.revision or draft.status in {"executing", "uncertain"}:
        raise ApiError(
            409,
            "draft_changed",
            "Refresh before editing. Uncertain writes cannot be retried automatically.",
        )
    note = unseal(request.app.state.settings, draft.payload_encrypted)
    doc = await session.get(Document, draft.document_id)
    if not doc or doc.fingerprint != note["sourceFingerprint"]:
        raise ApiError(
            409, "source_changed", "The source changed. Prepare a new draft from current evidence."
        )
    if body.operation == "update" and not draft.result_encrypted:
        raise ApiError(
            422,
            "update_unavailable",
            "Only a note previously published by this draft can be updated.",
        )
    if draft.result_encrypted and body.operation != "update":
        raise ApiError(
            409,
            "update_required",
            "Edit the published note using Update, or prepare a new draft for another write.",
        )
    note.update(title=body.title, body=body.body, operation=body.operation)
    draft.payload_encrypted = seal(request.app.state.settings, note)
    draft.revision += 1
    draft.status, draft.error_code = "prepared", None
    await session.commit()
    return envelope(request, draft_result(request, draft, content=True))


@router.post("/drafts/{identifier}/execute")
async def approve(
    identifier: uuid.UUID,
    body: Approval,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    result = await service(request).execute(
        identifier, user.id, body.revision, request.state.request_id
    )
    await record_audit(
        session,
        user_id=user.id,
        event_type="collaboration.note.executed",
        request_id=request.state.request_id,
        target_type="collaboration-draft",
        target_id=str(identifier),
        result="success",
        changed_fields=["approved_revision"],
    )
    await session.commit()
    return envelope(request, result)


@router.delete("/drafts/{identifier}")
async def delete_draft(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    draft = await session.scalar(
        select(Draft).where(Draft.id == identifier, Draft.user_id == user.id).with_for_update()
    )
    if not draft:
        raise ApiError(404, "draft_missing", "That draft is unavailable.")
    if draft.status == "executing":
        raise ApiError(
            409, "write_in_progress", "Wait for the write result before removing its local record."
        )
    await session.delete(draft)
    await session.commit()
    return envelope(request, {"removed": True, "remoteNoteDeleted": False})


@router.post("/oauth/{provider}/start")
async def start_consent(
    provider: Provider, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    settings = request.app.state.settings
    configuration(settings, provider)
    p = await session.get(Preference, user.id)
    if not p or paused(p):
        raise ApiError(
            409,
            "collaboration_paused",
            "Resume observation and automations before connecting a source.",
        )
    await session.refresh(user, with_for_update=True)
    now = datetime.now(UTC)
    count = await session.scalar(
        select(func.count())
        .select_from(OAuthState)
        .where(OAuthState.user_id == user.id, OAuthState.expires_at > now)
    )
    if (count or 0) >= 5:
        raise ApiError(429, "consent_limit", "Wait before starting another consent request.")
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
    url = await service(request).provider.authorize_url(provider, state, verifier)
    session.add(
        OAuthState(
            state_hash=key(state),
            user_id=user.id,
            provider=provider,
            verifier_encrypted=seal(settings, verifier),
            expires_at=now + timedelta(minutes=10),
        )
    )
    await session.commit()
    return envelope(request, {"authorizationUrl": url})


@router.get("/oauth/{provider}/callback")
async def callback(
    provider: Provider, request: Request, session: SessionDependency
) -> RedirectResponse:
    values = getattr(request.state, "collaboration_oauth", {})
    now = datetime.now(UTC)
    settings = request.app.state.settings
    configuration(settings, provider)
    pending = await session.get(OAuthState, key(values.get("state", "")))
    if not pending:
        raise ApiError(400, "invalid_consent", "Consent expired or was already used. Start again.")
    owner = await session.scalar(select(User).where(User.id == pending.user_id).with_for_update())
    await session.refresh(pending, with_for_update=True)
    if (
        not owner
        or owner.status != "active"
        or pending.used_at
        or pending.provider != provider
        or utc(pending.expires_at) <= now
    ):
        raise ApiError(400, "invalid_consent", "Consent expired or was already used. Start again.")
    pending.used_at = now
    verifier = unseal(settings, pending.verifier_encrypted)
    owner_id, state_hash = pending.user_id, pending.state_hash
    await session.commit()
    destination = f"{str(settings.collaboration_web_url).rstrip('/')}/app/collaboration"
    if values.get("error") or not values.get("code"):
        return RedirectResponse(destination + "?consent=denied", status_code=303)
    try:
        tokens = await service(request).provider.tokens(
            provider, code=values["code"], verifier=verifier
        )
    except CalendarFailure:
        return RedirectResponse(destination + "?consent=failed", status_code=303)
    # Recheck after token exchange so a concurrent disconnect cannot be undone.
    session.expire_all()
    owner = await session.scalar(select(User).where(User.id == owner_id).with_for_update())
    still_pending = await session.get(OAuthState, state_hash)
    p = await session.get(Preference, owner_id)
    if (
        not owner
        or owner.status != "active"
        or not still_pending
        or utc(still_pending.expires_at) <= datetime.now(UTC)
        or not p
        or paused(p)
    ):
        return RedirectResponse(destination + "?consent=failed", status_code=303)
    conn = await session.scalar(
        select(Connection)
        .where(Connection.user_id == owner_id, Connection.provider == provider)
        .with_for_update()
    )
    if conn:
        for source_id in (
            await session.scalars(select(Source.id).where(Source.connection_id == conn.id))
        ).all():
            await purge_source(session, source_id)
        await session.execute(delete(Source).where(Source.connection_id == conn.id))
        conn.generation += 1
    else:
        conn = Connection(user_id=owner_id, provider=provider)
        session.add(conn)
    conn.credentials_encrypted = seal(settings, tokens)
    conn.workspace_id = tokens.get("workspaceId")
    conn.status, conn.error_code, conn.lease_token, conn.lease_until = "connected", None, None, None
    conn.next_sync_at = now
    await session.delete(still_pending)
    await record_audit(
        session,
        user_id=owner_id,
        event_type="collaboration.connected",
        request_id=request.state.request_id,
        target_type="collaboration-provider",
        target_id=provider,
        result="success",
        changed_fields=["consent"],
    )
    await session.commit()
    return RedirectResponse(destination + "?consent=connected", status_code=303)


@router.post("/connections/{identifier}/sync")
async def queue_sync(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    conn = await owned_connection(session, user, identifier)
    if not await service(request).allowed(conn.id, conn.generation):
        raise ApiError(
            409, "collaboration_paused", "Resume observation and automations before syncing."
        )
    await session.refresh(conn, with_for_update=True)
    if conn.status != "connected":
        raise ApiError(409, "connection_changed", "Reconnect this source first.")
    conn.next_sync_at = datetime.now(UTC)
    conn.sync_version += 1
    await session.commit()
    return envelope(request, {"queued": True})


@router.delete("/connections/{identifier}")
async def disconnect(
    identifier: uuid.UUID, request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    await session.refresh(user, with_for_update=True)
    conn = await session.scalar(
        select(Connection)
        .where(Connection.id == identifier, Connection.user_id == user.id)
        .with_for_update()
    )
    if not conn:
        raise ApiError(404, "connection_missing", "That connection is unavailable.")
    for source_id in (
        await session.scalars(select(Source.id).where(Source.connection_id == identifier))
    ).all():
        await purge_source(session, source_id)
    await session.execute(delete(Source).where(Source.connection_id == identifier))
    await session.execute(
        delete(OAuthState).where(
            OAuthState.user_id == user.id, OAuthState.provider == conn.provider
        )
    )
    conn.credentials_encrypted, conn.status, conn.generation = (
        None,
        "disconnected",
        conn.generation + 1,
    )
    conn.lease_token, conn.lease_until = None, None
    await session.commit()
    return envelope(request, {"removed": True, "providerAccessRevoked": False})


@router.get("/webhooks/notion/challenges")
async def challenges(request: Request, session: SessionDependency) -> dict[str, Any]:
    configured = request.app.state.settings.collaboration_webhook_admin_key
    supplied = request.headers.get("X-Webhook-Admin-Key", "")
    if not configured or not hmac.compare_digest(configured.get_secret_value(), supplied):
        raise ApiError(403, "operator_required", "Operator authorization is required.")
    rows = (
        await session.scalars(
            select(Receipt).where(
                Receipt.kind == "challenge", Receipt.expires_at > datetime.now(UTC)
            )
        )
    ).all()
    return envelope(
        request,
        {
            "candidates": [
                unseal(request.app.state.settings, r.secret_encrypted)
                for r in rows
                if r.secret_encrypted
            ]
        },
    )


@router.post("/webhooks/notion")
async def webhook(request: Request, session: SessionDependency) -> dict[str, bool]:
    settings = request.app.state.settings
    raw = await request.body()
    import json

    try:
        value = json.loads(raw)
    except (ValueError, UnicodeError):
        raise ApiError(400, "invalid_webhook", "Invalid webhook.") from None
    if not isinstance(value, dict):
        raise ApiError(400, "invalid_webhook", "Invalid webhook.")
    configured = settings.notion_webhook_verification_token
    token = configured.get_secret_value() if configured else ""
    challenge = value.get("verification_token")
    now = datetime.now(UTC)
    if isinstance(challenge, str) and 16 <= len(challenge) <= 256:
        if token:
            if not hmac.compare_digest(challenge, token):
                raise ApiError(403, "invalid_webhook", "Invalid webhook.")
        else:
            if not settings.collaboration_webhook_admin_key:
                raise ApiError(503, "webhook_unconfigured", "Configure webhook verification first.")
            # Store a bounded candidate for the operator; never trust a public bootstrap as a key.
            count = await session.scalar(
                select(func.count())
                .select_from(Receipt)
                .where(Receipt.kind == "challenge", Receipt.expires_at > now)
            )
            if (count or 0) >= 5:
                raise ApiError(
                    429, "challenge_limit", "Review existing verification candidates first."
                )
            digest = key("challenge:" + challenge)
            if not await session.get(Receipt, digest):
                session.add(
                    Receipt(
                        event_key=digest,
                        kind="challenge",
                        secret_encrypted=seal(settings, challenge),
                        expires_at=now + timedelta(minutes=10),
                    )
                )
                try:
                    await session.commit()
                except IntegrityError:
                    await session.rollback()
        return {"received": True}
    signature = request.headers.get("X-Notion-Signature", "")
    expected = "sha256=" + hmac.new(token.encode(), raw, hashlib.sha256).hexdigest()
    if not token or not hmac.compare_digest(expected, signature):
        raise ApiError(403, "invalid_webhook", "Invalid webhook.")
    try:
        identifier = str(uuid.UUID(value["id"]))
        workspace = str(uuid.UUID(value["workspace_id"]))
        timestamp = instant(value["timestamp"])
        if timestamp < now - timedelta(hours=24) or timestamp > now + timedelta(minutes=5):
            raise ValueError("Expired")
    except (KeyError, ValueError, TypeError):
        raise ApiError(400, "invalid_webhook", "Invalid webhook.") from None
    digest = key(identifier)
    if await session.get(Receipt, digest):
        return {"received": True}
    try:
        async with session.begin_nested():
            session.add(Receipt(event_key=digest, kind="event", expires_at=now + timedelta(days=2)))
            await session.flush()
    except IntegrityError:
        return {"received": True}
    connections = (
        await session.scalars(
            select(Connection)
            .where(
                Connection.provider == "notion",
                Connection.workspace_id == workspace,
                Connection.status == "connected",
            )
            .with_for_update()
        )
    ).all()
    for conn in connections:
        conn.next_sync_at = now
        conn.sync_version += 1
        if value.get("type") in {"page.deleted", "data_source.deleted", "database.deleted"}:
            entity = value.get("entity", {}).get("id", "")
            try:
                entity = str(uuid.UUID(entity))
            except (ValueError, TypeError):
                continue
            sources = (
                await session.scalars(select(Source).where(Source.connection_id == conn.id))
            ).all()
            for source in sources:
                if unseal(settings, source.locator_encrypted).get("resource_id") == entity:
                    await purge_source(session, source.id)
                    source.error_code = "source_unavailable"
                    source.generation += 1
                else:
                    ids = select(Document.id).where(
                        Document.source_id == source.id, Document.external_key == key(entity)
                    )
                    await session.execute(delete(Draft).where(Draft.document_id.in_(ids)))
                    await session.execute(delete(Document).where(Document.id.in_(ids)))
    await session.commit()
    return {"received": True}
