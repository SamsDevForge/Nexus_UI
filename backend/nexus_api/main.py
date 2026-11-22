from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import api_router, health_router
from .calendar_api import router as calendar_router
from .calendar_boundary import CalendarBoundary
from .calendar_provider import CalendarFailure, CalendarProvider
from .collaboration_api import router as collaboration_router
from .collaboration_provider import CollaborationProvider
from .collaboration_service import CollaborationService
from .config import Settings, get_settings
from .db import Database
from .errors import ApiError
from .identity import (
    FirebaseIdentityVerifier,
    IdentityUnavailableError,
    IdentityVerifier,
    UnavailableIdentityVerifier,
)
from .mail_api import router as mail_router
from .mail_provider import MailProvider
from .notification_api import router as notification_router
from .public_context import PublicContextService
from .public_context import router as context_router


def error_payload(request: Request, code: str, message: str) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "requestId": str(getattr(request.state, "request_id", "unknown")),
        }
    }


def create_app(
    settings: Settings | None = None,
    identity_verifier: IdentityVerifier | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    if settings.app_env == "production" and identity_verifier is not None:
        from .identity import FakeIdentityVerifier

        if isinstance(identity_verifier, FakeIdentityVerifier):
            raise ValueError("Fake identity verification is forbidden in production.")

    database = Database(settings)
    if identity_verifier is None:
        try:
            identity_verifier = FirebaseIdentityVerifier(settings)
        except IdentityUnavailableError:
            identity_verifier = UnavailableIdentityVerifier()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await database.start()
        client = httpx.AsyncClient(timeout=6, follow_redirects=False)
        app.state.public_context = PublicContextService(client, settings.osrm_base_url)
        app.state.calendar_provider = CalendarProvider(settings)
        app.state.mail_provider = MailProvider(settings)
        app.state.collaboration = CollaborationService(
            database, settings, CollaborationProvider(settings)
        )
        try:
            yield
        finally:
            await app.state.calendar_provider.close()
            await app.state.mail_provider.close()
            await app.state.collaboration.provider.close()
            await client.aclose()
            await database.stop()

    app = FastAPI(
        title="NEXUS AI API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.database = database
    app.state.identity_verifier = identity_verifier

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    # Provider request URLs contain locations; do not emit them through HTTPX INFO logs.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("authlib").setLevel(logging.WARNING)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Idempotency-Key",
            "X-Request-ID",
        ],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next: Any) -> Any:
        incoming = request.headers.get("X-Request-ID", "").strip()
        request.state.request_id = incoming[:64] if incoming else str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        if request.url.path.startswith(
            ("/api/v1/calendar", "/api/v1/mail", "/api/v1/collaboration")
        ):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=error_payload(request, error.code, error.message),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        del error
        return JSONResponse(
            status_code=422,
            content=error_payload(
                request,
                "validation_error",
                "Review the submitted fields and try again.",
            ),
        )

    @app.exception_handler(CalendarFailure)
    async def handle_provider_error(request: Request, error: CalendarFailure) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content=error_payload(
                request,
                error.code,
                "The provider request was not confirmed. Check access and try again.",
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
        logging.getLogger("nexus.api").exception(
            "request_failed request_id=%s error_type=%s",
            str(getattr(request.state, "request_id", "unknown")),
            type(error).__name__,
        )
        return JSONResponse(
            status_code=500,
            content=error_payload(
                request,
                "internal_error",
                "NEXUS could not complete the request.",
            ),
        )

    app.include_router(health_router)
    app.include_router(api_router)
    app.include_router(context_router)
    app.include_router(notification_router)
    app.include_router(calendar_router)
    app.include_router(mail_router)
    app.include_router(collaboration_router)
    app.add_middleware(CalendarBoundary)
    return app


app = create_app()
