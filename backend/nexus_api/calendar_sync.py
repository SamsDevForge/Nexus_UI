"""Leased calendar synchronization; revocation wins over in-flight work."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, or_, select, update

from .calendar_provider import CalendarFailure, CalendarProvider, cipher
from .calendar_rules import key
from .config import Settings
from .db import Database
from .models import CalendarConnection, CalendarEvent, CalendarOAuthState, Preference, User
from .notification_rules import paused, utc


class CalendarSync:
    def __init__(self, database: Database, settings: Settings, provider: CalendarProvider):
        self.database, self.settings, self.provider = database, settings, provider

    async def tick(self, now: datetime | None = None) -> dict[str, int]:
        now = now or datetime.now(UTC)
        factory = self.database.session_factory
        counts = {"synced": 0, "failed": 0}
        if not self.settings.calendar_enabled or factory is None:
            return counts
        async with factory() as session:
            await session.execute(
                delete(CalendarOAuthState).where(CalendarOAuthState.expires_at < now)
            )
            ids = (
                await session.scalars(
                    select(CalendarConnection.id)
                    .where(
                        CalendarConnection.status == "connected",
                        CalendarConnection.next_sync_at <= now,
                        or_(
                            CalendarConnection.lease_until.is_(None),
                            CalendarConnection.lease_until < now,
                        ),
                    )
                    .order_by(CalendarConnection.next_sync_at)
                    .limit(20)
                )
            ).all()
            await session.commit()
        for identifier in ids:
            token = uuid.uuid4()
            async with factory() as session:
                claimed = await session.scalar(
                    update(CalendarConnection)
                    .where(
                        CalendarConnection.id == identifier,
                        CalendarConnection.status == "connected",
                        CalendarConnection.next_sync_at <= now,
                        or_(
                            CalendarConnection.lease_until.is_(None),
                            CalendarConnection.lease_until < now,
                        ),
                    )
                    .values(lease_token=token, lease_until=now + timedelta(minutes=10))
                    .returning(CalendarConnection.id)
                )
                await session.commit()
                if claimed is None:
                    continue
                conn = await session.get(CalendarConnection, identifier)
                assert conn is not None
            generation, version = conn.generation, conn.sync_version

            async def guard(
                conn_id: uuid.UUID = identifier,
                expected: int = generation,
                lease: uuid.UUID = token,
            ) -> bool:
                async with factory() as session:
                    current = await session.get(CalendarConnection, conn_id)
                    p = await session.get(Preference, current.user_id) if current else None
                    user = await session.get(User, current.user_id) if current else None
                    return bool(
                        current
                        and current.status == "connected"
                        and current.generation == expected
                        and current.lease_token == lease
                        and p
                        and not paused(p)
                        and user
                        and user.status == "active"
                    )

            try:
                if not await guard():
                    raise CalendarFailure("paused_or_revoked")
                vault = cipher(self.settings)
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
                            update(CalendarConnection)
                            .where(
                                CalendarConnection.id == identifier,
                                CalendarConnection.generation == generation,
                                CalendarConnection.status == "connected",
                                CalendarConnection.lease_token == token,
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
                            .returning(CalendarConnection.id)
                        )
                        await session.commit()
                        if changed is None:
                            raise CalendarFailure("revoked")
                full = (
                    not conn.cursor_encrypted
                    or not conn.last_full_sync_at
                    or utc(conn.last_full_sync_at) < now - timedelta(days=1)
                )
                start = (
                    now - timedelta(days=30)
                    if full
                    else utc(conn.window_start or now - timedelta(days=30))
                )
                end = (
                    now + timedelta(days=90)
                    if full
                    else utc(conn.window_end or now + timedelta(days=90))
                )
                cursor = (
                    None if full else vault.decrypt(str(conn.cursor_encrypted).encode()).decode()
                )
                try:
                    batch = await self.provider.sync(
                        conn.provider, access, cursor, start, end, guard
                    )
                except CalendarFailure as error:
                    if error.code != "cursor_expired":
                        raise
                    full, start, end = True, now - timedelta(days=30), now + timedelta(days=90)
                    batch = await self.provider.sync(conn.provider, access, None, start, end, guard)
                if not await guard():
                    raise CalendarFailure("revoked")
                async with factory() as session:
                    current = await session.scalar(
                        select(CalendarConnection)
                        .where(CalendarConnection.id == identifier)
                        .with_for_update()
                    )
                    if (
                        not current
                        or current.generation != generation
                        or current.status != "connected"
                        or current.lease_token != token
                    ):
                        await session.rollback()
                        continue
                    old = {
                        e.external_key: e
                        for e in (
                            await session.scalars(
                                select(CalendarEvent).where(
                                    CalendarEvent.connection_id == identifier
                                )
                            )
                        ).all()
                    }
                    seen = set()
                    for external_key, event in dict(batch.changes).items():
                        seen.add(external_key)
                        existing = old.get(external_key)
                        in_window = (
                            event is not None and event.starts_at < end and event.ends_at >= start
                        )
                        if not in_window:
                            if existing:
                                await session.delete(existing)
                            continue
                        assert event is not None
                        values = event.model_dump()
                        if existing:
                            values.pop("preparation_minutes")
                            for field, value in values.items():
                                setattr(existing, field, value)
                        else:
                            session.add(
                                CalendarEvent(
                                    user_id=current.user_id,
                                    connection_id=current.id,
                                    source=current.provider,
                                    **values,
                                )
                            )
                    if full:
                        for external_key, old_event in old.items():
                            if external_key not in seen:
                                await session.delete(old_event)
                    current.cursor_encrypted = vault.encrypt(batch.cursor.encode()).decode()
                    current.window_start, current.window_end = start, end
                    current.last_synced_at, current.error_code = now, None
                    if full:
                        current.last_full_sync_at = now
                    current.next_sync_at = (
                        now if current.sync_version != version else now + timedelta(minutes=5)
                    )
                    await session.commit()
                counts["synced"] += 1
                # Webhooks accelerate reads; polling remains the recovery path.
                if self.settings.calendar_api_public_url and (
                    not conn.watch_expires_at
                    or utc(conn.watch_expires_at) < now + timedelta(hours=6)
                ):
                    secret, watch_id = secrets.token_urlsafe(32), str(uuid.uuid4())
                    try:
                        result = await self.provider.watch(
                            conn.provider,
                            access,
                            watch_id,
                            secret,
                            guard,
                            existing_id=conn.watch_id if conn.provider == "microsoft" else None,
                        )
                        if not await guard():
                            raise CalendarFailure("revoked")
                        async with factory() as session:
                            watch_values: dict[str, Any] = {
                                "watch_id": result["id"],
                                "watch_resource": result["resource"],
                                "watch_expires_at": result["expires"],
                            }
                            if result["id"] != conn.watch_id or conn.provider == "google":
                                watch_values["watch_secret_hash"] = key(secret)
                            await session.execute(
                                update(CalendarConnection)
                                .where(
                                    CalendarConnection.id == identifier,
                                    CalendarConnection.generation == generation,
                                    CalendarConnection.lease_token == token,
                                    CalendarConnection.status == "connected",
                                )
                                .values(**watch_values)
                            )
                            await session.commit()
                        if conn.provider == "google" and conn.watch_id and conn.watch_resource:
                            await self.provider.stop_watch(
                                conn.provider, access, conn.watch_id, conn.watch_resource, guard
                            )
                    except Exception:
                        # A watch outage must not discard a successful event snapshot.
                        pass
            except Exception as error:
                code = (
                    error.code
                    if isinstance(error, CalendarFailure)
                    else "calendar_sync_unavailable"
                )
                counts["failed"] += 1
                async with factory() as session:
                    current = await session.scalar(
                        select(CalendarConnection)
                        .where(CalendarConnection.id == identifier)
                        .with_for_update()
                    )
                    if (
                        current
                        and current.generation == generation
                        and current.status == "connected"
                        and current.lease_token == token
                    ):
                        current.error_code, current.next_sync_at = code, now + timedelta(minutes=5)
                        if code == "consent_required":
                            current.status, current.generation = (
                                "reauthorize",
                                current.generation + 1,
                            )
                            current.access_encrypted = current.refresh_encrypted = (
                                current.cursor_encrypted
                            ) = None
                            await session.execute(
                                delete(CalendarEvent).where(
                                    CalendarEvent.connection_id == identifier
                                )
                            )
                        await session.commit()
            finally:
                async with factory() as session:
                    await session.execute(
                        update(CalendarConnection)
                        .where(
                            CalendarConnection.id == identifier,
                            CalendarConnection.lease_token == token,
                        )
                        .values(lease_token=None, lease_until=None)
                    )
                    await session.commit()

        return counts
