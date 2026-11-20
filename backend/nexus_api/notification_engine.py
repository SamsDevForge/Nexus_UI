"""Durable scheduled briefs and leased push outbox, run by an explicit worker."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from cryptography.fernet import InvalidToken
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .audit import record_audit
from .config import Settings
from .db import Database
from .models import ManualCapture, Notification, Preference, Profile, PushDelivery, PushDevice, User
from .notification_rules import local_instant, paused, quiet_until, utc
from .push import InvalidPushToken, PushSender, token_cipher


async def schedule_user(
    session: AsyncSession, user: User, p: Preference, zone: str, now: datetime
) -> int:
    day = utc(now).astimezone(ZoneInfo(zone)).date()
    count = 0
    for kind, enabled, clock in [
        ("morning", p.morning_brief_enabled, p.morning_brief_at),
        ("evening", p.evening_brief_enabled, p.evening_brief_at),
    ]:
        if not enabled:
            continue
        due = local_instant(day, clock, zone)
        key = f"{kind}:{day.isoformat()}"
        existing = await session.scalar(
            select(Notification).where(
                Notification.user_id == user.id, Notification.dedup_key == key
            )
        )
        if existing:
            if existing.status == "queued":
                # A changed preference replaces queued timing, never a delivered brief.
                if (
                    existing.timezone != zone
                    or existing.evidence.get("scheduledAt") != due.isoformat()
                ):
                    existing.due_at, existing.expires_at = due, due + timedelta(hours=2)
                    existing.timezone = zone
                    existing.evidence = {"scheduledAt": due.isoformat()}
            continue
        try:
            async with session.begin_nested():
                session.add(
                    Notification(
                        user_id=user.id,
                        kind=kind,
                        dedup_key=key,
                        timezone=zone,
                        due_at=due,
                        expires_at=due + timedelta(hours=2),
                        evidence={"scheduledAt": due.isoformat()},
                    )
                )
                await session.flush()
            count += 1
        except IntegrityError:
            pass  # A concurrent scheduler has already inserted this user's daily brief.
    return count


async def compose_brief(session: AsyncSession, item: Notification, now: datetime) -> None:
    scheduled = datetime.fromisoformat(
        item.evidence.get("scheduledAt", (utc(item.expires_at) - timedelta(hours=2)).isoformat())
    )
    local_day = utc(scheduled).astimezone(ZoneInfo(item.timezone)).date()
    target_day = local_day + timedelta(days=int(item.kind == "evening"))
    count = (
        await session.scalar(
            select(func.count())
            .select_from(ManualCapture)
            .where(
                ManualCapture.user_id == item.user_id,
                ManualCapture.kind == "local-event-draft",
                ManualCapture.status.in_(["saved", "corrected"]),
                ManualCapture.canonical_fields["date"].as_string() == target_day.isoformat(),
            )
        )
        or 0
    )
    item.title = {
        "morning": "Your morning brief",
        "evening": "Prepare for tomorrow",
        "test": "Your requested test brief",
    }[item.kind]
    item.body = (
        f"You have {count} saved NEXUS event draft(s) for {target_day.isoformat()}. "
        "Calendar copies are not consulted by this brief; this is not a complete schedule."
    )
    item.evidence = {
        **item.evidence,
        "source": "owned saved NEXUS event drafts",
        "targetDate": target_day.isoformat(),
        "eventCount": count,
        "generatedAt": now.isoformat(),
        "externalCalendarsConsulted": False,
    }


class NotificationEngine:
    def __init__(self, database: Database, settings: Settings, sender: PushSender | None = None):
        self.database, self.settings, self.sender = database, settings, sender

    async def tick(self, now: datetime | None = None) -> dict[str, int]:
        now = utc(now or datetime.now(UTC))
        stats = {"scheduled": 0, "delivered": 0, "pushAccepted": 0, "pushUncertain": 0}
        if not self.settings.notifications_enabled or self.database.session_factory is None:
            return stats
        factory = self.database.session_factory
        # Bounded pages and one owner lock/transaction per user avoid long shared locks.
        cursor: uuid.UUID | None = None
        while True:
            async with factory() as session:
                query = select(User.id).where(
                    User.status == "active", User.onboarding_completed.is_(True)
                )
                if cursor is not None:
                    query = query.where(User.id > cursor)
                user_ids = (await session.scalars(query.order_by(User.id).limit(100))).all()
            if not user_ids:
                break
            for user_id in user_ids:
                async with factory() as session:
                    user = await session.scalar(
                        select(User).where(User.id == user_id).with_for_update()
                    )
                    p, profile = (
                        await session.get(Preference, user_id),
                        await session.get(Profile, user_id),
                    )
                    if user and p and profile and not paused(p) and (p.in_app or p.device_push):
                        stats["scheduled"] += await schedule_user(
                            session, user, p, profile.timezone, now
                        )
                    await session.commit()
            cursor = user_ids[-1]
        async with factory() as session:
            ids = (
                await session.scalars(
                    select(Notification.id)
                    .where(Notification.status == "queued", Notification.due_at <= now)
                    .order_by(Notification.due_at)
                    .limit(100)
                )
            ).all()
        for item_id in ids:
            async with factory() as session:
                item = await session.get(Notification, item_id)
                if item is None:
                    continue
                # A user row lock serializes different jobs for the same user's cooldown.
                user = await session.scalar(
                    select(User).where(User.id == item.user_id).with_for_update()
                )
                claimed = await session.scalar(
                    update(Notification)
                    .where(Notification.id == item_id, Notification.status == "queued")
                    .values(status="processing")
                    .returning(Notification.id)
                )
                if claimed is None:
                    await session.rollback()
                    continue
                p = await session.get(Preference, item.user_id)
                profile = await session.get(Profile, item.user_id)
                enabled = p is not None and (
                    item.kind == "test"
                    or (
                        p.morning_brief_enabled
                        if item.kind == "morning"
                        else p.evening_brief_enabled
                    )
                )
                if not user or user.status != "active" or not p or paused(p) or not enabled:
                    item.status, item.reason = "suppressed", "permission_or_schedule_paused"
                elif profile is None or profile.timezone != item.timezone:
                    item.status, item.reason = "suppressed", "timezone_changed"
                elif utc(item.expires_at) <= now:
                    item.status, item.reason = "suppressed", "expired"
                elif not p.in_app and not (p.device_push and self.settings.push_enabled):
                    item.status, item.reason = "suppressed", "channels_disabled"
                else:
                    defer = quiet_until(now, p, item.timezone)
                    last = await session.scalar(
                        select(func.max(Notification.delivered_at)).where(
                            Notification.user_id == item.user_id, Notification.status == "delivered"
                        )
                    )
                    if last and utc(last) + timedelta(minutes=30) > now:
                        cooldown = utc(last) + timedelta(minutes=30)
                        defer = max(defer, cooldown) if defer else cooldown
                    if defer:
                        item.status = "queued" if defer < utc(item.expires_at) else "suppressed"
                        item.reason = "quiet_hours_or_cooldown"
                        item.due_at = defer
                    else:
                        await compose_brief(session, item, now)
                        item.status, item.reason, item.delivered_at = "delivered", None, now
                        if p.device_push and self.settings.push_enabled:
                            devices = (
                                await session.scalars(
                                    select(PushDevice).where(
                                        PushDevice.user_id == item.user_id,
                                        PushDevice.active.is_(True),
                                    )
                                )
                            ).all()
                            for device in devices:
                                session.add(
                                    PushDelivery(notification_id=item.id, device_id=device.id)
                                )
                        await record_audit(
                            session,
                            user_id=item.user_id,
                            event_type="notification.brief.available",
                            request_id="notification-worker",
                            target_type="notification",
                            target_id=str(item.id),
                            result="success",
                            changed_fields=["status"],
                        )
                        stats["delivered"] += 1
                await session.commit()
        await self.deliver_push(now, stats)
        return stats

    async def deliver_push(self, now: datetime, stats: dict[str, int]) -> None:
        factory = self.database.session_factory
        if factory is None:
            return
        async with factory() as session:
            # A worker may have crashed after provider acceptance. Do not resend blindly.
            await session.execute(
                update(PushDelivery)
                .where(PushDelivery.status == "sending", PushDelivery.lease_until < now)
                .values(status="uncertain", reason="worker_interrupted")
            )
            ids = (
                await session.scalars(
                    select(PushDelivery.id).where(PushDelivery.status == "queued").limit(100)
                )
            ).all()
            await session.commit()
        for delivery_id in ids:
            async with factory() as session:
                delivery = await session.get(PushDelivery, delivery_id)
                if delivery is None:
                    continue
                claimed = await session.scalar(
                    update(PushDelivery)
                    .where(PushDelivery.id == delivery_id, PushDelivery.status == "queued")
                    .values(status="sending", lease_until=now + timedelta(minutes=5))
                    .returning(PushDelivery.id)
                )
                if claimed is None:
                    await session.rollback()
                    continue
                item = await session.get(Notification, delivery.notification_id)
                device = await session.get(PushDevice, delivery.device_id)
                p = await session.get(Preference, item.user_id) if item else None
                user = await session.get(User, item.user_id) if item else None
                if (
                    not item
                    or not device
                    or not device.active
                    or device.user_id != item.user_id
                    or not user
                    or user.status != "active"
                    or not p
                    or not p.device_push
                    or paused(p)
                ):
                    delivery.status, delivery.reason = "suppressed", "permission_revoked"
                elif utc(item.expires_at) <= now:
                    delivery.status, delivery.reason = "suppressed", "expired"
                elif quiet_until(now, p, item.timezone):
                    delivery.status = "queued"
                elif not self.settings.push_enabled or self.sender is None:
                    delivery.status, delivery.reason = "suppressed", "push_unavailable"
                if delivery.status != "sending":
                    await session.commit()
                    continue
                assert item is not None and device is not None and self.sender is not None
                try:
                    token = (
                        token_cipher(self.settings)
                        .decrypt(device.token_encrypted.encode())
                        .decode()
                    )
                except (InvalidToken, ValueError):
                    delivery.status, delivery.reason = "failed", "token_key_unavailable"
                    await session.commit()
                    continue
                expires, notification_id = utc(item.expires_at), str(item.id)
                # Commit the claim before external I/O. Reclaimed sends become uncertain.
                await session.commit()
                try:
                    receipt = await self.sender.send(token, notification_id, expires)
                    delivery.status, delivery.provider_message_id = "accepted", receipt
                    stats["pushAccepted"] += 1
                except InvalidPushToken:
                    delivery.status, delivery.reason = "failed", "registration_invalid"
                    device.active = False
                except Exception:
                    delivery.status, delivery.reason = "uncertain", "acceptance_unconfirmed"
                    stats["pushUncertain"] += 1
                await session.commit()
