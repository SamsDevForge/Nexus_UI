from __future__ import annotations

import base64
import json
from datetime import UTC, datetime
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from .config import Settings


class IdentityVerificationError(Exception):
    pass


class IdentityUnavailableError(Exception):
    pass


class AuthenticatedPrincipal(BaseModel):
    model_config = ConfigDict(frozen=True)

    provider: str
    subject: str
    email: str | None = None
    email_verified: bool = False
    display_name: str | None = None
    auth_time: datetime | None = None


class IdentityVerifier(Protocol):
    async def verify(self, token: str) -> AuthenticatedPrincipal: ...


class FirebaseIdentityVerifier:
    def __init__(self, settings: Settings) -> None:
        if not settings.firebase_project_id or not settings.firebase_service_account_json_b64:
            raise IdentityUnavailableError("Firebase identity verification is not configured.")
        self.project_id = settings.firebase_project_id
        try:
            decoded = base64.b64decode(
                settings.firebase_service_account_json_b64, validate=True
            ).decode("utf-8")
            self.service_account = json.loads(decoded)
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise IdentityUnavailableError(
                "Firebase service-account configuration is invalid."
            ) from error

    async def verify(self, token: str) -> AuthenticatedPrincipal:
        try:
            import firebase_admin
            from firebase_admin import auth, credentials

            try:
                app = firebase_admin.get_app()
            except ValueError:
                app = firebase_admin.initialize_app(
                    credentials.Certificate(self.service_account),
                    {"projectId": self.project_id},
                )
            claims = auth.verify_id_token(token, app=app, check_revoked=False)
        except Exception as error:
            raise IdentityVerificationError("The identity token is invalid or expired.") from error

        auth_time = claims.get("auth_time")
        return AuthenticatedPrincipal(
            provider="firebase",
            subject=str(claims["uid"]),
            email=claims.get("email"),
            email_verified=bool(claims.get("email_verified", False)),
            display_name=claims.get("name"),
            auth_time=(
                datetime.fromtimestamp(auth_time, tz=UTC)
                if isinstance(auth_time, (int, float))
                else None
            ),
        )


class UnavailableIdentityVerifier:
    async def verify(self, token: str) -> AuthenticatedPrincipal:
        del token
        raise IdentityUnavailableError("Firebase identity verification is not configured.")


class FakeIdentityVerifier:
    def __init__(self, principals: dict[str, AuthenticatedPrincipal]) -> None:
        self.principals = principals

    async def verify(self, token: str) -> AuthenticatedPrincipal:
        principal = self.principals.get(token)
        if principal is None:
            raise IdentityVerificationError("The identity token is invalid or expired.")
        return principal
