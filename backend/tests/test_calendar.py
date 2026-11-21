from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from pydantic import SecretStr, ValidationError
from sqlalchemy import select
from test_notifications import AUTH, OTHER, setup

from nexus_api.calendar_import import import_ics, timetable_events
from nexus_api.calendar_provider import CalendarFailure, CalendarProvider, cipher, safe_delta_url
from nexus_api.calendar_rules import TimetableInput, instant, microsoft_event
from nexus_api.calendar_sync import CalendarSync
from nexus_api.errors import ApiError
from nexus_api.models import CalendarConnection, CalendarOAuthState

BASE = "/api/v1/calendar"
NOW = datetime.now(UTC).replace(microsecond=0)


def google_item(identifier: str = "one", **changes: Any) -> dict[str, Any]:
    return {
        "id": identifier,
        "summary": "Design review",
        "start": {"dateTime": (NOW + timedelta(hours=1)).isoformat()},
        "end": {"dateTime": (NOW + timedelta(hours=2)).isoformat()},
        **changes,
    }


def token_response() -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "access_token": "private-access",
            "refresh_token": "private-refresh",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "https://www.googleapis.com/auth/calendar.events.readonly",
        },
    )


@asynccontextmanager
async def calendar_setup(tmp_path: Any, handler: Any = None, postgres: str | None = None):
    async with setup(tmp_path, postgres=postgres) as (app, client, owner):
        settings = app.state.settings
        settings.calendar_enabled = True
        settings.calendar_encryption_key = SecretStr(Fernet.generate_key().decode())
        settings.calendar_api_public_url = "https://api.example.test"
        settings.calendar_web_url = "https://nexus.example.test"
        settings.google_calendar_client_id = "test-client"
        settings.google_calendar_client_secret = SecretStr("private-client-secret")
        settings.microsoft_calendar_client_id = "test-microsoft"
        settings.microsoft_calendar_client_secret = SecretStr("private-microsoft-secret")
        await app.state.calendar_provider.close()

        def unavailable(request: httpx.Request) -> httpx.Response:
            raise AssertionError(f"Unexpected fixture request: {request.url.host}")

        adapter = CalendarProvider(settings, httpx.MockTransport(handler or unavailable))
        app.state.calendar_provider = adapter
        yield app, client, owner, adapter


async def connect(client: httpx.AsyncClient) -> str:
    start = await client.post(f"{BASE}/oauth/google/start", headers=AUTH)
    assert start.status_code == 200, start.text
    query = parse_qs(urlsplit(start.json()["data"]["authorizationUrl"]).query)
    assert query["scope"] == ["https://www.googleapis.com/auth/calendar.events.readonly"]
    assert query["code_challenge_method"] == ["S256"]
    assert "code_verifier" not in query
    callback = await client.get(
        f"{BASE}/oauth/google/callback", params={"state": query["state"][0], "code": "private-code"}
    )
    assert callback.status_code == 303, callback.text
    assert (
        callback.headers["location"] == "https://nexus.example.test/app/calendar?consent=connected"
    )
    return query["state"][0]


def manual(**changes: Any) -> dict[str, Any]:
    return {
        "title": "Field visit",
        "location": "Farm",
        "starts_at": (NOW + timedelta(hours=1)).isoformat(),
        "ends_at": (NOW + timedelta(hours=2)).isoformat(),
        "idempotency_key": "manual-save-one",
        **changes,
    }


async def test_manual_owner_idempotency_preparation_and_conflicts(tmp_path: Any) -> None:
    async with calendar_setup(tmp_path) as (_, client, _, _):
        assert (await client.get(BASE)).status_code == 401
        saved = await client.post(f"{BASE}/events", headers=AUTH, json=manual())
        assert saved.status_code == 200, saved.text
        event = saved.json()["data"]
        again = await client.post(f"{BASE}/events", headers=AUTH, json=manual())
        assert again.json()["data"]["id"] == event["id"]
        assert (
            await client.post(f"{BASE}/events", headers=AUTH, json=manual(title="Changed"))
        ).status_code == 409
        assert (
            await client.delete(f"{BASE}/events/{event['id']}", headers=OTHER)
        ).status_code == 404
        later = manual(
            title="Next event",
            starts_at=(NOW + timedelta(hours=2, minutes=5)).isoformat(),
            ends_at=(NOW + timedelta(hours=3)).isoformat(),
            idempotency_key="second-save",
        )
        assert (await client.post(f"{BASE}/events", headers=AUTH, json=later)).status_code == 200
        agenda = await client.get(BASE, headers=AUTH, params={"start": NOW.date().isoformat()})
        assert agenda.headers["cache-control"] == "no-store"
        assert agenda.json()["data"]["conflicts"][0]["kind"] == "preparation"
        assert len(agenda.json()["data"]["items"]) == 2
        assert (
            await client.patch(
                f"{BASE}/events/{event['id']}/preparation", headers=AUTH, json={"minutes": 60}
            )
        ).status_code == 200
        assert (
            await client.put(
                f"{BASE}/events/{event['id']}", headers=AUTH, json=manual(title="Updated")
            )
        ).json()["data"]["title"] == "Updated"
        assert (
            await client.delete(f"{BASE}/events/{event['id']}", headers=AUTH)
        ).status_code == 200


def ics(body: str) -> str:
    return (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nexus Test//EN\r\n"
        + body
        + "END:VCALENDAR\r\n"
    )


def vevent(body: str) -> str:
    return "BEGIN:VEVENT\r\nUID:test-series\r\nSUMMARY:Workshop\r\n" + body + "END:VEVENT\r\n"


def test_ics_recurrence_exclusions_floating_and_all_day() -> None:
    day = NOW.strftime("%Y%m%d")
    tomorrow = (NOW + timedelta(days=1)).strftime("%Y%m%d")
    events = import_ics(
        ics(
            vevent(
                f"DTSTART:{day}T100000\r\nDTEND:{day}T110000\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:{tomorrow}T100000\r\n"
            )
        ),
        "Asia/Kolkata",
        NOW,
    )
    assert len(events) == 2
    assert events[0].starts_at.hour == 4 and events[0].starts_at.minute == 30
    all_day = import_ics(ics(vevent(f"DTSTART;VALUE=DATE:{day}\r\n")), "Asia/Kolkata", NOW)[0]
    assert all_day.all_day and all_day.preparation_minutes == 0
    assert all_day.ends_at - all_day.starts_at == timedelta(days=1)


@pytest.mark.parametrize(
    "rule",
    ["FREQ=SECONDLY", "FREQ=DAILY;COUNT=1001", "FREQ=DAILY;COUNT=0", "FREQ=DAILY;INTERVAL=0"],
)
def test_ics_rejects_unsupported_or_unbounded_recurrence(rule: str) -> None:
    with pytest.raises(ApiError):
        import_ics(ics(vevent(f"DTSTART:{NOW:%Y%m%d}T100000Z\r\nRRULE:{rule}\r\n")), "UTC", NOW)


async def test_import_atomic_replacement_and_source_read_only(tmp_path: Any) -> None:
    async with calendar_setup(tmp_path) as (_, client, _, _):
        body = {
            "name": "Term",
            "timezone": "Asia/Kolkata",
            "contents": ics(
                vevent(f"DTSTART:{NOW:%Y%m%d}T100000Z\r\nDTEND:{NOW:%Y%m%d}T110000Z\r\n")
            ),
        }
        first = await client.post(f"{BASE}/imports/ics", headers=AUTH, json=body)
        assert first.status_code == 200, first.text
        assert (await client.post(f"{BASE}/imports/ics", headers=AUTH, json=body)).json()["data"][
            "alreadyImported"
        ]
        changed = {**body, "contents": body["contents"].replace("Workshop", "Changed")}
        assert (
            await client.post(f"{BASE}/imports/ics", headers=AUTH, json=changed)
        ).status_code == 409
        assert (
            await client.post(
                f"{BASE}/imports/ics",
                headers=AUTH,
                json={**body, "contents": "invalid", "replace": True},
            )
        ).status_code == 422
        items = (
            await client.get(BASE, headers=AUTH, params={"start": NOW.date().isoformat()})
        ).json()["data"]["items"]
        assert len(items) == 1 and items[0]["title"] == "Workshop"
        assert (
            await client.delete(f"{BASE}/events/{items[0]['id']}", headers=AUTH)
        ).status_code == 409
        assert (
            await client.post(
                f"{BASE}/imports/ics", headers=AUTH, json={**changed, "replace": True}
            )
        ).status_code == 200
        collection = first.json()["data"]["collectionId"]
        assert (
            await client.delete(f"{BASE}/collections/{collection}", headers=OTHER)
        ).status_code == 404
        assert (
            await client.delete(f"{BASE}/collections/{collection}", headers=AUTH)
        ).status_code == 200


def test_timetable_and_windows_zones_dst() -> None:
    value = TimetableInput(
        name="Term",
        title="Lab",
        timezone="America/New_York",
        weekdays=[0],
        starts_on=date(2026, 3, 2),
        ends_on=date(2026, 3, 9),
        start_time=time(9),
        end_time=time(10),
    )
    events = timetable_events(value)
    assert [e.starts_at.hour for e in events] == [14, 13]
    with pytest.raises(ValidationError):
        TimetableInput(**{**value.model_dump(), "timezone": "invalid-zone"})
    with pytest.raises(ValueError):
        instant("2026-11-01T01:30:00", "America/New_York")
    _, event = microsoft_event(
        {
            "id": "ms",
            "subject": "Lab",
            "start": {"dateTime": "2026-11-20T09:00:00", "timeZone": "India Standard Time"},
            "end": {"dateTime": "2026-11-20T10:00:00", "timeZone": "India Standard Time"},
        }
    )
    assert event and event.starts_at.hour == 3 and event.starts_at.minute == 30


async def test_oauth_one_use_encrypted_and_disconnect(tmp_path: Any) -> None:
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return token_response()

    async with calendar_setup(tmp_path, handler) as (app, client, owner, _):
        state = await connect(client)
        assert b"code_verifier=" in requests[0].content
        assert (
            await client.get(
                f"{BASE}/oauth/google/callback", params={"state": state, "code": "replay"}
            )
        ).status_code == 400
        async with app.state.database.session_factory() as session:
            conn = await session.scalar(
                select(CalendarConnection).where(CalendarConnection.user_id == owner)
            )
            assert conn and "private-access" not in conn.access_encrypted
            assert (
                cipher(app.state.settings).decrypt(conn.refresh_encrypted.encode())
                == b"private-refresh"
            )
            identifier = str(conn.id)
            saved_state = await session.scalar(select(CalendarOAuthState))
            assert saved_state and saved_state.verifier_encrypted == ""
        agenda = await client.get(BASE, headers=AUTH)
        assert "private-" not in agenda.text
        assert (
            await client.delete(f"{BASE}/connections/{identifier}", headers=OTHER)
        ).status_code == 404
        assert (await client.delete(f"{BASE}/connections/{identifier}", headers=AUTH)).json()[
            "data"
        ]["copiesRemoved"]
        async with app.state.database.session_factory() as session:
            conn = await session.get(CalendarConnection, uuid.UUID(identifier))
            assert conn.status == "revoked" and conn.access_encrypted is None


async def test_sync_snapshot_delta_duplicates_failure_and_revocation(tmp_path: Any) -> None:
    mode = "full"
    entered, release = asyncio.Event(), asyncio.Event()

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com":
            return token_response()
        if request.method == "POST":
            return httpx.Response(503)
        if mode == "fail":
            return httpx.Response(503)
        if mode == "wait":
            entered.set()
            await release.wait()
        items = [google_item(), google_item(summary="Latest review")]
        if mode == "delete":
            items = [{"id": "one", "status": "cancelled"}]
        return httpx.Response(
            200,
            json={"timeZone": "Asia/Kolkata", "items": items, "nextSyncToken": "private-cursor"},
        )

    async with calendar_setup(tmp_path, handler) as (app, client, _, adapter):
        await connect(client)
        worker = CalendarSync(app.state.database, app.state.settings, adapter)
        assert (await worker.tick(datetime.now(UTC) + timedelta(seconds=1)))["synced"] == 1
        agenda = (
            await client.get(BASE, headers=AUTH, params={"start": NOW.date().isoformat()})
        ).json()["data"]
        assert len(agenda["items"]) == 1 and agenda["items"][0]["title"] == "Latest review"
        identifier = agenda["connections"][0]["id"]
        mode = "fail"
        await client.post(f"{BASE}/connections/{identifier}/sync", headers=AUTH)
        assert (await worker.tick(datetime.now(UTC) + timedelta(seconds=2)))["failed"] == 1
        assert (
            len(
                (
                    await client.get(BASE, headers=AUTH, params={"start": NOW.date().isoformat()})
                ).json()["data"]["items"]
            )
            == 1
        )
        mode = "delete"
        await client.post(f"{BASE}/connections/{identifier}/sync", headers=AUTH)
        await worker.tick(datetime.now(UTC) + timedelta(seconds=3))
        assert (
            await client.get(BASE, headers=AUTH, params={"start": NOW.date().isoformat()})
        ).json()["data"]["items"] == []
        mode = "wait"
        await client.post(f"{BASE}/connections/{identifier}/sync", headers=AUTH)
        pending = asyncio.create_task(worker.tick(datetime.now(UTC) + timedelta(seconds=4)))
        await asyncio.wait_for(entered.wait(), 5)
        await client.delete(f"{BASE}/connections/{identifier}", headers=AUTH)
        release.set()
        await pending
        assert (await client.get(BASE, headers=AUTH)).json()["data"]["items"] == []


async def test_webhooks_require_secret_and_validation_is_plaintext(tmp_path: Any) -> None:
    async with calendar_setup(tmp_path, lambda _: token_response()) as (app, client, _, _):
        await connect(client)
        from nexus_api.calendar_rules import key

        async with app.state.database.session_factory() as session:
            conn = await session.scalar(select(CalendarConnection))
            identifier, version = conn.id, conn.sync_version
            conn.watch_id, conn.watch_resource, conn.watch_secret_hash = (
                "channel",
                "resource",
                key("private-watch"),
            )
            await session.commit()
        headers = {
            "x-goog-channel-id": "channel",
            "x-goog-resource-id": "resource",
            "x-goog-channel-token": "wrong",
        }
        await client.post(f"{BASE}/webhooks/google", headers=headers)
        async with app.state.database.session_factory() as session:
            assert (await session.get(CalendarConnection, identifier)).sync_version == version
        await client.post(
            f"{BASE}/webhooks/google", headers={**headers, "x-goog-channel-token": "private-watch"}
        )
        async with app.state.database.session_factory() as session:
            assert (await session.get(CalendarConnection, identifier)).sync_version == version + 1
        validation = await client.post(
            f"{BASE}/webhooks/microsoft?validationToken=test%20challenge"
        )
        assert validation.text == "test challenge" and validation.headers[
            "content-type"
        ].startswith("text/plain")


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.example/v1.0/me/calendarView/delta",
        "http://graph.microsoft.com/v1.0/me/calendarView/delta",
        "https://graph.microsoft.com/v1.0/me/messages",
        "https://graph.microsoft.com@evil.example/v1.0/me/calendarView/delta",
    ],
)
def test_delta_cursor_cannot_redirect_provider_credentials(url: str) -> None:
    with pytest.raises(CalendarFailure):
        safe_delta_url(url)


@pytest.mark.skipif(
    not os.getenv("TEST_NOTIFICATION_DATABASE_URL"), reason="Ephemeral PostgreSQL only"
)
async def test_postgres_calendar_workers_claim_once_and_migrations(tmp_path: Any) -> None:
    entered, release = asyncio.Event(), asyncio.Event()
    calls = []

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com":
            return token_response()
        if request.method == "POST":
            return httpx.Response(503)
        calls.append(request)
        entered.set()
        await release.wait()
        return httpx.Response(
            200, json={"timeZone": "UTC", "items": [google_item()], "nextSyncToken": "one"}
        )

    async with calendar_setup(tmp_path, handler, os.environ["TEST_NOTIFICATION_DATABASE_URL"]) as (
        app,
        client,
        _,
        adapter,
    ):
        await connect(client)
        first = asyncio.create_task(
            CalendarSync(app.state.database, app.state.settings, adapter).tick(
                datetime.now(UTC) + timedelta(seconds=1)
            )
        )
        await asyncio.wait_for(entered.wait(), 5)
        second = await CalendarSync(app.state.database, app.state.settings, adapter).tick(
            datetime.now(UTC) + timedelta(seconds=1)
        )
        release.set()
        assert (await first)["synced"] == 1 and second["synced"] == 0 and len(calls) == 1


async def test_provider_pages_refresh_and_microsoft_watch_renewal(tmp_path: Any) -> None:
    calls: list[httpx.Request] = []

    async def permitted() -> bool:
        return True

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.host == "oauth2.googleapis.com":
            return token_response()
        if request.method == "PATCH":
            return httpx.Response(404)
        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "id": "new-watch",
                    "expirationDateTime": (NOW + timedelta(days=2)).isoformat(),
                },
            )
        if request.url.params.get("pageToken") == "page-two":
            return httpx.Response(
                200,
                json={
                    "timeZone": "UTC",
                    "items": [google_item("two")],
                    "nextSyncToken": "next-cursor",
                },
            )
        return httpx.Response(
            200, json={"timeZone": "UTC", "items": [google_item()], "nextPageToken": "page-two"}
        )

    async with calendar_setup(tmp_path, handler) as (_, _, _, adapter):
        first = await adapter.sync(
            "google", "access", None, NOW, NOW + timedelta(days=1), permitted
        )
        assert len(first.changes) == 2 and first.cursor == "next-cursor"
        await adapter.sync(
            "google", "access", first.cursor, NOW, NOW + timedelta(days=1), permitted
        )
        assert (
            calls[2].url.params["syncToken"] == "next-cursor"
            and "timeMin" not in calls[2].url.params
        )
        refreshed = await adapter.tokens("google", refresh="private-refresh")
        assert (
            refreshed["access_token"] == "private-access"
            and b"grant_type=refresh_token" in calls[-1].content
        )
        watch = await adapter.watch(
            "microsoft", "access", "candidate", "secret", permitted, existing_id="old/watch"
        )
        assert watch["id"] == "new-watch" and "/subscriptions/old%2Fwatch" in str(calls[-2].url)
        assert calls[-1].method == "POST" and calls[-1].url.path == "/v1.0/subscriptions"


async def test_expired_cursor_full_resync_and_consent_revocation(tmp_path: Any) -> None:
    revoked = False
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com":
            return token_response()
        if request.method == "POST":
            return httpx.Response(503)
        requests.append(request)
        if revoked:
            return httpx.Response(401)
        if request.url.params.get("syncToken"):
            return httpx.Response(410)
        return httpx.Response(
            200, json={"timeZone": "UTC", "items": [google_item()], "nextSyncToken": "cursor"}
        )

    async with calendar_setup(tmp_path, handler) as (app, client, _, adapter):
        await connect(client)
        worker = CalendarSync(app.state.database, app.state.settings, adapter)
        await worker.tick(datetime.now(UTC) + timedelta(seconds=1))
        agenda = (await client.get(BASE, headers=AUTH)).json()["data"]
        identifier = agenda["connections"][0]["id"]
        await client.post(f"{BASE}/connections/{identifier}/sync", headers=AUTH)
        assert (await worker.tick(datetime.now(UTC) + timedelta(seconds=2)))["synced"] == 1
        assert "syncToken" in requests[-2].url.params and "timeMin" in requests[-1].url.params
        revoked = True
        await client.post(f"{BASE}/connections/{identifier}/sync", headers=AUTH)
        await worker.tick(datetime.now(UTC) + timedelta(seconds=3))
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert state["items"] == [] and state["connections"][0]["status"] == "reauthorize"


async def test_calendar_boundary_removes_oauth_query_before_downstream_logging() -> None:
    from nexus_api.calendar_boundary import CalendarBoundary

    scope: dict[str, Any] = {
        "type": "http",
        "path": "/api/v1/calendar/oauth/google/callback",
        "query_string": b"code=private-code&state=private-state",
    }

    async def downstream(scope: Any, receive: Any, send: Any) -> None:
        assert scope["query_string"] == b""
        assert scope["state"]["calendar_oauth"] == {
            "code": "private-code",
            "state": "private-state",
        }

    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: Any) -> None:
        pass

    await CalendarBoundary(downstream)(scope, receive, send)
