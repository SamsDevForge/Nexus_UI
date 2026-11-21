"""Provider-neutral, generic-content push boundary. Tokens never enter logs."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Protocol

from cryptography.fernet import Fernet

from .config import Settings


class InvalidPushToken(Exception):
    pass


class PushOutcomeUnknown(Exception):
    pass


class PushSender(Protocol):
    async def send(self, fid: str, notification_id: str, expires: datetime) -> str: ...


def token_cipher(settings: Settings) -> Fernet:
    if settings.push_token_encryption_key is None:
        raise ValueError("Push token encryption is unavailable.")
    return Fernet(settings.push_token_encryption_key.get_secret_value().encode())


class FirebasePushSender:
    def __init__(self, settings: Settings) -> None:
        import firebase_admin
        from firebase_admin import credentials

        from .identity import FirebaseIdentityVerifier

        identity = FirebaseIdentityVerifier(settings)
        name = f"nexus-push-{settings.firebase_project_id}"
        try:
            self.app = firebase_admin.get_app(name)
        except ValueError:
            self.app = firebase_admin.initialize_app(
                credentials.Certificate(identity.service_account),
                {"projectId": settings.firebase_project_id, "httpTimeout": 10},
                name=name,
            )

    async def send(self, fid: str, notification_id: str, expires: datetime) -> str:
        from firebase_admin import messaging

        ttl = max(0, int((expires - datetime.now(UTC)).total_seconds()))
        if ttl <= 0:
            raise PushOutcomeUnknown("The push window expired before sending.")
        # Data-only: the service worker displays one generic notification, with a stable tag.
        message = messaging.Message(
            fid=fid,
            data={"notificationId": notification_id, "expiresAt": expires.isoformat()},
            webpush=messaging.WebpushConfig(headers={"TTL": str(ttl)}),
            android=messaging.AndroidConfig(ttl=ttl, collapse_key="nexus-brief"),
        )
        try:
            result: str = await asyncio.to_thread(messaging.send, message, app=self.app)
            return result
        except messaging.UnregisteredError as error:
            raise InvalidPushToken("Registration is no longer valid.") from error
        except Exception as error:
            # An exception may occur after FCM accepted a send. Never assert non-delivery.
            raise PushOutcomeUnknown("Push acceptance could not be confirmed.") from error
