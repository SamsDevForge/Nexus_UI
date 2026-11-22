from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from pydantic import SecretStr, ValidationError
from test_notifications import AUTH, OTHER, setup

from nexus_api.calendar_provider import CalendarFailure
from nexus_api.collaboration_provider import (
    NOTION_VERSION,
    TEAMS_SCOPES,
    CollaborationProvider,
    SourceInput,
    rich_text,
    unseal,
)
from nexus_api.models import CollaborationConnection as Connection
from nexus_api.models import Preference

BASE = "/api/v1/collaboration"
PAGE, DEST, CREATED, BLOCK, WORKSPACE, TEAM, DATA = [str(uuid.uuid4()) for _ in range(7)]
CHANNEL = "19:fixture@thread.tacv2"


async def test_selection_started_before_reconnect_cannot_restore_old_selection(
    tmp_path: Any,
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, _fixture):
        conn, _ = await consent(client)
        runtime = app.state.collaboration
        original = runtime.provider.describe
        started, release = asyncio.Event(), asyncio.Event()

        async def held_describe(*args: Any, **kwargs: Any) -> Any:
            result = await original(*args, **kwargs)
            started.set()
            await release.wait()
            return result

        runtime.provider.describe = held_describe
        selecting = asyncio.create_task(
            client.post(
                f"{BASE}/connections/{conn}/sources",
                headers=AUTH,
                json={"kind": "page", "resource_id": PAGE},
            )
        )
        await asyncio.wait_for(started.wait(), 10)
        try:
            await consent(client)
        finally:
            release.set()
        assert (await selecting).status_code == 409
        assert not (await client.get(BASE, headers=AUTH)).json()["data"]["sources"]


class ProviderFixture:
    def __init__(self) -> None:
        self.calls: list[httpx.Request] = []
        self.text = "Field observations: soil readings need calibration."
        self.block_text = ""
        self.revoked = False
        self.uncertain = False
        self.write_started, self.write_release = asyncio.Event(), asyncio.Event()
        self.hold_write = False
        self.token_started, self.token_release = asyncio.Event(), asyncio.Event()
        self.hold_token = False
        self.moved = False

    async def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request)
        path = request.url.path
        if path.endswith("/token") or path.endswith("/oauth/token"):
            if self.hold_token:
                self.token_started.set()
                await self.token_release.wait()
            return httpx.Response(
                200,
                json={
                    "access_token": "SECRET_ACCESS",
                    "refresh_token": "SECRET_REFRESH",
                    "workspace_id": WORKSPACE,
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "scope": TEAMS_SCOPES,
                },
            )
        if request.url.host == "api.notion.com":
            assert request.headers["Notion-Version"] == NOTION_VERSION
        if path == "/v1/search":
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "object": "page",
                            "id": PAGE,
                            "properties": {
                                "title": {"type": "title", "title": [{"plain_text": "Field notes"}]}
                            },
                        }
                    ],
                    "has_more": True,
                },
            )
        if path == "/v1/pages" and request.method == "POST":
            body = json.loads(request.content)
            self.block_text = rich_text(body["children"][0]["paragraph"]["rich_text"])
            self.write_started.set()
            if self.hold_write:
                await self.write_release.wait()
            if self.uncertain:
                raise httpx.ReadTimeout("private provider URL")
            return httpx.Response(200, json={"id": CREATED})
        if path == f"/v1/blocks/{BLOCK}":
            if request.method == "PATCH":
                self.block_text = rich_text(json.loads(request.content)["paragraph"]["rich_text"])
            return httpx.Response(
                200,
                json={
                    "id": BLOCK,
                    "parent": {
                        "page_id": str(uuid.uuid4())
                        if self.moved
                        else CREATED
                        if any(r.url.path == "/v1/pages" and r.method == "POST" for r in self.calls)
                        else DEST
                    },
                    "type": "paragraph",
                    "paragraph": {"rich_text": [{"plain_text": self.block_text}]},
                },
            )
        if path.startswith("/v1/pages/") or path == f"/v1/data_sources/{DATA}":
            if self.revoked and path.endswith(PAGE):
                return httpx.Response(404, json={})
            return httpx.Response(
                200,
                json={
                    "id": path.rsplit("/", 1)[-1],
                    "properties": {
                        "Name": {"type": "title", "title": [{"plain_text": "Field notes"}]}
                    },
                    "title": [{"plain_text": "Research"}],
                },
            )
        if path == f"/v1/data_sources/{DATA}/query":
            return httpx.Response(200, json={"results": [{"id": PAGE}], "has_more": True})
        if path.startswith("/v1/blocks/") and path.endswith("/children"):
            if request.method == "PATCH":
                self.block_text = rich_text(
                    json.loads(request.content)["children"][0]["paragraph"]["rich_text"]
                )
            text = self.block_text if CREATED in path or request.method == "PATCH" else self.text
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "id": BLOCK,
                            "type": "paragraph",
                            "paragraph": {"rich_text": [{"plain_text": text}]},
                        }
                    ],
                    "has_more": False,
                },
            )
        if path == "/v1.0/me/joinedTeams":
            return httpx.Response(
                200, json={"value": [{"id": TEAM, "displayName": "Research team"}]}
            )
        if path.endswith("/channels"):
            return httpx.Response(
                200, json={"value": [{"id": CHANNEL, "displayName": "Field work"}]}
            )
        if path.endswith("/messages"):
            return httpx.Response(
                200,
                json={
                    "value": [
                        {
                            "id": "123",
                            "messageType": "systemEventMessage",
                            "body": {
                                "contentType": "html",
                                "content": (
                                    "<script>secret</script><p>Meeting ended. "
                                    "Review the field report.</p><img src='https://tracking.invalid'>"
                                ),
                            },
                            "webUrl": "javascript:alert(1)",
                        }
                    ],
                    "@odata.nextLink": "https://untrusted.invalid",
                },
            )
        if "/channels/" in path:
            return httpx.Response(200, json={"displayName": "Field work"})
        raise AssertionError(f"Unexpected fixture request: {request.method} {path}")

    @property
    def writes(self) -> list[httpx.Request]:
        return [
            r
            for r in self.calls
            if r.method in {"POST", "PATCH"}
            and (r.url.path == "/v1/pages" or r.url.path.startswith("/v1/blocks/"))
        ]


@asynccontextmanager
async def collaboration_setup(tmp_path: Any, postgres: str | None = None):
    async with setup(tmp_path, postgres=postgres) as (app, client, owner):
        settings = app.state.settings
        settings.collaboration_enabled = True
        settings.collaboration_encryption_key = SecretStr(Fernet.generate_key().decode())
        settings.collaboration_api_public_url = "https://api.example.test"
        settings.collaboration_web_url = "https://nexus.example.test"
        settings.notion_client_id = settings.teams_client_id = "fixture-client"
        settings.notion_client_secret = settings.teams_client_secret = SecretStr("SECRET_CLIENT")
        fixture = ProviderFixture()
        await app.state.collaboration.provider.close()
        app.state.collaboration.provider = CollaborationProvider(
            settings, httpx.MockTransport(fixture)
        )
        yield app, client, owner, fixture


async def consent(client: httpx.AsyncClient, provider: str = "notion") -> tuple[str, str]:
    response = await client.post(f"{BASE}/oauth/{provider}/start", headers=AUTH)
    assert response.status_code == 200, response.text
    query = parse_qs(urlsplit(response.json()["data"]["authorizationUrl"]).query)
    assert "code_verifier" not in query
    if provider == "teams":
        assert query["code_challenge_method"] == ["S256"]
        assert "ChannelMessage.Read.All" in query["scope"][0] and "Write" not in query["scope"][0]
    else:
        assert query["owner"] == ["user"]
    state = query["state"][0]
    response = await client.get(
        f"{BASE}/oauth/{provider}/callback", params={"state": state, "code": "SECRET_CODE"}
    )
    assert response.status_code == 303 and response.headers["location"].endswith(
        "consent=connected"
    ), response.text
    snapshot = (await client.get(BASE, headers=AUTH)).json()["data"]
    return next(c["id"] for c in snapshot["connections"] if c["provider"] == provider), state


async def select_source(
    client: httpx.AsyncClient,
    conn: str,
    identifier: str = PAGE,
    kind: str = "page",
    writable: bool = False,
) -> str:
    response = await client.post(
        f"{BASE}/connections/{conn}/sources",
        headers=AUTH,
        json={
            "kind": kind,
            "resource_id": identifier,
            "writable": writable,
            **({"team_id": TEAM} if kind == "channel" else {}),
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["id"]


async def ready(app: Any, client: httpx.AsyncClient) -> tuple[str, str, str]:
    conn, _ = await consent(client)
    await select_source(client, conn)
    destination = await select_source(client, conn, DEST, writable=True)
    await app.state.collaboration.tick()
    snapshot = (await client.get(BASE, headers=AUTH)).json()["data"]
    doc = next(d["id"] for d in snapshot["documents"] if d["sourceUrl"].endswith(PAGE))
    result = await client.post(
        f"{BASE}/drafts",
        headers=AUTH,
        json={"document_id": doc, "destination_id": destination, "template": "meeting"},
    )
    assert result.status_code == 200, result.text
    return conn, doc, result.json()["data"]["id"]


@pytest.mark.parametrize("provider", ["notion", "teams"])
async def test_consent_is_bound_encrypted_and_replay_safe(
    tmp_path: Any, provider: str, caplog: Any
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        conn, state = await consent(client, provider)
        assert (
            await client.get(
                f"{BASE}/oauth/{provider}/callback", params={"state": state, "code": "SECRET_CODE"}
            )
        ).status_code == 400
        assert (
            await client.get(f"{BASE}/connections/{conn}/discover", headers=OTHER)
        ).status_code == 404
        async with app.state.database.session_factory() as session:
            row = await session.get(Connection, uuid.UUID(conn))
            assert "SECRET_ACCESS" not in row.credentials_encrypted
            assert (
                unseal(app.state.settings, row.credentials_encrypted)["access"] == "SECRET_ACCESS"
            )
        assert all(
            secret not in caplog.text
            for secret in ["SECRET_ACCESS", "SECRET_REFRESH", "SECRET_CODE", "SECRET_CLIENT"]
        )
        assert not fixture.writes


async def test_metadata_discovery_does_not_ingest_unselected_pages(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        conn, _ = await consent(client)
        result = await client.get(f"{BASE}/connections/{conn}/discover", headers=AUTH)
        assert result.json()["data"]["limited"]
        await app.state.collaboration.tick()
        assert not (await client.get(BASE, headers=AUTH)).json()["data"]["documents"]
        assert not any("/blocks/" in r.url.path for r in fixture.calls)
        await select_source(client, conn, DATA, kind="data_source")
        await app.state.collaboration.tick()
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert state["sources"][0]["limited"] and len(state["documents"]) == 1
        assert "text" not in state["documents"][0]


@pytest.mark.parametrize("external_change", ["edited", "moved"])
async def test_approved_create_update_conflict_and_owner_isolation(
    tmp_path: Any, external_change: str
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        _conn, doc, draft = await ready(app, client)
        assert not fixture.writes
        assert (await client.get(f"{BASE}/documents/{doc}", headers=OTHER)).status_code == 404
        assert (await client.get(f"{BASE}/drafts/{draft}", headers=OTHER)).status_code == 404
        execute = f"{BASE}/drafts/{draft}/execute"
        assert (
            await client.post(execute, headers=AUTH, json={"revision": 1, "approved": False})
        ).status_code == 422
        assert (
            await client.post(execute, headers=AUTH, json={"revision": 2, "approved": True})
        ).status_code == 409
        assert not fixture.writes
        result = await client.post(execute, headers=AUTH, json={"revision": 1, "approved": True})
        assert result.status_code == 200, result.text
        assert len(fixture.writes) == 1
        assert (
            await client.post(execute, headers=AUTH, json={"revision": 1, "approved": True})
        ).status_code == 409
        result = await client.put(
            f"{BASE}/drafts/{draft}",
            headers=AUTH,
            json={
                "revision": 1,
                "title": "Edited notes",
                "body": "Checked calibration",
                "operation": "update",
            },
        )
        assert result.status_code == 200, result.text
        if external_change == "edited":
            fixture.block_text = "External collaborator edited this note"
        else:
            fixture.moved = True
        assert (
            await client.post(execute, headers=AUTH, json={"revision": 2, "approved": True})
        ).status_code == 409
        assert len(fixture.writes) == 1
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert state["drafts"][0]["error"] == "write_conflict"


@pytest.mark.parametrize("operation", ["create", "append"])
async def test_published_note_can_update_its_managed_block(tmp_path: Any, operation: str) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        _, _, draft = await ready(app, client)
        result = await client.put(
            f"{BASE}/drafts/{draft}",
            headers=AUTH,
            json={
                "revision": 1,
                "title": "Reviewed",
                "body": "My verified notes",
                "operation": operation,
            },
        )
        assert result.status_code == 200, result.text
        assert (
            await client.post(
                f"{BASE}/drafts/{draft}/execute",
                headers=AUTH,
                json={"revision": 2, "approved": True},
            )
        ).status_code == 200
        assert (
            await client.put(
                f"{BASE}/drafts/{draft}",
                headers=AUTH,
                json={
                    "revision": 2,
                    "title": "Reviewed",
                    "body": "My updated notes",
                    "operation": "update",
                },
            )
        ).status_code == 200
        result = await client.post(
            f"{BASE}/drafts/{draft}/execute", headers=AUTH, json={"revision": 3, "approved": True}
        )
        assert result.status_code == 200, result.text
        assert fixture.block_text.startswith("My updated notes") and len(fixture.writes) == 2


@pytest.mark.parametrize("failure", ["revoked", "changed", "uncertain", "paused"])
async def test_failed_revalidation_and_uncertain_results_never_auto_resend(
    tmp_path: Any, failure: str
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, owner, fixture):
        _, _, draft = await ready(app, client)
        if failure == "revoked":
            fixture.revoked = True
        elif failure == "changed":
            fixture.text = "The source evidence changed"
        elif failure == "uncertain":
            fixture.uncertain = True
        else:
            async with app.state.database.session_factory() as session:
                row = await session.get(Preference, owner)
                row.automations_paused = True
                await session.commit()
        url = f"{BASE}/drafts/{draft}/execute"
        body = {"revision": 1, "approved": True}
        assert (await client.post(url, headers=AUTH, json=body)).status_code in {404, 409}
        count = len(fixture.writes)
        assert count == (1 if failure == "uncertain" else 0)
        assert (await client.post(url, headers=AUTH, json=body)).status_code in {404, 409}
        assert len(fixture.writes) == count
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert all(d["status"] != "executing" for d in state["drafts"])
        if failure == "revoked":
            assert not any(d["sourceUrl"].endswith(PAGE) for d in state["documents"])
        if failure == "uncertain":
            assert state["drafts"][0]["status"] == "uncertain"


async def test_teams_selected_channel_normalizes_without_following_links(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        conn, _ = await consent(client, "teams")
        teams = (await client.get(f"{BASE}/connections/{conn}/discover", headers=AUTH)).json()[
            "data"
        ]
        assert teams["items"][0]["resource_id"] == TEAM
        await select_source(client, conn, CHANNEL, kind="channel")
        await app.state.collaboration.tick()
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert state["sources"][0]["limited"]
        result = await client.get(f"{BASE}/documents/{state['documents'][0]['id']}", headers=AUTH)
        value = result.json()["data"]
        assert value["kind"] == "teams-systemEventMessage" and "Meeting ended" in value["text"]
        assert "secret" not in value["text"] and "tracking" not in value["text"]
        assert value["sourceUrl"].startswith("https://teams.microsoft.com/")
        assert not any(
            r.url.host == "untrusted.invalid" or "/chats/" in r.url.path for r in fixture.calls
        )


@pytest.mark.parametrize(
    "kind,identifier,team,writable",
    [
        ("page", "https://evil.invalid", None, False),
        ("channel", CHANNEL, TEAM, True),
        ("channel", "19:x/attack@thread.tacv2", TEAM, False),
    ],
)
def test_source_locators_reject_arbitrary_urls_and_teams_writes(
    kind: str, identifier: str, team: str | None, writable: bool
) -> None:
    with pytest.raises(ValidationError):
        SourceInput(kind=kind, resource_id=identifier, team_id=team, writable=writable)


async def test_signed_webhook_deduplicates_and_deletion_erases_derived_drafts(
    tmp_path: Any,
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, _fixture):
        conn, doc, _ = await ready(app, client)
        app.state.settings.notion_webhook_verification_token = SecretStr("verification-secret")
        event = {
            "id": str(uuid.uuid4()),
            "workspace_id": WORKSPACE,
            "timestamp": datetime.now(UTC).isoformat(),
            "type": "page.deleted",
            "entity": {"id": PAGE},
        }
        raw = json.dumps(event).encode()
        url = f"{BASE}/webhooks/notion"
        assert (await client.post(url, content=raw)).status_code == 403
        signature = "sha256=" + hmac.new(b"verification-secret", raw, hashlib.sha256).hexdigest()
        for _ in range(2):
            result = await client.post(url, content=raw, headers={"X-Notion-Signature": signature})
            assert result.status_code == 200, result.text
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert not state["drafts"] and not any(d["id"] == doc for d in state["documents"])
        async with app.state.database.session_factory() as session:
            row = await session.get(Connection, uuid.UUID(conn))
            assert row.sync_version == 4  # two selected sources + exactly one signed event


async def test_webhook_bootstrap_requires_operator_and_never_promotes_public_token(
    tmp_path: Any,
) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, _fixture):
        app.state.settings.collaboration_webhook_admin_key = SecretStr("operator-key")
        challenge = "candidate-verification-token"
        assert (
            await client.post(f"{BASE}/webhooks/notion", json={"verification_token": challenge})
        ).status_code == 200
        assert app.state.settings.notion_webhook_verification_token is None
        assert (await client.get(f"{BASE}/webhooks/notion/challenges")).status_code == 403
        result = await client.get(
            f"{BASE}/webhooks/notion/challenges", headers={"X-Webhook-Admin-Key": "operator-key"}
        )
        assert result.json()["data"]["candidates"] == [challenge]
        assert result.headers["cache-control"] == "no-store"


async def test_disconnect_erases_content_and_invalidates_pending_consent(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path) as (app, client, _owner, fixture):
        conn, _doc, draft = await ready(app, client)
        await client.post(f"{BASE}/oauth/notion/start", headers=AUTH)
        result = await client.delete(f"{BASE}/connections/{conn}", headers=AUTH)
        assert result.status_code == 200, result.text
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert not state["sources"] and not state["documents"] and not state["drafts"]
        assert (await client.get(f"{BASE}/drafts/{draft}", headers=AUTH)).status_code == 404
        assert not fixture.writes


async def test_disconnect_during_token_exchange_cannot_reconnect(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path) as (_app, client, _owner, fixture):
        conn, _ = await consent(client)
        response = await client.post(f"{BASE}/oauth/notion/start", headers=AUTH)
        state = parse_qs(urlsplit(response.json()["data"]["authorizationUrl"]).query)["state"][0]
        fixture.hold_token = True
        callback = asyncio.create_task(
            client.get(
                f"{BASE}/oauth/notion/callback", params={"state": state, "code": "SECRET_CODE"}
            )
        )
        await asyncio.wait_for(fixture.token_started.wait(), 10)
        assert (await client.delete(f"{BASE}/connections/{conn}", headers=AUTH)).status_code == 200
        fixture.token_release.set()
        assert (await callback).headers["location"].endswith("consent=failed")
        assert (await client.get(BASE, headers=AUTH)).json()["data"]["connections"][0][
            "status"
        ] == "disconnected"


@pytest.mark.skipif(
    not os.getenv("TEST_NOTIFICATION_DATABASE_URL"), reason="Ephemeral PostgreSQL required"
)
async def test_postgres_concurrent_approval_is_single_attempt(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path, os.environ["TEST_NOTIFICATION_DATABASE_URL"]) as (
        app,
        client,
        _owner,
        fixture,
    ):
        _, _, draft = await ready(app, client)
        fixture.hold_write = True
        url = f"{BASE}/drafts/{draft}/execute"
        body = {"revision": 1, "approved": True}
        first = asyncio.create_task(client.post(url, headers=AUTH, json=body))
        await asyncio.wait_for(fixture.write_started.wait(), 10)
        second = await client.post(url, headers=AUTH, json=body)
        fixture.write_release.set()
        assert (await first).status_code == 200
        assert second.status_code == 409 and len(fixture.writes) == 1


@pytest.mark.skipif(
    not os.getenv("TEST_NOTIFICATION_DATABASE_URL"), reason="Ephemeral PostgreSQL required"
)
async def test_postgres_worker_claim_does_not_overlap(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path, os.environ["TEST_NOTIFICATION_DATABASE_URL"]) as (
        app,
        client,
        _owner,
        fixture,
    ):
        conn, _ = await consent(client)
        await select_source(client, conn)
        runtime = app.state.collaboration
        original = runtime.provider.read
        started, release = asyncio.Event(), asyncio.Event()

        async def held_read(*args: Any, **kwargs: Any) -> Any:
            started.set()
            await release.wait()
            return await original(*args, **kwargs)

        runtime.provider.read = held_read
        first = asyncio.create_task(runtime.tick())
        await asyncio.wait_for(started.wait(), 10)
        try:
            assert await runtime.tick() == {"synced": 0, "failed": 0}
        finally:
            release.set()
        assert await first == {"synced": 1, "failed": 0}
        assert sum(r.url.path == f"/v1/blocks/{PAGE}/children" for r in fixture.calls) == 1


@pytest.mark.skipif(
    not os.getenv("TEST_NOTIFICATION_DATABASE_URL"), reason="Ephemeral PostgreSQL required"
)
async def test_postgres_disconnect_during_read_does_not_restore_copies(tmp_path: Any) -> None:
    async with collaboration_setup(tmp_path, os.environ["TEST_NOTIFICATION_DATABASE_URL"]) as (
        app,
        client,
        _owner,
        _fixture,
    ):
        conn, _ = await consent(client)
        source = await select_source(client, conn)
        runtime = app.state.collaboration
        original = runtime.provider.read
        started, release = asyncio.Event(), asyncio.Event()

        async def held_read(*args: Any, **kwargs: Any) -> Any:
            result = await original(*args, **kwargs)
            started.set()
            await release.wait()
            return result

        runtime.provider.read = held_read
        reading = asyncio.create_task(runtime.refresh_source(uuid.UUID(source)))
        await asyncio.wait_for(started.wait(), 10)
        try:
            assert (
                await client.delete(f"{BASE}/connections/{conn}", headers=AUTH)
            ).status_code == 200
        finally:
            release.set()
        with pytest.raises(CalendarFailure):
            await reading
        state = (await client.get(BASE, headers=AUTH)).json()["data"]
        assert not state["documents"] and not state["sources"]
