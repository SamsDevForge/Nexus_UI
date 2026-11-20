"""Explicit bounded polling; mail bodies live only in the provider call stack."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select, update

from .calendar_provider import CalendarFailure
from .config import Settings
from .db import Database
from .mail_provider import MailProvider, mail_cipher
from .models import MailConnection, MailMessage, MailOAuthState, Preference, User
from .notification_rules import paused, utc


class MailSync:
    def __init__(self, database: Database, settings: Settings, provider: MailProvider):
        self.database, self.settings, self.provider = database, settings, provider

    async def tick(self, now: datetime | None = None) -> dict[str, int]:
        now = now or datetime.now(UTC)
        counts = {"synced": 0, "failed": 0}
        factory = self.database.session_factory
        if not self.settings.mail_enabled or factory is None:
            return counts
        async with factory() as session:
            await session.execute(delete(MailMessage).where(MailMessage.expires_at <= now))
            await session.execute(delete(MailOAuthState).where(MailOAuthState.expires_at <= now))
            ids = (
                await session.scalars(
                    select(MailConnection.id)
                    .where(
                        MailConnection.status == "connected",
                        MailConnection.next_sync_at <= now,
                        or_(MailConnection.lease_until.is_(None), MailConnection.lease_until < now),
                    )
                    .order_by(MailConnection.next_sync_at)
                    .limit(10)
                )
            ).all()
            await session.commit()
        for identifier in ids:
            lease = uuid.uuid4()
            async with factory() as session:
                claimed = await session.scalar(
                    update(MailConnection)
                    .where(
                        MailConnection.id == identifier,
                        MailConnection.status == "connected",
                        MailConnection.next_sync_at <= now,
                        or_(MailConnection.lease_until.is_(None), MailConnection.lease_until < now),
                    )
                    .values(lease_token=lease, lease_until=now + timedelta(minutes=10))
                    .returning(MailConnection.id)
                )
                await session.commit()
                if claimed is None:
                    continue
                conn = await session.get(MailConnection, identifier)
                assert conn is not None
            generation, version = conn.generation, conn.sync_version

            async def guard(
                conn_id: uuid.UUID = identifier,
                expected: int = generation,
                token: uuid.UUID = lease,
            ) -> bool:
                async with factory() as session:
                    current = await session.get(MailConnection, conn_id)
                    owner = await session.get(User, current.user_id) if current else None
                    preferences = (
                        await session.get(Preference, current.user_id) if current else None
                    )
                    return bool(
                        current
                        and current.status == "connected"
                        and current.generation == expected
                        and current.lease_token == token
                        and owner
                        and owner.status == "active"
                        and preferences
                        and not paused(preferences)
                    )

            try:
                if not await guard():
                    raise CalendarFailure("paused_or_revoked")
                vault = mail_cipher(self.settings)
                access = vault.decrypt((conn.access_encrypted or "").encode()).decode()
                if not conn.expires_at or utc(conn.expires_at) <= now + timedelta(seconds=60):
                    if not conn.refresh_encrypted:
                        raise CalendarFailure("consent_required")
                    if not await guard():
                        raise CalendarFailure("revoked")
                    fresh = await self.provider.tokens(
                        conn.provider,
                        refresh=vault.decrypt(conn.refresh_encrypted.encode()).decode(),
                    )
                    access = fresh["access_token"]
                    async with factory() as session:
                        changed = await session.scalar(
                            update(MailConnection)
                            .where(
                                MailConnection.id == identifier,
                                MailConnection.status == "connected",
                                MailConnection.generation == generation,
                                MailConnection.lease_token == lease,
                            )
                            .values(
                                access_encrypted=vault.encrypt(access.encode()).decode(),
                                refresh_encrypted=vault.encrypt(
                                    fresh["refresh_token"].encode()
                                ).decode()
                                if fresh.get("refresh_token")
                                else conn.refresh_encrypted,
                                expires_at=now + timedelta(seconds=int(fresh["expires_in"])),
                            )
                            .returning(MailConnection.id)
                        )
                        await session.commit()
                        if changed is None:
                            raise CalendarFailure("revoked")
                rows, truncated = await asyncio.wait_for(
                    self.provider.read(conn.provider, access, now, guard), timeout=240
                )
                if not await guard():
                    raise CalendarFailure("revoked")
                async with factory() as session:
                    current = await session.scalar(
                        select(MailConnection)
                        .where(MailConnection.id == identifier)
                        .with_for_update()
                    )
                    if (
                        not current
                        or current.status != "connected"
                        or current.generation != generation
                        or current.lease_token != lease
                    ):
                        continue
                    old = {
                        m.external_key: m
                        for m in (
                            await session.scalars(
                                select(MailMessage).where(MailMessage.connection_id == identifier)
                            )
                        ).all()
                    }
                    seen = set()
                    for row in {r["external_key"]: r for r in rows}.values():
                        external_key, received, data = (
                            row["external_key"],
                            row["received_at"],
                            row["data"],
                        )
                        if not now - timedelta(days=14) <= received <= now:
                            continue
                        seen.add(external_key)
                        encrypted = vault.encrypt(json.dumps(data).encode()).decode()
                        existing = old.get(external_key)
                        if existing:
                            previous = json.loads(
                                vault.decrypt(existing.payload_encrypted.encode())
                            )
                            if previous != data:
                                existing.payload_encrypted = encrypted
                                existing.revision += 1
                            existing.expires_at = received + timedelta(days=14)
                        else:
                            session.add(
                                MailMessage(
                                    user_id=current.user_id,
                                    connection_id=current.id,
                                    external_key=external_key,
                                    received_at=received,
                                    expires_at=received + timedelta(days=14),
                                    payload_encrypted=encrypted,
                                )
                            )
                    for external_key, message in old.items():
                        if external_key not in seen:
                            await session.delete(message)
                    current.last_synced_at, current.error_code, current.truncated = (
                        now,
                        None,
                        truncated,
                    )
                    current.next_sync_at = (
                        now if current.sync_version != version else now + timedelta(minutes=5)
                    )
                    await session.commit()
                counts["synced"] += 1
            except Exception as error:
                code = error.code if isinstance(error, CalendarFailure) else "mail_sync_unavailable"
                counts["failed"] += 1
                async with factory() as session:
                    current = await session.scalar(
                        select(MailConnection)
                        .where(MailConnection.id == identifier)
                        .with_for_update()
                    )
                    if (
                        current
                        and current.status == "connected"
                        and current.generation == generation
                        and current.lease_token == lease
                    ):
                        current.error_code, current.next_sync_at = code, now + timedelta(minutes=5)
                        if code == "consent_required":
                            current.status, current.generation = (
                                "reauthorize",
                                current.generation + 1,
                            )
                            current.access_encrypted = current.refresh_encrypted = None
                            await session.execute(
                                delete(MailMessage).where(MailMessage.connection_id == identifier)
                            )
                        await session.commit()
            finally:
                async with factory() as session:
                    await session.execute(
                        update(MailConnection)
                        .where(MailConnection.id == identifier, MailConnection.lease_token == lease)
                        .values(lease_token=None, lease_until=None)
                    )
                    await session.commit()
        return counts
