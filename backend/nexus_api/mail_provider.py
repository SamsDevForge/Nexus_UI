"""Separate read-only mail consent and fixed-host bounded Inbox polling."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import quote, urlsplit

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from cryptography.fernet import Fernet

from .calendar_provider import CalendarFailure
from .config import Settings
from .errors import ApiError
from .mail_rules import gmail_message, outlook_message

GOOGLE_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
MICROSOFT_SCOPE = "https://graph.microsoft.com/Mail.Read offline_access"
Guard = Callable[[], Awaitable[bool]]


def mail_cipher(settings: Settings) -> Fernet:
    if not settings.mail_encryption_key or not settings.mail_encryption_key.get_secret_value():
        raise ApiError(503, "mail_key_unavailable", "Mail encryption is not configured.")
    return Fernet(settings.mail_encryption_key.get_secret_value().encode())


def configuration(settings: Settings, provider: str) -> tuple[str, str, str, str, str]:
    if provider == "google":
        identifier, secret = settings.google_mail_client_id, settings.google_mail_client_secret
        auth, token, scope = (
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            GOOGLE_SCOPE,
        )
    elif provider == "microsoft":
        identifier, secret = (
            settings.microsoft_mail_client_id,
            settings.microsoft_mail_client_secret,
        )
        auth, token, scope = (
            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            MICROSOFT_SCOPE,
        )
    else:
        raise ApiError(404, "mail_provider_missing", "Unknown mail provider.")
    if (
        not identifier
        or not secret
        or not secret.get_secret_value()
        or not settings.mail_api_public_url
        or not settings.mail_web_url
    ):
        raise ApiError(503, "mail_provider_unconfigured", "This mail provider is not configured.")
    mail_cipher(settings)
    return identifier, secret.get_secret_value(), auth, token, scope


class MailProvider:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings, self.transport = settings, transport
        self.client = httpx.AsyncClient(timeout=10, follow_redirects=False, transport=transport)

    async def close(self) -> None:
        await self.client.aclose()

    def oauth(self, provider: str) -> AsyncOAuth2Client:
        identifier, secret, _, _, scope = configuration(self.settings, provider)
        return AsyncOAuth2Client(
            identifier,
            secret,
            scope=scope,
            redirect_uri=f"{str(self.settings.mail_api_public_url).rstrip('/')}/api/v1/mail/oauth/{provider}/callback",
            code_challenge_method="S256",
            token_endpoint_auth_method="client_secret_post",
            timeout=10,
            follow_redirects=False,
            transport=self.transport,
        )

    async def authorize_url(self, provider: str, state: str, verifier: str) -> str:
        _, _, endpoint, _, _ = configuration(self.settings, provider)
        async with self.oauth(provider) as client:
            extra = (
                {"access_type": "offline", "prompt": "consent select_account"}
                if provider == "google"
                else {"prompt": "select_account", "response_mode": "query"}
            )
            url, _ = client.create_authorization_url(
                endpoint, state=state, code_verifier=verifier, **extra
            )
            return str(url)

    async def tokens(
        self,
        provider: str,
        *,
        code: str | None = None,
        verifier: str | None = None,
        refresh: str | None = None,
    ) -> dict[str, Any]:
        _, _, _, endpoint, _ = configuration(self.settings, provider)
        try:
            async with self.oauth(provider) as client:
                value = (
                    await client.refresh_token(endpoint, refresh_token=refresh)
                    if refresh
                    else await client.fetch_token(
                        endpoint, grant_type="authorization_code", code=code, code_verifier=verifier
                    )
                )
            scopes = str(value.get("scope", "")).split()
            granted = (
                GOOGLE_SCOPE in scopes
                if provider == "google"
                else any(s.rsplit("/", 1)[-1].casefold() == "mail.read" for s in scopes)
            )
            if (code is not None or scopes) and not granted:
                raise CalendarFailure("consent_required")
            if (
                not isinstance(value.get("access_token"), str)
                or not value["access_token"]
                or str(value.get("token_type", "")).casefold() != "bearer"
                or not 30 <= int(value.get("expires_in", 0)) <= 86400 * 90
            ):
                raise CalendarFailure("invalid_provider_response")
            return dict(value)
        except CalendarFailure:
            raise
        except Exception as error:
            raise CalendarFailure(
                "consent_required"
                if getattr(error, "error", "") == "invalid_grant"
                else "oauth_unavailable"
            ) from None

    async def get(self, url: str, access: str, guard: Guard, **kwargs: Any) -> dict[str, Any]:
        parsed = urlsplit(url)
        allowed = (
            parsed.hostname == "gmail.googleapis.com"
            and parsed.path.startswith("/gmail/v1/users/me/")
        ) or (parsed.hostname == "graph.microsoft.com" and parsed.path.startswith("/v1.0/me/"))
        if (
            not allowed
            or parsed.scheme != "https"
            or parsed.username
            or parsed.port not in {None, 443}
            or parsed.fragment
        ):
            raise CalendarFailure("invalid_provider_response")
        if not await guard():
            raise CalendarFailure("revoked")
        try:
            response = await self.client.get(
                url,
                headers={
                    "Authorization": f"Bearer {access}",
                    "Prefer": 'outlook.body-content-type="text", IdType="ImmutableId"',
                },
                **kwargs,
            )
            if response.status_code in {401, 403}:
                raise CalendarFailure("consent_required")
            if response.status_code == 404:
                raise CalendarFailure("message_missing")
            response.raise_for_status()
            if len(response.content) > 2_000_000:
                raise CalendarFailure("provider_limit")
            value = response.json()
            if not isinstance(value, dict):
                raise CalendarFailure("invalid_provider_response")
            return value
        except CalendarFailure:
            raise
        except Exception:
            raise CalendarFailure("provider_unavailable") from None

    async def read(
        self, provider: str, access: str, now: datetime, guard: Guard
    ) -> tuple[list[dict[str, Any]], bool]:
        start = now - timedelta(days=14)
        messages = []
        try:
            if provider == "google":
                profile = await self.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile", access, guard
                )
                mailbox = profile.get("emailAddress")
                if not isinstance(mailbox, str) or "@" not in mailbox or len(mailbox) > 254:
                    raise CalendarFailure("invalid_provider_response")
                base = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
                listing = await self.get(
                    base,
                    access,
                    guard,
                    params={
                        "q": f"in:inbox after:{int(start.timestamp())}",
                        "maxResults": 50,
                        "includeSpamTrash": "false",
                    },
                )
                identifiers = listing.get("messages", [])
                if not isinstance(identifiers, list) or len(identifiers) > 50:
                    raise CalendarFailure("provider_limit")
                for row in identifiers:
                    try:
                        raw = await self.get(
                            f"{base}/{quote(str(row['id']), safe='')}",
                            access,
                            guard,
                            params={"format": "full"},
                        )
                    except CalendarFailure as error:
                        if error.code == "message_missing":
                            continue
                        raise
                    if "INBOX" not in raw.get("labelIds", []):
                        continue
                    message = gmail_message(raw)
                    message["data"]["mailbox"] = mailbox
                    message["data"]["sourceUrl"] = (
                        f"https://mail.google.com/mail/?authuser={quote(mailbox, safe='')}"
                        f"#all/{raw['id']}"
                    )
                    if start <= message["received_at"] <= now:
                        messages.append(message)
                return messages, bool(listing.get("nextPageToken"))
            base = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
            listing = await self.get(
                base,
                access,
                guard,
                params={
                    "$top": 50,
                    "$filter": f"receivedDateTime ge {start.isoformat()}",
                    "$orderby": "receivedDateTime desc",
                    "$select": "id,subject,from,receivedDateTime,importance,body,"
                    "webLink,hasAttachments",
                },
            )
            values = listing.get("value", [])
            if not isinstance(values, list) or len(values) > 50:
                raise CalendarFailure("provider_limit")
            for raw in values:
                if raw.get("hasAttachments"):
                    message_id = quote(str(raw["id"]), safe="")
                    attachments = await self.get(
                        f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments",
                        access,
                        guard,
                        params={"$select": "name,contentType,size"},
                    )
                    raw["attachments"] = attachments.get("value", [])
                    raw["attachmentsPageTruncated"] = bool(attachments.get("@odata.nextLink"))
                message = outlook_message(raw)
                if start <= message["received_at"] <= now:
                    messages.append(message)
            return messages, bool(listing.get("@odata.nextLink"))
        except CalendarFailure:
            raise
        except Exception:
            raise CalendarFailure("invalid_provider_response") from None
