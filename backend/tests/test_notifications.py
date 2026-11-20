from __future__ import annotations

import asyncio
import os
import sys
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import httpx
import pytest
from alembic.config import Config
from cryptography.fernet import Fernet
from sqlalchemy import select, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic import command
from nexus_api.config import Settings
from nexus_api.identity import AuthenticatedPrincipal, FakeIdentityVerifier
from nexus_api.main import create_app
from nexus_api.models import Preference, PushDelivery, PushDevice
from nexus_api.notification_engine import NotificationEngine
from nexus_api.notification_rules import local_instant, quiet_until
from nexus_api.push import FirebasePushSender, InvalidPushToken, PushOutcomeUnknown, token_cipher

NOW = datetime(2026, 11, 20, 2, 0, tzinfo=UTC)  # 07:30 IST
AUTH = {"Authorization": "Bearer owner"}
OTHER = {"Authorization": "Bearer other"}


def migration_config(connection: Connection) -> Config:
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "alembic"))
    config.attributes["connection"] = connection
    return config


class RecordingSender:
    def __init__(self, failure: Exception | None = None) -> None:
        self.calls: list[str] = []
        self.failure = failure

    async def send(self, token: str, notification_id: str, expires: datetime) -> str:
        self.calls.append(notification_id)
        if self.failure:
            raise self.failure
        return f"fixture-receipt-{notification_id}"


@asynccontextmanager
async def setup(
    tmp_path: Path, *, push: bool = False, postgres: str | None = None
) -> AsyncIterator[tuple[Any, httpx.AsyncClient, uuid.UUID]]:
    settings = Settings(
        app_env="test",
        notifications_enabled=True,
        push_enabled=push,
        push_token_encryption_key=Fernet.generate_key().decode() if push else None,
        firebase_project_id="test-project" if push else None,
        firebase_service_account_json_b64="test-fixture-only" if push else None,
        fcm_web_vapid_public_key="test-public-key" if push else None,
        database_url=postgres
        or f"sqlite+aiosqlite:///{(tmp_path / 'notifications.db').as_posix()}",
        auto_create_test_schema=not bool(postgres),
    )
    verifier = FakeIdentityVerifier(
        {
            key: AuthenticatedPrincipal(provider="firebase", subject=key)
            for key in ("owner", "other")
        }
    )
    app = create_app(settings, verifier)
    async with app.router.lifespan_context(app):
        original_engine = app.state.database.engine
        schema = f"test_notifications_{uuid.uuid4().hex}"
        if postgres:
            async with original_engine.begin() as connection:
                await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            isolated = create_async_engine(
                postgres, connect_args={"server_settings": {"search_path": schema}}
            )
            async with isolated.begin() as connection:
                await connection.run_sync(
                    lambda sync: command.upgrade(migration_config(sync), "head")
                )
            app.state.database.engine = isolated
            app.state.database.session_factory = async_sessionmaker(
                isolated, expire_on_commit=False, autoflush=False
            )
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                result = await client.post(
                    "/api/v1/onboarding/complete",
                    headers=AUTH,
                    json={
                        "profile": {
                            "displayName": "Test owner",
                            "timezone": "Asia/Kolkata",
                            "locale": "en-IN",
                        },
                        "places": [],
                        "preferences": {"notifications": {"quietHours": {"enabled": False}}},
                    },
                )
                assert result.status_code == 200, result.text
                owner_id = uuid.UUID(result.json()["data"]["user"]["id"])
                yield app, client, owner_id
        finally:
            if postgres:
                await app.state.database.engine.dispose()
                async with original_engine.begin() as connection:
                    await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
                await original_engine.dispose()


async def configure(client: httpx.AsyncClient, **changes: Any) -> dict[str, Any]:
    current = (await client.get("/api/v1/notifications/preferences", headers=AUTH)).json()["data"]
    for field in ("timezone", "paused", "pushAvailable", "webVapidPublicKey"):
        current.pop(field)
    current.update(changes)
    result = await client.put("/api/v1/notifications/preferences", headers=AUTH, json=current)
    assert result.status_code == 200, result.text
    return result.json()["data"]


def test_dst_gap_fold_and_timezone_arithmetic() -> None:
    assert local_instant(NOW.date(), time(7, 30), "Asia/Kolkata") == NOW
    assert local_instant(datetime(2026, 3, 8).date(), time(2, 30), "America/New_York") == datetime(
        2026, 3, 8, 7, tzinfo=UTC
    )
    assert local_instant(datetime(2026, 11, 1).date(), time(1, 30), "America/New_York") == datetime(
        2026, 11, 1, 5, 30, tzinfo=UTC
    )
    p = Preference(
        quiet_hours_enabled=True, quiet_hours_start=time(22, 30), quiet_hours_end=time(7)
    )
    assert quiet_until(datetime(2026, 11, 20, 18, tzinfo=UTC), p, "Asia/Kolkata") == datetime(
        2026, 11, 21, 1, 30, tzinfo=UTC
    )


@pytest.mark.asyncio
async def test_opt_in_scheduled_brief_is_owned_explainable_and_deduplicated(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        engine = NotificationEngine(app.state.database, app.state.settings)
        assert (await engine.tick(NOW))["scheduled"] == 0
        await configure(client, morningEnabled=True)
        saved = await client.post(
            "/api/v1/captures/local-event-drafts",
            headers=AUTH,
            json={
                "title": "Private title stays out of the brief",
                "rawText": "secret raw source",
                "canonicalFields": {"date": "2026-11-20", "startTime": "10:00"},
                "idempotencyKey": "event-test-key",
            },
        )
        assert saved.status_code == 201
        first = await engine.tick(NOW)
        assert first["scheduled"] == first["delivered"] == 1
        assert (await engine.tick(NOW + timedelta(seconds=30)))["delivered"] == 0
        inbox = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert len(inbox) == 1 and inbox[0]["status"] == "delivered"
        assert inbox[0]["evidence"]["eventCount"] == 1
        assert "secret raw source" not in str(inbox) and "Private title" not in str(inbox)
        assert "not a complete schedule" in inbox[0]["body"]
        assert (await client.get("/api/v1/notifications", headers=OTHER)).json()["data"][
            "items"
        ] == []
        assert (
            await client.patch(f"/api/v1/notifications/{inbox[0]['id']}/read", headers=OTHER)
        ).status_code == 404
        assert (
            await client.patch(f"/api/v1/notifications/{inbox[0]['id']}/read", headers=AUTH)
        ).status_code == 200


@pytest.mark.asyncio
async def test_quiet_hours_delay_without_extending_original_expiry(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        await configure(
            client,
            morningEnabled=True,
            quietHours={"enabled": True, "startsAt": "07:00", "endsAt": "08:00"},
        )
        engine = NotificationEngine(app.state.database, app.state.settings)
        assert (await engine.tick(NOW))["delivered"] == 0
        item = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"][0]
        assert item["dueAt"].startswith("2026-11-20T02:30")
        assert item["expiresAt"].startswith("2026-11-20T04:00")
        assert (await engine.tick(NOW + timedelta(minutes=30)))["delivered"] == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["expired", "paused", "disabled"])
async def test_obsolete_or_revoked_jobs_do_not_deliver(tmp_path: Path, mode: str) -> None:
    async with setup(tmp_path) as (app, client, owner_id):
        await configure(client, morningEnabled=True)
        engine = NotificationEngine(app.state.database, app.state.settings)
        await engine.tick(NOW - timedelta(minutes=1))
        async with app.state.database.session_factory() as session:
            p = await session.get(Preference, owner_id)
            if mode == "paused":
                p.observation_paused = True
            if mode == "disabled":
                p.morning_brief_enabled = False
            await session.commit()
        assert (await engine.tick(NOW + timedelta(hours=3) if mode == "expired" else NOW))[
            "delivered"
        ] == 0
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert all(i["status"] == "suppressed" for i in items)


@pytest.mark.asyncio
async def test_cooldown_separates_briefs_with_same_time(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        await configure(client, morningEnabled=True, eveningEnabled=True, eveningBriefAt="07:30")
        engine = NotificationEngine(app.state.database, app.state.settings)
        assert (await engine.tick(NOW))["delivered"] == 1
        assert (await engine.tick(NOW + timedelta(minutes=29)))["delivered"] == 0
        assert (await engine.tick(NOW + timedelta(minutes=30)))["delivered"] == 1


@pytest.mark.asyncio
async def test_changed_schedule_replaces_pending_time_without_duplicate(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        await configure(client, morningEnabled=True)
        engine = NotificationEngine(app.state.database, app.state.settings)
        await engine.tick(NOW - timedelta(hours=1))
        await configure(client, morningBriefAt="08:30")
        assert (await engine.tick(NOW))["delivered"] == 0
        assert (await engine.tick(NOW + timedelta(hours=1)))["delivered"] == 1
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert len(items) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "failure,status",
    [(None, "accepted"), (PushOutcomeUnknown(), "uncertain"), (InvalidPushToken(), "failed")],
)
async def test_encrypted_push_outbox_records_acceptance_not_receipt(
    tmp_path: Path, failure: Exception | None, status: str
) -> None:
    async with setup(tmp_path, push=True) as (app, client, _):
        token = "private_test_registration_token_123456789"
        device = await client.post(
            "/api/v1/notifications/devices", headers=AUTH, json={"fid": token}
        )
        assert device.status_code == 200
        assert token not in device.text
        async with app.state.database.session_factory() as session:
            stored = await session.scalar(select(PushDevice))
            assert stored.token_encrypted != token and token not in stored.token_encrypted
            assert (
                token_cipher(app.state.settings).decrypt(stored.token_encrypted.encode()).decode()
                == token
            )
        await configure(client, morningEnabled=True)
        sender = RecordingSender(failure)
        engine = NotificationEngine(app.state.database, app.state.settings, sender)
        await engine.tick(NOW)
        await engine.tick(NOW + timedelta(minutes=1))
        assert len(sender.calls) == 1
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert items[0]["push"][0]["status"] == status
        assert "provider_message_id" not in str(items)


@pytest.mark.asyncio
async def test_revoking_device_blocks_pending_push_and_other_user_access(tmp_path: Path) -> None:
    async with setup(tmp_path, push=True) as (app, client, _):
        device = (
            await client.post(
                "/api/v1/notifications/devices",
                headers=AUTH,
                json={"fid": "private_test_registration_token_123456789"},
            )
        ).json()["data"]
        assert (
            await client.delete(f"/api/v1/notifications/devices/{device['id']}", headers=OTHER)
        ).status_code == 404
        assert (
            await client.delete(f"/api/v1/notifications/devices/{device['id']}", headers=AUTH)
        ).status_code == 200
        assert (await client.get("/api/v1/notifications/devices", headers=AUTH)).json()[
            "data"
        ] == []
        await configure(client, morningEnabled=True)
        sender = RecordingSender()
        await NotificationEngine(app.state.database, app.state.settings, sender).tick(NOW)
        assert sender.calls == []


@pytest.mark.asyncio
async def test_interrupted_send_is_uncertain_and_never_reclaimed_for_sending(
    tmp_path: Path,
) -> None:
    async with setup(tmp_path, push=True) as (app, client, _):
        await client.post(
            "/api/v1/notifications/devices",
            headers=AUTH,
            json={"fid": "private_test_registration_token_123456789"},
        )
        await configure(client, morningEnabled=True)
        engine = NotificationEngine(app.state.database, app.state.settings)
        # Deliver the inbox atomically, then simulate a committed pre-send claim and crash.
        await engine.tick(NOW)
        async with app.state.database.session_factory() as session:
            delivery = await session.scalar(select(PushDelivery))
            delivery.status, delivery.lease_until = "sending", NOW - timedelta(minutes=1)
            await session.commit()
        sender = RecordingSender()
        await NotificationEngine(app.state.database, app.state.settings, sender).tick(NOW)
        assert sender.calls == []
        async with app.state.database.session_factory() as session:
            assert (await session.scalar(select(PushDelivery))).status == "uncertain"


@pytest.mark.asyncio
async def test_test_briefs_are_idempotent_rate_limited_and_authenticated(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        assert (await client.get("/api/v1/notifications")).status_code == 401
        url = "/api/v1/notifications/test"
        first = await client.post(url, headers=AUTH, json={"idempotencyKey": "repeatable-test"})
        again = await client.post(url, headers=AUTH, json={"idempotencyKey": "repeatable-test"})
        assert first.json()["data"]["id"] == again.json()["data"]["id"]
        for key in ("second-test", "third-test"):
            assert (
                await client.post(url, headers=AUTH, json={"idempotencyKey": key})
            ).status_code == 200
        assert (
            await client.post(url, headers=AUTH, json={"idempotencyKey": "fourth-test"})
        ).status_code == 429
        await NotificationEngine(app.state.database, app.state.settings).tick()
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert sum(i["status"] == "delivered" for i in items) == 1


@pytest.mark.asyncio
async def test_feature_gate_and_invalid_preferences(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        assert (
            await client.put(
                "/api/v1/notifications/preferences",
                headers=AUTH,
                json={"quietHours": {"startsAt": "07:00", "endsAt": "07:00"}},
            )
        ).status_code == 422
        assert (
            await client.put(
                "/api/v1/notifications/preferences",
                headers=AUTH,
                json={"morningBriefAt": "07:30+05:30"},
            )
        ).status_code == 422
        assert (
            await client.put(
                "/api/v1/notifications/preferences",
                headers=AUTH,
                json={"quietHours": {"startsAt": "22:30+05:30", "endsAt": "07:00"}},
            )
        ).status_code == 422
        app.state.settings.notifications_enabled = False
        assert (await client.get("/api/v1/notifications", headers=AUTH)).status_code == 503


@pytest.mark.asyncio
async def test_midnight_quiet_delay_keeps_original_brief_date(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        await configure(
            client,
            morningEnabled=True,
            morningBriefAt="23:30",
            quietHours={"enabled": True, "startsAt": "23:00", "endsAt": "00:15"},
        )
        engine = NotificationEngine(app.state.database, app.state.settings)
        before_midnight = datetime(2026, 11, 20, 18, tzinfo=UTC)
        assert (await engine.tick(before_midnight))["delivered"] == 0
        assert (await engine.tick(before_midnight + timedelta(minutes=45)))["delivered"] == 1
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        delivered = next(i for i in items if i["status"] == "delivered")
        assert delivered["evidence"]["targetDate"] == "2026-11-20"
        assert "2026-11-20" in delivered["body"]


@pytest.mark.asyncio
async def test_queue_survives_database_restart(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        await configure(client, morningEnabled=True)
        await NotificationEngine(app.state.database, app.state.settings).tick(
            NOW - timedelta(minutes=1)
        )
        await app.state.database.stop()
        app.state.settings.auto_create_test_schema = False
        await app.state.database.start()
        assert (await NotificationEngine(app.state.database, app.state.settings).tick(NOW))[
            "delivered"
        ] == 1


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("TEST_NOTIFICATION_DATABASE_URL"), reason="Isolated PostgreSQL CI service only"
)
async def test_postgres_concurrent_workers_claim_one_brief_and_one_push(tmp_path: Path) -> None:
    async with setup(
        tmp_path, push=True, postgres=os.environ["TEST_NOTIFICATION_DATABASE_URL"]
    ) as (app, client, _):
        await client.post(
            "/api/v1/notifications/devices",
            headers=AUTH,
            json={"fid": "private_test_registration_token_123456789"},
        )
        await configure(client, morningEnabled=True)
        sender = RecordingSender()
        await asyncio.gather(
            *(
                NotificationEngine(app.state.database, app.state.settings, sender).tick(NOW)
                for _ in range(2)
            )
        )
        assert len(sender.calls) == 1
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert len(items) == 1 and items[0]["status"] == "delivered"


@pytest.mark.asyncio
async def test_explicit_worker_process_delivers_one_scheduled_brief(tmp_path: Path) -> None:
    async with setup(tmp_path) as (app, client, _):
        at = datetime.now(UTC).astimezone(ZoneInfo("Asia/Kolkata")).strftime("%H:%M")
        await configure(client, morningEnabled=True, morningBriefAt=at)
        environment = {
            **os.environ,
            "APP_ENV": "test",
            "NOTIFICATIONS_ENABLED": "true",
            "PUSH_ENABLED": "false",
            "DATABASE_URL": app.state.settings.database_url,
            "MIGRATION_DATABASE_URL": app.state.settings.database_url,
            "AUTO_CREATE_TEST_SCHEMA": "false",
        }
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "nexus_api.notification_worker",
            "--once",
            env=environment,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
        assert process.returncode == 0, stderr.decode()
        assert b'"delivered": 1' in stdout
        items = (await client.get("/api/v1/notifications", headers=AUTH)).json()["data"]["items"]
        assert len(items) == 1 and items[0]["kind"] == "morning"
        assert "External calendars are not connected" in items[0]["body"]


@pytest.mark.asyncio
async def test_migrations_upgrade_downgrade_and_match_current_models(tmp_path: Path) -> None:
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'migration.db').as_posix()}")
    try:
        async with engine.begin() as connection:
            await connection.run_sync(lambda sync: command.upgrade(migration_config(sync), "head"))
            await connection.run_sync(lambda sync: command.check(migration_config(sync)))
            await connection.run_sync(
                lambda sync: command.downgrade(migration_config(sync), "20260728_0001")
            )
            await connection.run_sync(lambda sync: command.upgrade(migration_config(sync), "head"))
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_fcm_adapter_sends_data_only_with_expiry_and_generic_identifiers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from firebase_admin import messaging

    captured: list[Any] = []

    def send(message: Any, **kwargs: Any) -> str:
        captured.append(message)
        return "fixture-provider-receipt"

    monkeypatch.setattr(messaging, "send", send)
    sender = FirebasePushSender.__new__(FirebasePushSender)
    sender.app = object()
    result = await sender.send(
        "test-registration", str(uuid.uuid4()), datetime.now(UTC) + timedelta(minutes=30)
    )
    assert result == "fixture-provider-receipt"
    message = captured[0]
    assert message.notification is None
    assert message.fid == "test-registration"
    assert message.token is None
    assert set(message.data) == {"notificationId", "expiresAt"}
    assert int(message.webpush.headers["TTL"]) <= 1800
    encoded = messaging._MessagingService.encode_message(message)
    assert encoded["fid"] == "test-registration"
