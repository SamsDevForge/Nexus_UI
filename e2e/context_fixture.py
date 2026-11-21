"""Test-only provider fixture behind the real FastAPI application and Next bridge."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import FastAPI

from nexus_api.config import Settings
from nexus_api.main import create_app
from nexus_api.public_context import PublicContextService

if os.environ.get("NEXUS_E2E") != "1":
    raise RuntimeError("The fixture may run only with NEXUS_E2E=1.")


def provider(request: httpx.Request) -> httpx.Response:
    if request.url.host == "geocoding-api.open-meteo.com":
        name = request.url.params.get("name", "")
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "name": name,
                        "latitude": 12.9,
                        "longitude": 77.6,
                        "country": "Test fixture",
                        "timezone": "Asia/Kolkata",
                    }
                ]
            },
        )
    if request.url.host == "routes.test" or request.url.params.get("latitude") == "0.0":
        return httpx.Response(503)
    start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return httpx.Response(
        200,
        json={
            "hourly": {
                "time": [int((start + timedelta(hours=i)).timestamp()) for i in range(168)],
                "temperature_2m": [24] * 168,
                "precipitation_probability": [65] * 168,
            }
        },
    )


app = create_app(Settings(app_env="test", public_context_enabled=True, database_url=None))
original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def fixture_lifespan(application: FastAPI) -> AsyncIterator[None]:
    async with original_lifespan(application):
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            application.state.public_context = PublicContextService(client, "https://routes.test")
            yield


app.router.lifespan_context = fixture_lifespan
