from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from nexus_api.config import Settings
from nexus_api.identity import AuthenticatedPrincipal, FakeIdentityVerifier
from nexus_api.main import create_app

USER_A = AuthenticatedPrincipal(
    provider="firebase",
    subject="firebase-user-a",
    email="aadi@example.test",
    email_verified=True,
    display_name="Aadi Sharma",
    auth_time=datetime(2026, 7, 28, 8, 0, tzinfo=UTC),
)
USER_B = AuthenticatedPrincipal(
    provider="firebase",
    subject="firebase-user-b",
    email="maya@example.test",
    email_verified=True,
    display_name="Maya Rao",
    auth_time=datetime(2026, 7, 28, 8, 5, tzinfo=UTC),
)


@pytest.fixture
def client_factory(
    tmp_path: Path,
) -> Callable[[], Any]:
    counter = 0

    @asynccontextmanager
    async def create() -> AsyncIterator[AsyncClient]:
        nonlocal counter
        counter += 1
        database_path = (tmp_path / f"nexus-test-{counter}.db").as_posix()
        settings = Settings(
            app_env="test",
            database_url=f"sqlite+aiosqlite:///{database_path}",
            migration_database_url=f"sqlite+aiosqlite:///{database_path}",
            cors_allowed_origins="http://localhost:3000",
            auto_create_test_schema=True,
        )
        app = create_app(
            settings,
            FakeIdentityVerifier({"token-a": USER_A, "token-b": USER_B}),
        )
        async with app.router.lifespan_context(app):
            transport = ASGITransport(app=app, raise_app_exceptions=False)
            async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                yield client

    return create


def auth(token: str = "token-a") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def onboarding_payload(
    *,
    name: str = "Aadi Sharma",
    timezone: str = "Asia/Kolkata",
) -> dict[str, Any]:
    return {
        "profile": {
            "displayName": name,
            "timezone": timezone,
            "locale": "en-IN",
        },
        "places": [
            {
                "label": "Home",
                "address": "Koramangala, Bengaluru",
                "role": "home",
                "travelMode": "transit",
                "isDefaultOrigin": True,
            }
        ],
        "preferences": {
            "notifications": {
                "style": "balanced",
                "inApp": True,
                "emailDigest": False,
                "devicePush": False,
                "morningBriefAt": "07:30",
                "eveningBriefAt": "20:30",
                "quietHours": {
                    "enabled": True,
                    "startsAt": "22:30",
                    "endsAt": "07:00",
                },
            },
            "personalization": {
                "conciseExplanations": True,
                "learnFromFeedback": True,
                "preferredTravelMode": "transit",
            },
            "privacy": {
                "observationPaused": False,
                "automationsPaused": False,
                "defaultRetention": "30-days",
                "futureModelUse": "allowed-for-purpose",
            },
            "accessibility": {
                "reducedMotion": False,
                "highContrast": False,
                "largerText": False,
            },
        },
    }


@pytest.mark.asyncio
async def test_health_liveness_and_readiness(client_factory: Callable[[], Any]) -> None:
    async with client_factory() as client:
        live = await client.get("/health/live")
        ready = await client.get("/health/ready")
    assert live.status_code == 200
    assert live.json()["data"]["status"] == "live"
    assert ready.status_code == 200
    assert ready.json()["data"]["status"] == "ready"
    assert live.headers["x-request-id"]


@pytest.mark.asyncio
async def test_authentication_fails_safely(client_factory: Callable[[], Any]) -> None:
    async with client_factory() as client:
        missing = await client.get("/api/v1/me")
        malformed = await client.get("/api/v1/me", headers={"Authorization": "Basic ignored"})
        invalid = await client.get("/api/v1/me", headers=auth("bad-token"))
    assert missing.status_code == 401
    assert malformed.status_code == 401
    assert invalid.status_code == 401
    assert invalid.json()["error"]["code"] == "invalid_identity_token"
    assert invalid.json()["error"]["requestId"]


def test_production_rejects_missing_config_and_fake_auth() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production", cors_allowed_origins="https://nexus.example")

    production = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://nexus:secret@db/nexus",
        migration_database_url="postgresql+asyncpg://nexus:secret@db/nexus",
        cors_allowed_origins="https://nexus.example",
        firebase_project_id="nexus-production",
        firebase_service_account_json_b64="e30=",
    )
    with pytest.raises(ValueError, match="forbidden"):
        create_app(production, FakeIdentityVerifier({"token-a": USER_A}))


@pytest.mark.asyncio
async def test_first_login_user_creation_is_idempotent(
    client_factory: Callable[[], Any],
) -> None:
    async with client_factory() as client:
        first = await client.get("/api/v1/me", headers=auth())
        second = await client.get("/api/v1/me", headers=auth())
    assert first.status_code == 200
    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert first.json()["data"]["onboardingCompleted"] is False


@pytest.mark.asyncio
async def test_onboarding_profile_and_preferences_persist(
    client_factory: Callable[[], Any],
) -> None:
    async with client_factory() as client:
        completed = await client.post(
            "/api/v1/onboarding/complete",
            headers=auth(),
            json=onboarding_payload(),
        )
        profile = await client.get("/api/v1/profile", headers=auth())
        preferences = await client.get("/api/v1/preferences", headers=auth())
        places = await client.get("/api/v1/places", headers=auth())
        me = await client.get("/api/v1/me", headers=auth())
    assert completed.status_code == 200
    assert profile.json()["data"]["timezone"] == "Asia/Kolkata"
    assert preferences.json()["data"]["personalization"]["preferredTravelMode"] == "transit"
    assert preferences.json()["data"]["notifications"]["quietHours"] == {
        "enabled": True,
        "startsAt": "22:30:00",
        "endsAt": "07:00:00",
    }
    assert places.json()["data"][0]["label"] == "Home"
    assert me.json()["data"]["onboardingCompleted"] is True


@pytest.mark.asyncio
async def test_timezone_validation_uses_iana_names(
    client_factory: Callable[[], Any],
) -> None:
    payload = onboarding_payload(timezone="IST")
    async with client_factory() as client:
        response = await client.post("/api/v1/onboarding/complete", headers=auth(), json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.asyncio
async def test_quiet_hours_can_span_midnight(client_factory: Callable[[], Any]) -> None:
    payload = onboarding_payload()
    payload["preferences"]["notifications"]["quietHours"] = {
        "enabled": True,
        "startsAt": "23:15",
        "endsAt": "06:45",
    }
    async with client_factory() as client:
        response = await client.post("/api/v1/onboarding/complete", headers=auth(), json=payload)
    assert response.status_code == 200
    quiet = response.json()["data"]["preferences"]["notifications"]["quietHours"]
    assert quiet["startsAt"] == "23:15:00"
    assert quiet["endsAt"] == "06:45:00"


@pytest.mark.asyncio
async def test_place_ownership_blocks_cross_user_access(
    client_factory: Callable[[], Any],
) -> None:
    async with client_factory() as client:
        created = await client.post(
            "/api/v1/places",
            headers=auth("token-a"),
            json={
                "label": "Campus",
                "address": "North campus",
                "role": "campus",
                "travelMode": "walk",
            },
        )
        place_id = created.json()["data"]["id"]
        attempted = await client.put(
            f"/api/v1/places/{place_id}",
            headers=auth("token-b"),
            json={
                "label": "Changed",
                "address": "Unknown",
                "role": "other",
                "travelMode": "drive",
            },
        )
        owner = await client.get("/api/v1/places", headers=auth("token-a"))
        other = await client.get("/api/v1/places", headers=auth("token-b"))
    assert attempted.status_code == 404
    assert owner.json()["data"][0]["label"] == "Campus"
    assert other.json()["data"] == []


@pytest.mark.asyncio
async def test_profiles_are_derived_from_authenticated_user(
    client_factory: Callable[[], Any],
) -> None:
    async with client_factory() as client:
        await client.post(
            "/api/v1/onboarding/complete",
            headers=auth("token-a"),
            json=onboarding_payload(name="Aadi Sharma"),
        )
        await client.post(
            "/api/v1/onboarding/complete",
            headers=auth("token-b"),
            json=onboarding_payload(name="Maya Rao"),
        )
        a = await client.get("/api/v1/profile", headers=auth("token-a"))
        b = await client.get("/api/v1/profile", headers=auth("token-b"))
    assert a.json()["data"]["displayName"] == "Aadi Sharma"
    assert b.json()["data"]["displayName"] == "Maya Rao"


@pytest.mark.asyncio
async def test_quick_capture_note_persists_without_logging_content(
    client_factory: Callable[[], Any],
) -> None:
    private_text = "Synthetic private capture that must never appear in audit."
    payload = {
        "title": "Lecture reminder",
        "rawText": private_text,
        "sourceLabel": "WhatsApp",
        "canonicalFields": {"tags": ["networks"]},
        "idempotencyKey": "capture-note-0001",
    }
    async with client_factory() as client:
        created = await client.post("/api/v1/captures/notes", headers=auth(), json=payload)
        captures = await client.get("/api/v1/captures?kind=note", headers=auth())
        activity = await client.get("/api/v1/activity", headers=auth())
    assert created.status_code == 201
    assert captures.json()["data"][0]["rawText"] == private_text
    assert private_text not in activity.text
    capture_audit = next(
        event
        for event in activity.json()["data"]
        if event["eventType"] == "quick_capture.note_created"
    )
    assert capture_audit["changedFields"] == [
        "canonical_fields",
        "kind",
        "source_label",
    ]


@pytest.mark.asyncio
async def test_local_event_draft_persists_with_honest_kind(
    client_factory: Callable[[], Any],
) -> None:
    payload = {
        "title": "Project review",
        "rawText": "Project review on 2026-08-03 at 14:30.",
        "sourceLabel": "Teams",
        "canonicalFields": {
            "date": "2026-08-03",
            "startTime": "14:30",
            "endTime": "15:00",
            "location": "Studio 2",
            "timezone": "Asia/Kolkata",
        },
        "idempotencyKey": "capture-event-0001",
    }
    async with client_factory() as client:
        created = await client.post(
            "/api/v1/captures/local-event-drafts", headers=auth(), json=payload
        )
        captures = await client.get("/api/v1/captures?kind=local-event-draft", headers=auth())
    assert created.status_code == 201
    assert captures.json()["data"][0]["kind"] == "local-event-draft"
    assert "Google Calendar" not in created.text


@pytest.mark.asyncio
async def test_repeated_capture_confirmation_is_idempotent(
    client_factory: Callable[[], Any],
) -> None:
    payload = {
        "title": "Idempotent note",
        "rawText": "Only one durable record should exist.",
        "canonicalFields": {},
        "idempotencyKey": "capture-note-idempotent",
    }
    async with client_factory() as client:
        first = await client.post("/api/v1/captures/notes", headers=auth(), json=payload)
        second = await client.post("/api/v1/captures/notes", headers=auth(), json=payload)
        listed = await client.get("/api/v1/captures?kind=note", headers=auth())
    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert len(listed.json()["data"]) == 1


@pytest.mark.asyncio
async def test_capture_correction_and_deletion_are_owner_scoped(
    client_factory: Callable[[], Any],
) -> None:
    payload = {
        "title": "Draft note",
        "rawText": "Correct me.",
        "canonicalFields": {},
        "idempotencyKey": "capture-note-correct-delete",
    }
    async with client_factory() as client:
        created = await client.post("/api/v1/captures/notes", headers=auth("token-a"), json=payload)
        capture_id = created.json()["data"]["id"]
        cross_user = await client.patch(
            f"/api/v1/captures/{capture_id}",
            headers=auth("token-b"),
            json={"title": "Stolen"},
        )
        corrected = await client.patch(
            f"/api/v1/captures/{capture_id}",
            headers=auth("token-a"),
            json={"title": "Corrected note"},
        )
        deleted = await client.delete(f"/api/v1/captures/{capture_id}", headers=auth("token-a"))
        missing = await client.get(f"/api/v1/captures/{capture_id}", headers=auth("token-a"))
    assert cross_user.status_code == 404
    assert corrected.json()["data"]["status"] == "corrected"
    assert deleted.status_code == 204
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_invalid_event_date_and_time_fail_consistently(
    client_factory: Callable[[], Any],
) -> None:
    payload = {
        "title": "Ambiguous meeting",
        "rawText": "Meeting on 03/08/2026.",
        "canonicalFields": {
            "date": "03/08/2026",
            "startTime": "16:00",
            "endTime": "15:00",
        },
        "idempotencyKey": "capture-event-invalid",
    }
    async with client_factory() as client:
        response = await client.post(
            "/api/v1/captures/local-event-drafts", headers=auth(), json=payload
        )
    assert response.status_code == 422
    assert response.json()["error"]["message"] == ("Review the submitted fields and try again.")
