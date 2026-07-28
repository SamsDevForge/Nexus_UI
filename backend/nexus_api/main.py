from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import api_router, health_router
from .config import Settings, get_settings
from .db import Database
from .errors import ApiError
from .identity import (
    FirebaseIdentityVerifier,
    IdentityUnavailableError,
    IdentityVerifier,
    UnavailableIdentityVerifier,
)


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
        del app
        await database.start()
        try:
            yield
        finally:
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
    return app


app = create_app()
