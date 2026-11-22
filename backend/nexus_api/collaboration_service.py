"""Permission-aware encrypted snapshots and single-attempt approved note actions."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .audit import record_audit
from .calendar_provider import CalendarFailure
from .collaboration_provider import CollaborationProvider, fingerprint, seal, unseal
from .config import Settings
from .db import Database
from .errors import ApiError
from .models import CollaborationConnection as Connection
from .models import CollaborationDocument as Document
from .models import CollaborationDraft as Draft
from .models import CollaborationOAuthState as OAuthState
from .models import CollaborationSource as Source
from .models import CollaborationWebhookReceipt as Receipt
from .models import Preference, User
from .notification_rules import paused, utc


async def purge_source(session: AsyncSession, identifier: uuid.UUID) -> None:
    ids = select(Document.id).where(Document.source_id == identifier)
    await session.execute(
        delete(Draft).where(or_(Draft.document_id.in_(ids), Draft.destination_id == identifier))
    )
    await session.execute(delete(Document).where(Document.source_id == identifier))


class CollaborationService:
    def __init__(self, database: Database, settings: Settings, provider: CollaborationProvider):
        self.database, self.settings, self.provider = database, settings, provider

    def factory(self) -> async_sessionmaker[AsyncSession]:
        if self.database.session_factory is None:
            raise ApiError(503, "database_unavailable", "The database is not configured.")
        return self.database.session_factory

    async def allowed(
        self,
        connection_id: uuid.UUID,
        generation: int,
        source_id: uuid.UUID | None = None,
        source_generation: int | None = None,
    ) -> bool:
        async with self.factory()() as session:
            conn = await session.get(Connection, connection_id)
            p = await session.get(Preference, conn.user_id) if conn else None
            owner = await session.get(User, conn.user_id) if conn else None
            source = await session.get(Source, source_id) if source_id else None
            return bool(
                conn
                and conn.status == "connected"
                and conn.generation == generation
                and p
                and not paused(p)
                and owner
                and owner.status == "active"
                and (
                    not source_id
                    or (
                        source
                        and source.connection_id == connection_id
                        and source.generation == source_generation
                    )
                )
            )

    async def access(self, identifier: uuid.UUID, generation: int, stale: str | None = None) -> str:
        async with self.factory()() as session:
            conn = await session.scalar(
                select(Connection).where(Connection.id == identifier).with_for_update()
            )
            if not conn or conn.status != "connected" or conn.generation != generation:
                raise CalendarFailure("revoked")
            p = await session.get(Preference, conn.user_id)
            owner = await session.get(User, conn.user_id)
            if not p or paused(p) or not owner or owner.status != "active":
                raise CalendarFailure("paused_or_revoked")
            tokens = unseal(self.settings, conn.credentials_encrypted or "")
            expiry = (
                datetime.fromisoformat(tokens["expiresAt"]) if tokens.get("expiresAt") else None
            )
            refresh = (
                (stale == tokens["access"])
                if stale
                else bool(expiry and utc(expiry) <= datetime.now(UTC) + timedelta(seconds=60))
            )
            if refresh:
                if not tokens.get("refresh"):
                    raise CalendarFailure("consent_required")
                tokens = await self.provider.tokens(conn.provider, refresh=tokens["refresh"])
                conn.credentials_encrypted = seal(self.settings, tokens)
                await session.commit()
            return str(tokens["access"])

    async def revoke(self, identifier: uuid.UUID) -> None:
        async with self.factory()() as session:
            conn = await session.scalar(
                select(Connection).where(Connection.id == identifier).with_for_update()
            )
            if not conn:
                return
            conn.status, conn.generation, conn.credentials_encrypted = (
                "reauthorize",
                conn.generation + 1,
                None,
            )
            for source_id in (
                await session.scalars(select(Source.id).where(Source.connection_id == identifier))
            ).all():
                await purge_source(session, source_id)
            await session.commit()

    async def refresh_source(self, identifier: uuid.UUID) -> None:
        async with self.factory()() as session:
            source = await session.get(Source, identifier)
            conn = await session.get(Connection, source.connection_id) if source else None
            if not source or not conn or conn.status != "connected":
                raise CalendarFailure("revoked")
            locator = unseal(self.settings, source.locator_encrypted)

        async def guard() -> bool:
            return await self.allowed(conn.id, conn.generation, source.id, source.generation)

        try:
            access = await self.access(conn.id, conn.generation)
            try:
                rows, limited = await asyncio.wait_for(
                    self.provider.read(conn.provider, locator, access, guard), 180
                )
            except CalendarFailure as error:
                if error.code != "consent_required" or conn.provider != "notion":
                    raise
                access = await self.access(conn.id, conn.generation, stale=access)
                rows, limited = await asyncio.wait_for(
                    self.provider.read(conn.provider, locator, access, guard), 180
                )
            if not await guard():
                raise CalendarFailure("revoked")
            async with self.factory()() as session:
                # Match disconnect's lock order so erasure cannot race a persisted copy.
                current_conn = await session.scalar(
                    select(Connection).where(Connection.id == conn.id).with_for_update()
                )
                if (
                    not current_conn
                    or current_conn.status != "connected"
                    or current_conn.generation != conn.generation
                ):
                    raise CalendarFailure("revoked")
                current = await session.scalar(
                    select(Source).where(Source.id == identifier).with_for_update()
                )
                if not current or current.generation != source.generation:
                    raise CalendarFailure("revoked")
                previous = {
                    d.external_key: d
                    for d in (
                        await session.scalars(
                            select(Document).where(Document.source_id == identifier)
                        )
                    ).all()
                }
                from .calendar_rules import key

                seen = set()
                for row in rows:
                    external_key = key(row["providerId"])
                    seen.add(external_key)
                    data = seal(self.settings, row)
                    digest = fingerprint(row)
                    old = previous.get(external_key)
                    if old:
                        old.payload_encrypted, old.fingerprint, old.expires_at = (
                            data,
                            digest,
                            datetime.now(UTC) + timedelta(minutes=15),
                        )
                    else:
                        session.add(
                            Document(
                                user_id=current.user_id,
                                source_id=identifier,
                                external_key=external_key,
                                payload_encrypted=data,
                                fingerprint=digest,
                                expires_at=datetime.now(UTC) + timedelta(minutes=15),
                            )
                        )
                for external_key, old in previous.items():
                    if external_key not in seen:
                        await session.execute(delete(Draft).where(Draft.document_id == old.id))
                        await session.delete(old)
                current.last_synced_at, current.error_code, current.limited = (
                    datetime.now(UTC),
                    None,
                    limited,
                )
                await session.commit()
        except Exception as error:
            code = error.code if isinstance(error, CalendarFailure) else "source_sync_unavailable"
            if code == "consent_required":
                await self.revoke(conn.id)
            async with self.factory()() as session:
                current = await session.get(Source, identifier)
                if current and current.generation == source.generation:
                    current.error_code = code
                    if code in {"source_unavailable", "consent_required"}:
                        await purge_source(session, identifier)
                    await session.commit()
            raise CalendarFailure(code) from None

    async def fresh_document(self, identifier: uuid.UUID, owner: uuid.UUID) -> Document:
        async with self.factory()() as session:
            doc = await session.scalar(
                select(Document).where(Document.id == identifier, Document.user_id == owner)
            )
            if not doc:
                raise ApiError(404, "document_missing", "That source document is unavailable.")
            source_id = doc.source_id
        try:
            await self.refresh_source(source_id)
        except CalendarFailure as error:
            raise ApiError(
                409,
                "source_revalidation_failed",
                "The source could not be revalidated. Refresh or reconnect before using it.",
            ) from error
        async with self.factory()() as session:
            current = await session.get(Document, identifier)
            if not current or utc(current.expires_at) <= datetime.now(UTC):
                raise ApiError(404, "document_missing", "That source document is unavailable.")
            return current

    async def tick(self, now: datetime | None = None) -> dict[str, int]:
        now = now or datetime.now(UTC)
        counts = {"synced": 0, "failed": 0}
        if not self.settings.collaboration_enabled or self.database.session_factory is None:
            return counts
        async with self.factory()() as session:
            expired = select(Document.id).where(Document.expires_at <= now)
            await session.execute(
                delete(Draft).where(or_(Draft.document_id.in_(expired), Draft.expires_at <= now))
            )
            await session.execute(delete(Document).where(Document.expires_at <= now))
            await session.execute(delete(OAuthState).where(OAuthState.expires_at <= now))
            await session.execute(delete(Receipt).where(Receipt.expires_at <= now))
            await session.execute(
                update(Draft)
                .where(Draft.status == "executing", Draft.started_at < now - timedelta(minutes=10))
                .values(status="uncertain", error_code="worker_interrupted")
            )
            ids = (
                await session.scalars(
                    select(Connection.id)
                    .where(
                        Connection.status == "connected",
                        Connection.next_sync_at <= now,
                        or_(Connection.lease_until.is_(None), Connection.lease_until < now),
                    )
                    .limit(10)
                )
            ).all()
            await session.commit()
        for identifier in ids:
            lease = uuid.uuid4()
            async with self.factory()() as session:
                claimed = await session.scalar(
                    update(Connection)
                    .where(
                        Connection.id == identifier,
                        Connection.status == "connected",
                        Connection.next_sync_at <= now,
                        or_(Connection.lease_until.is_(None), Connection.lease_until < now),
                    )
                    .values(
                        lease_token=lease, lease_until=datetime.now(UTC) + timedelta(minutes=10)
                    )
                    .returning(Connection.id)
                )
                await session.commit()
                if not claimed:
                    continue
                conn = await session.get(Connection, identifier)
                assert conn
                sources = (
                    await session.scalars(
                        select(Source.id).where(Source.connection_id == identifier)
                    )
                ).all()
                version = conn.sync_version
            failed = False
            try:
                try:
                    # Always finish below the ten-minute lease; another worker must not overlap.
                    async with asyncio.timeout(240):
                        for source_id in sources:
                            try:
                                await self.refresh_source(source_id)
                                counts["synced"] += 1
                            except Exception:
                                failed = True
                                counts["failed"] += 1
                except TimeoutError:
                    failed = True
                    counts["failed"] += 1
                async with self.factory()() as session:
                    current = await session.scalar(
                        select(Connection).where(Connection.id == identifier).with_for_update()
                    )
                    if current and current.status == "connected" and current.lease_token == lease:
                        current.error_code = "partial_sync" if failed else None
                        if not failed:
                            current.last_synced_at = now
                        current.next_sync_at = (
                            now if current.sync_version != version else now + timedelta(minutes=5)
                        )
                        await session.commit()
            finally:
                async with self.factory()() as session:
                    await session.execute(
                        update(Connection)
                        .where(Connection.id == identifier, Connection.lease_token == lease)
                        .values(lease_token=None, lease_until=None)
                    )
                    await session.commit()
        return counts

    async def execute(
        self, identifier: uuid.UUID, owner: uuid.UUID, revision: int, request_id: str
    ) -> dict[str, Any]:
        async with self.factory()() as session:
            draft = await session.scalar(
                select(Draft)
                .where(Draft.id == identifier, Draft.user_id == owner)
                .with_for_update()
            )
            if not draft or utc(draft.expires_at) <= datetime.now(UTC):
                raise ApiError(404, "draft_missing", "That draft is unavailable.")
            if draft.revision != revision or draft.status != "prepared":
                raise ApiError(
                    409,
                    "approval_changed",
                    "Refresh the preview. This revision is not ready for execution.",
                )
            note = unseal(self.settings, draft.payload_encrypted)
            destination = await session.get(Source, draft.destination_id)
            conn = await session.get(Connection, destination.connection_id) if destination else None
            if (
                not destination
                or not destination.writable
                or not conn
                or conn.provider != "notion"
                or conn.status != "connected"
            ):
                raise ApiError(
                    409, "write_not_permitted", "Choose an allowed Notion destination first."
                )
            locator = unseal(self.settings, destination.locator_encrypted)
            previous = (
                unseal(self.settings, draft.result_encrypted) if draft.result_encrypted else None
            )
            draft.status, draft.started_at = "executing", datetime.now(UTC)
            document_id, destination_generation = draft.document_id, destination.generation
            await record_audit(
                session,
                user_id=owner,
                event_type="collaboration.note.approved",
                request_id=request_id,
                target_type="collaboration-draft",
                target_id=str(identifier),
                result="started",
                changed_fields=["approved_revision"],
            )
            await session.commit()

        async def guard() -> bool:
            async with self.factory()() as session:
                current = await session.get(Draft, identifier)
                source_doc = await session.get(Document, document_id)
                return bool(
                    current
                    and current.status == "executing"
                    and current.revision == revision
                    and source_doc
                    and source_doc.fingerprint == note["sourceFingerprint"]
                    and await self.allowed(
                        conn.id, conn.generation, destination.id, destination_generation
                    )
                )

        attempted = False
        try:
            fresh = await self.fresh_document(document_id, owner)
            if fresh.fingerprint != note["sourceFingerprint"]:
                raise CalendarFailure("source_changed")
            access = await self.access(conn.id, conn.generation)
            await self.provider.describe("notion", locator, access, guard)
            attempted = True
            result = await self.provider.write(locator, note, access, guard, previous)
            async with self.factory()() as session:
                changed = await session.scalar(
                    update(Draft)
                    .where(
                        Draft.id == identifier,
                        Draft.status == "executing",
                        Draft.revision == revision,
                    )
                    .values(
                        status="succeeded",
                        error_code=None,
                        result_encrypted=seal(self.settings, result),
                    )
                    .returning(Draft.id)
                )
                await session.commit()
                if not changed:
                    raise ApiError(
                        409,
                        "write_result_unavailable",
                        "The remote write may have completed after local access changed. "
                        "Check Notion before retrying.",
                    )
            return {"status": "succeeded", "url": result["url"]}
        except ApiError:
            async with self.factory()() as session:
                await session.execute(
                    update(Draft)
                    .where(
                        Draft.id == identifier,
                        Draft.status == "executing",
                        Draft.revision == revision,
                    )
                    .values(
                        status="uncertain" if attempted else "failed",
                        error_code="write_uncertain" if attempted else "source_revalidation_failed",
                    )
                )
                await session.commit()
            raise
        except Exception as error:
            code = error.code if isinstance(error, CalendarFailure) else "write_uncertain"
            definite = code in {
                "revoked",
                "paused_or_revoked",
                "source_changed",
                "source_unavailable",
                "write_conflict",
                "write_rejected",
                "invalid_target",
                "consent_required",
                "rate_limited",
            }
            async with self.factory()() as session:
                await session.execute(
                    update(Draft)
                    .where(
                        Draft.id == identifier,
                        Draft.status == "executing",
                        Draft.revision == revision,
                    )
                    .values(status="failed" if definite else "uncertain", error_code=code)
                )
                await session.commit()
            raise ApiError(
                409,
                "note_write_failed",
                "The note was not confirmed. Review its status and check Notion "
                "before any new attempt.",
            ) from None
