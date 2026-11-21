"""Public-source context and deterministic commute planning; no autonomous actions."""

from __future__ import annotations

import asyncio
import math
import time
from collections import OrderedDict
from datetime import UTC, datetime, timedelta
from itertools import pairwise
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from .api import authenticate, envelope
from .errors import ApiError

router = APIRouter(prefix="/api/public-context", tags=["Public context"])
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")
    latitude: Number = Field(ge=-90, le=90)
    longitude: Number = Field(ge=-180, le=180)


class PlaceSearch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    query: str = Field(min_length=3, max_length=80)


class CommuteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origin: Point
    destination: Point
    event_at: AwareDatetime
    travel_minutes: int | None = Field(default=None, ge=1, le=1440, strict=True)
    preparation_minutes: int = Field(default=15, ge=0, le=240, strict=True)
    arrival_buffer_minutes: int = Field(default=10, ge=0, le=180, strict=True)
    use_driving_estimate: bool = False


async def context_access(request: Request) -> None:
    settings = request.app.state.settings
    if not settings.public_context_enabled:
        raise ApiError(503, "context_disabled", "Live context is not enabled on this server.")
    if settings.app_env == "production":
        if not request.headers.get("authorization", "").startswith("Bearer "):
            raise ApiError(401, "authentication_required", "Sign in to use live context.")
        async for session in request.app.state.database.session():
            await authenticate(request, session, request.headers.get("authorization"))


class PublicContextService:
    def __init__(self, client: httpx.AsyncClient, osrm_base_url: str | None = None) -> None:
        self.client = client
        self.osrm_base_url = osrm_base_url
        self.cache: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self.inflight: dict[str, asyncio.Task[Any]] = {}

    async def fetch(self, url: str, params: dict[str, Any]) -> Any:
        key = str(httpx.URL(url, params=params))
        cached = self.cache.get(key)
        if cached and cached[0] > time.monotonic():
            self.cache.move_to_end(key)
            return cached[1]
        task = self.inflight.get(key)
        if task is None:

            async def load() -> Any:
                response = await self.client.get(url, params=params)
                response.raise_for_status()
                if len(response.content) > 1_000_000:
                    raise ValueError("Provider response too large")
                result = response.json()
                if not isinstance(result, dict):
                    raise ValueError("Invalid provider response")
                result["_nexus_fetched_at"] = datetime.now(UTC).isoformat()
                self.cache[key] = (time.monotonic() + 300, result)
                self.cache.move_to_end(key)
                while len(self.cache) > 128:
                    self.cache.popitem(last=False)
                return result

            task = asyncio.create_task(load())
            self.inflight[key] = task

            def finished(done: asyncio.Task[Any]) -> None:
                self.inflight.pop(key, None)
                if not done.cancelled():
                    done.exception()

            task.add_done_callback(finished)
        try:
            return await asyncio.shield(task)
        finally:
            if task.done():
                self.inflight.pop(key, None)

    async def search(self, query: str) -> list[dict[str, Any]]:
        try:
            result = await self.fetch(
                "https://geocoding-api.open-meteo.com/v1/search",
                {
                    "name": query.strip(),
                    "count": 5,
                    "language": "en",
                    "format": "json",
                },
            )
            places = []
            for item in result.get("results", [])[:5]:
                point = Point(latitude=item["latitude"], longitude=item["longitude"])
                places.append(
                    {
                        **point.model_dump(),
                        "name": item["name"],
                        "region": item.get("admin1"),
                        "country": item.get("country"),
                        "timezone": item.get("timezone"),
                        "source": "Open-Meteo / GeoNames",
                    }
                )
            return places
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError) as error:
            raise ApiError(
                502, "geocoding_unavailable", "Location search is unavailable. Try again."
            ) from error

    async def route(self, plan: CommuteInput) -> tuple[int, str, str | None]:
        warning: str | None
        if plan.use_driving_estimate and self.osrm_base_url:
            coordinates = (
                f"{plan.origin.longitude},{plan.origin.latitude};"
                f"{plan.destination.longitude},{plan.destination.latitude}"
            )
            try:
                payload = await self.fetch(
                    f"{self.osrm_base_url.rstrip('/')}/route/v1/driving/{coordinates}",
                    {"overview": "false", "steps": "false"},
                )
                duration = payload["routes"][0]["duration"]
                if payload.get("code") != "Ok" or isinstance(duration, bool):
                    raise ValueError("No route")
                seconds = float(duration)
                if not math.isfinite(seconds):
                    raise ValueError("Invalid duration")
                minutes = math.ceil(seconds / 60)
                if not 1 <= minutes <= 1440:
                    raise ValueError("Invalid duration")
                return minutes, "OSRM driving estimate; no live traffic", None
            except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
                warning = "Driving estimate unavailable; using your entered journey time."
        else:
            warning = (
                "Driving estimates are not configured; using your entered journey time."
                if plan.use_driving_estimate
                else None
            )
        if plan.travel_minutes is None:
            raise ApiError(422, "journey_time_required", "Enter a journey time as a fallback.")
        return plan.travel_minutes, "User-entered journey time; no live traffic", warning

    async def forecast(self, point: Point, start: datetime, end: datetime) -> dict[str, Any]:
        try:
            payload = await self.fetch(
                "https://api.open-meteo.com/v1/forecast",
                {
                    "latitude": round(point.latitude, 4),
                    "longitude": round(point.longitude, 4),
                    "hourly": "temperature_2m,precipitation_probability",
                    "timezone": "GMT",
                    "timeformat": "unixtime",
                    "forecast_days": 8,
                    "past_days": 2,
                },
            )
            hourly = payload["hourly"]
            times, rain, temperatures = (
                hourly["time"],
                hourly["precipitation_probability"],
                hourly["temperature_2m"],
            )
            if not (len(times) == len(rain) == len(temperatures)) or len(times) > 300:
                raise ValueError("Invalid forecast arrays")
            if any(
                not isinstance(instant, int | float)
                or isinstance(instant, bool)
                or not math.isfinite(instant)
                for instant in times
            ):
                raise ValueError("Invalid forecast timestamps")
            # Include the hourly intervals that overlap the actual commute, not the full day.
            samples = [
                (instant, r, t)
                for instant, r, t in zip(times, rain, temperatures, strict=True)
                if start.timestamp() < instant + 3600 and instant < end.timestamp()
            ]
            if (
                not samples
                or samples[0][0] > start.timestamp()
                or samples[-1][0] + 3600 < end.timestamp()
                or any(b[0] - a[0] != 3600 for a, b in pairwise(samples))
            ):
                raise ValueError("Forecast does not cover the entire travel window")
            valid_rain = [
                float(r)
                for _, r, _ in samples
                if isinstance(r, int | float)
                and not isinstance(r, bool)
                and math.isfinite(r)
                and 0 <= r <= 100
            ]
            valid_temp = [
                float(t)
                for _, _, t in samples
                if isinstance(t, int | float)
                and not isinstance(t, bool)
                and math.isfinite(t)
                and -100 <= t <= 70
            ]
            if len(valid_rain) != len(samples) or len(valid_temp) != len(samples):
                raise ValueError("No usable forecast for travel window")
            return {
                "available": True,
                "provider": "Open-Meteo",
                "kind": "forecast",
                "fetched_at": payload["_nexus_fetched_at"],
                "fresh_until": (
                    datetime.fromisoformat(payload["_nexus_fetched_at"]) + timedelta(minutes=5)
                ).isoformat(),
                "rain_probability_percent": max(valid_rain),
                "temperature_c": round(sum(valid_temp) / len(valid_temp), 1),
                "window_start": start.isoformat(),
                "window_end": end.isoformat(),
                "message": None,
            }
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
            return {
                "available": False,
                "provider": "Open-Meteo",
                "kind": "forecast",
                "rain_probability_percent": None,
                "temperature_c": None,
                "message": "No usable weather forecast for this travel window.",
            }

    async def plan(self, entry: CommuteInput, now: datetime | None = None) -> dict[str, Any]:
        now = now or datetime.now(UTC)
        event_at = entry.event_at.astimezone(UTC)
        if not now < event_at <= now + timedelta(days=7):
            raise ApiError(
                422, "event_outside_window", "Choose an event within the next seven days."
            )
        minutes, route_source, warning = await self.route(entry)
        arrive_at = event_at - timedelta(minutes=entry.arrival_buffer_minutes)
        leave_at = arrive_at - timedelta(minutes=minutes)
        prepare_at = leave_at - timedelta(minutes=entry.preparation_minutes)
        # Weather across both ends of the journey provides context, not path-wide coverage.
        origin_weather, destination_weather = await asyncio.gather(
            self.forecast(entry.origin, leave_at, arrive_at),
            self.forecast(entry.destination, leave_at, arrive_at),
        )
        forecasts = [f for f in [origin_weather, destination_weather] if f["available"]]
        max_rain = max((f["rain_probability_percent"] for f in forecasts), default=None)
        weather_complete = len(forecasts) == 2
        return {
            "event_at": event_at.isoformat(),
            "arrive_at": arrive_at.isoformat(),
            "leave_at": leave_at.isoformat(),
            "prepare_at": prepare_at.isoformat(),
            "travel_minutes": minutes,
            "preparation_minutes": entry.preparation_minutes,
            "arrival_buffer_minutes": entry.arrival_buffer_minutes,
            "route_source": route_source,
            "traffic_available": False,
            "origin_weather": origin_weather,
            "destination_weather": destination_weather,
            "rain_probability_percent": max_rain,
            "umbrella_advice": "Consider an umbrella."
            if max_rain is not None and max_rain >= 40
            else "Weather advice unavailable."
            if not weather_complete
            else "Rain probability is below the reminder threshold; rain remains possible.",
            "late": leave_at < now,
            "preparation_due": prepare_at < now,
            "warnings": ([warning] if warning else [])
            + (
                []
                if weather_complete
                else ["Weather coverage is incomplete. Check conditions before travelling."]
            ),
            "calculated_at": now.isoformat(),
            "refresh_after": min(
                (f["fresh_until"] for f in forecasts),
                default=(now + timedelta(minutes=5)).isoformat(),
            ),
            "authority": "suggest",
            "calendar_changed": False,
            "explanation": "Event time minus "
            f"{entry.arrival_buffer_minutes} minutes arrival buffer, "
            f"{minutes} minutes journey, and {entry.preparation_minutes} minutes preparation. "
            "Weather is a forecast at your origin and destination; "
            "it does not establish road conditions.",
        }


@router.post("/search", dependencies=[Depends(context_access)])
async def search_places(body: PlaceSearch, request: Request) -> dict[str, Any]:
    service: PublicContextService = request.app.state.public_context
    return envelope(request, await service.search(body.query))


@router.post("/plan", dependencies=[Depends(context_access)])
async def commute_plan(body: CommuteInput, request: Request) -> dict[str, Any]:
    service: PublicContextService = request.app.state.public_context
    return envelope(request, await service.plan(body))
