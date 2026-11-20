from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from fastapi import Request
from pydantic import ValidationError

from nexus_api.config import Settings
from nexus_api.errors import ApiError
from nexus_api.main import create_app
from nexus_api.public_context import CommuteInput, PublicContextService, context_access

NOW = datetime(2026, 11, 20, 0, tzinfo=UTC)


def entry(**changes: Any) -> CommuteInput:
    return CommuteInput.model_validate(
        {
            "origin": {"latitude": 12.9, "longitude": 77.6},
            "destination": {"latitude": 13.0, "longitude": 77.7},
            "event_at": "2026-11-20T10:00:00+05:30",
            "travel_minutes": 35,
            "preparation_minutes": 15,
            "arrival_buffer_minutes": 10,
            **changes,
        }
    )


def weather(rain: float = 20) -> dict[str, Any]:
    times = [int((NOW + timedelta(hours=i)).timestamp()) for i in range(24)]
    return {
        "hourly": {
            "time": times,
            "precipitation_probability": [rain] * 24,
            "temperature_2m": [25] * 24,
        }
    }


@pytest.mark.asyncio
async def test_correct_time_arithmetic_and_rain_only_during_commute() -> None:
    payload = weather()
    payload["hourly"]["precipitation_probability"][12] = 100
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json=payload))
    ) as client:
        result = await PublicContextService(client).plan(entry(), NOW)
    assert result["leave_at"] == "2026-11-20T03:45:00+00:00"
    assert result["prepare_at"] == "2026-11-20T03:30:00+00:00"
    assert result["arrive_at"] == "2026-11-20T04:20:00+00:00"
    assert result["rain_probability_percent"] == 20
    assert "below the reminder" in result["umbrella_advice"]
    assert result["traffic_available"] is False and result["calendar_changed"] is False
    assert result["authority"] == "suggest"


@pytest.mark.asyncio
async def test_rain_forecast_and_day_boundary_are_explicit() -> None:
    payload = weather(65)
    payload["hourly"]["time"] = [t - 3600 for t in payload["hourly"]["time"]]
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json=payload))
    ) as client:
        result = await PublicContextService(client).plan(
            entry(event_at=NOW + timedelta(minutes=20)), NOW
        )
    assert result["late"] and result["preparation_due"]
    assert result["leave_at"].startswith("2026-11-19")
    assert result["umbrella_advice"] == "Consider an umbrella."


@pytest.mark.asyncio
async def test_missing_hour_in_travel_window_is_not_complete_weather() -> None:
    payload = weather(20)
    for values in payload["hourly"].values():
        values.pop(3)
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json=payload))
    ) as client:
        result = await PublicContextService(client).plan(entry(travel_minutes=120), NOW)
    assert not result["origin_weather"]["available"]
    assert result["rain_probability_percent"] is None


@pytest.mark.asyncio
async def test_partial_weather_failure_never_becomes_dry_weather() -> None:
    def provider(request: httpx.Request) -> httpx.Response:
        return (
            httpx.Response(503)
            if request.url.params["latitude"] == "12.9"
            else httpx.Response(200, json=weather(5))
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
        result = await PublicContextService(client).plan(entry(), NOW)
    assert not result["origin_weather"]["available"]
    assert result["destination_weather"]["available"]
    assert result["umbrella_advice"] == "Weather advice unavailable."
    assert result["warnings"]


@pytest.mark.asyncio
async def test_timeout_and_malformed_forecasts_remain_unavailable() -> None:
    for payload in [
        {},
        {"hourly": {"time": [0], "temperature_2m": [], "precipitation_probability": []}},
    ]:
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda _, value=payload: httpx.Response(200, json=value))
        ) as client:
            result = await PublicContextService(client).plan(entry(), NOW)
        assert result["rain_probability_percent"] is None
        assert not result["origin_weather"]["available"]

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Provider timed out", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(timeout)) as client:
        result = await PublicContextService(client).plan(entry(), NOW)
    assert result["rain_probability_percent"] is None
    assert not result["destination_weather"]["available"]


@pytest.mark.asyncio
async def test_nonfinite_route_duration_uses_manual_fallback() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(200, json={"code": "Ok", "routes": [{"duration": "Infinity"}]})
        )
    ) as client:
        result = await PublicContextService(client, "https://routes.test").plan(
            entry(use_driving_estimate=True), NOW
        )
    assert result["travel_minutes"] == 35
    assert "unavailable" in result["warnings"][0]


@pytest.mark.asyncio
async def test_driving_estimate_uses_lon_lat_and_does_not_claim_traffic() -> None:
    def provider(request: httpx.Request) -> httpx.Response:
        if request.url.host == "routes.test":
            assert "77.6,12.9;77.7,13.0" in str(request.url)
            return httpx.Response(200, json={"code": "Ok", "routes": [{"duration": 1201}]})
        return httpx.Response(200, json=weather())

    async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
        result = await PublicContextService(client, "https://routes.test").plan(
            entry(use_driving_estimate=True), NOW
        )
    assert result["travel_minutes"] == 21
    assert result["route_source"] == "OSRM driving estimate; no live traffic"


@pytest.mark.asyncio
async def test_route_failure_uses_only_explicit_fallback() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(503))
    ) as client:
        service = PublicContextService(client, "https://routes.test")
        result = await service.plan(entry(use_driving_estimate=True), NOW)
        assert result["travel_minutes"] == 35 and result["warnings"]
        with pytest.raises(ApiError, match="fallback"):
            await service.plan(entry(use_driving_estimate=True, travel_minutes=None), NOW)


@pytest.mark.asyncio
async def test_provider_cache_retains_retrieval_time_and_deduplicates() -> None:
    calls = 0

    def provider(_: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, json=weather())

    async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
        service = PublicContextService(client)
        query = entry(destination={"latitude": 12.9, "longitude": 77.6})
        first = await service.plan(query, NOW)
        second = await service.plan(query, NOW)
    assert calls == 1
    assert first["origin_weather"]["fetched_at"] == second["origin_weather"]["fetched_at"]


@pytest.mark.asyncio
async def test_location_search_normalizes_empty_and_failure_states() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={}))
    ) as client:
        assert await PublicContextService(client).search("Bengaluru") == []
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(503))
    ) as client:
        with pytest.raises(ApiError, match="unavailable"):
            await PublicContextService(client).search("Bengaluru")


@pytest.mark.parametrize(
    "changes",
    [
        {"origin": {"latitude": 91, "longitude": 77}},
        {"travel_minutes": 0},
        {"travel_minutes": True},
        {"event_at": "2026-11-20T10:00:00"},
        {"surprise": 1},
    ],
)
def test_invalid_inputs_rejected(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        entry(**changes)


@pytest.mark.asyncio
async def test_api_is_disabled_by_default_and_returns_request_envelope() -> None:
    app = create_app(Settings(app_env="test"))
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client,
    ):
        disabled = await client.post("/api/public-context/search", json={"query": "London"})
        assert disabled.status_code == 503
        app.state.settings.public_context_enabled = True
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(
                lambda _: httpx.Response(
                    200, json={"results": [{"name": "London", "latitude": 51.5, "longitude": -0.1}]}
                )
            )
        ) as upstream:
            app.state.public_context = PublicContextService(upstream)
            response = await client.post("/api/public-context/search", json={"query": "London"})
        assert response.status_code == 200 and response.json()["data"][0]["name"] == "London"
        assert response.json()["requestId"]


@pytest.mark.asyncio
async def test_production_context_never_skips_identity() -> None:
    request = Request(
        {
            "type": "http",
            "headers": [],
            "app": SimpleNamespace(
                state=SimpleNamespace(
                    settings=SimpleNamespace(public_context_enabled=True, app_env="production")
                )
            ),
        }
    )
    with pytest.raises(ApiError) as error:
        await context_access(request)
    assert error.value.status_code == 401
