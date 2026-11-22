"""Fixed-host read-only provider adapters; OAuth plumbing uses Authlib."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote, urlsplit

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from cryptography.fernet import Fernet

from .calendar_rules import EventData, google_event, microsoft_event
from .config import Settings
from .errors import ApiError

GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly"
GRAPH_SCOPE = "https://graph.microsoft.com/Calendars.Read offline_access"
GRAPH_DELTA = "https://graph.microsoft.com/v1.0/me/calendarView/delta"


class CalendarFailure(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def cipher(settings: Settings) -> Fernet:
    if (
        not settings.calendar_encryption_key
        or not settings.calendar_encryption_key.get_secret_value()
    ):
        raise ApiError(
            503,
            "calendar_credentials_unavailable",
            "Calendar credential encryption is not configured.",
        )
    return Fernet(settings.calendar_encryption_key.get_secret_value().encode())


def provider_configuration(settings: Settings, provider: str) -> tuple[str, str, str, str, str]:
    if provider == "google":
        client_id, secret = (
            settings.google_calendar_client_id,
            settings.google_calendar_client_secret,
        )
        auth, token, scopes = (
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            GOOGLE_SCOPE,
        )
    elif provider == "microsoft":
        client_id, secret = (
            settings.microsoft_calendar_client_id,
            settings.microsoft_calendar_client_secret,
        )
        auth = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        token, scopes = "https://login.microsoftonline.com/common/oauth2/v2.0/token", GRAPH_SCOPE
    else:
        raise ApiError(404, "calendar_provider_unknown", "That calendar provider is unavailable.")
    if (
        not client_id
        or not secret
        or not secret.get_secret_value()
        or not settings.calendar_api_public_url
        or not settings.calendar_web_url
    ):
        raise ApiError(
            503,
            "calendar_provider_unconfigured",
            "This calendar provider is not configured. Manual events and ICS imports "
            "remain available.",
        )
    cipher(settings)
    return client_id, secret.get_secret_value(), auth, token, scopes


def redirect_uri(settings: Settings, provider: str) -> str:
    base = str(settings.calendar_api_public_url).rstrip("/")
    return f"{base}/api/v1/calendar/oauth/{provider}/callback"


def check_scopes(provider: str, value: Any, *, required: bool) -> list[str]:
    if not value and not required:
        return []
    if not isinstance(value, str):
        raise CalendarFailure("consent_required")
    scopes = value.split()
    accepted = (
        GOOGLE_SCOPE in scopes
        if provider == "google"
        else any(s.rsplit("/", 1)[-1].casefold() == "calendars.read" for s in scopes)
    )
    if not accepted:
        raise CalendarFailure("consent_required")
    return [GOOGLE_SCOPE] if provider == "google" else ["Calendars.Read"]


def safe_delta_url(value: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "graph.microsoft.com"
        or parsed.port not in {None, 443}
        or parsed.username
        or parsed.fragment
        or parsed.path.lower() != "/v1.0/me/calendarview/delta"
        or len(value) > 20000
    ):
        raise CalendarFailure("invalid_provider_response")
    return value


@dataclass
class SyncBatch:
    changes: list[tuple[str, EventData | None]]
    cursor: str


class CalendarProvider:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings, self.transport = settings, transport
        self.client = httpx.AsyncClient(timeout=10, follow_redirects=False, transport=transport)

    async def close(self) -> None:
        await self.client.aclose()

    def oauth_client(self, provider: str) -> AsyncOAuth2Client:
        client_id, secret, _, _, scopes = provider_configuration(self.settings, provider)
        return AsyncOAuth2Client(
            client_id,
            secret,
            scope=scopes,
            redirect_uri=redirect_uri(self.settings, provider),
            code_challenge_method="S256",
            token_endpoint_auth_method="client_secret_post",
            timeout=10,
            follow_redirects=False,
            transport=self.transport,
        )

    async def authorize_url(self, provider: str, state: str, verifier: str) -> str:
        _, _, endpoint, _, _ = provider_configuration(self.settings, provider)
        async with self.oauth_client(provider) as client:
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
        _, _, _, endpoint, _ = provider_configuration(self.settings, provider)
        try:
            async with self.oauth_client(provider) as client:
                result = (
                    await client.refresh_token(endpoint, refresh_token=refresh)
                    if refresh
                    else await client.fetch_token(
                        endpoint, grant_type="authorization_code", code=code, code_verifier=verifier
                    )
                )
            if (
                not isinstance(result.get("access_token"), str)
                or not result["access_token"]
                or str(result.get("token_type", "")).casefold() != "bearer"
            ):
                raise CalendarFailure("invalid_provider_response")
            check_scopes(provider, result.get("scope"), required=code is not None)
            expires = int(result.get("expires_in", 0))
            if not 30 <= expires <= 86400 * 90:
                raise CalendarFailure("invalid_provider_response")
            return dict(result)
        except CalendarFailure:
            raise
        except Exception as error:
            code_value = getattr(error, "error", "")
            raise CalendarFailure(
                "consent_required" if code_value == "invalid_grant" else "oauth_unavailable"
            ) from None

    async def request(
        self,
        method: str,
        url: str,
        access: str,
        guard: Callable[[], Awaitable[bool]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        if not await guard():
            raise CalendarFailure("revoked")
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in {"www.googleapis.com", "graph.microsoft.com"}
            or parsed.username
            or parsed.port not in {None, 443}
        ):
            raise CalendarFailure("invalid_provider_response")
        try:
            response = await self.client.request(
                method,
                url,
                headers={"Authorization": f"Bearer {access}", "Prefer": 'outlook.timezone="UTC"'},
                **kwargs,
            )
            if response.status_code in {401, 403}:
                raise CalendarFailure("consent_required")
            if response.status_code == 410:
                raise CalendarFailure("cursor_expired")
            if response.status_code == 404:
                raise CalendarFailure("resource_missing")
            response.raise_for_status()
            if response.status_code == 204:
                return {}
            if len(response.content) > 2_000_000:
                raise CalendarFailure("provider_limit")
            payload = response.json()
            if not isinstance(payload, dict):
                raise CalendarFailure("invalid_provider_response")
            return payload
        except CalendarFailure:
            raise
        except Exception:
            raise CalendarFailure("provider_unavailable") from None

    async def sync(
        self,
        provider: str,
        access: str,
        cursor: str | None,
        start: datetime,
        end: datetime,
        guard: Callable[[], Awaitable[bool]],
    ) -> SyncBatch:
        changes: list[tuple[str, EventData | None]] = []
        next_value: str | None = None
        try:
            for _ in range(30):
                if provider == "google":
                    params: dict[str, Any] = {
                        "singleEvents": "true",
                        "showDeleted": "true",
                        "maxResults": 250,
                        "fields": "timeZone,nextPageToken,nextSyncToken,"
                        "items(id,summary,location,start,end,status,transparency,"
                        "attendees(self,responseStatus),updated)",
                    }
                    if cursor:
                        params["syncToken"] = cursor
                    else:
                        params.update(timeMin=start.isoformat(), timeMax=end.isoformat())
                    if next_value:
                        params["pageToken"] = next_value
                    payload = await self.request(
                        "GET",
                        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                        access,
                        guard,
                        params=params,
                    )
                    items = payload.get("items", [])
                    parsed = [google_event(item, payload["timeZone"]) for item in items]
                    next_value = payload.get("nextPageToken")
                    final = payload.get("nextSyncToken")
                else:
                    url = (
                        safe_delta_url(str(next_value or cursor))
                        if next_value or cursor
                        else GRAPH_DELTA
                    )
                    payload = await self.request(
                        "GET",
                        url,
                        access,
                        guard,
                        params={"startDateTime": start.isoformat(), "endDateTime": end.isoformat()}
                        if not next_value and not cursor
                        else None,
                    )
                    parsed = [microsoft_event(item) for item in payload.get("value", [])]
                    next_value, final = (
                        payload.get("@odata.nextLink"),
                        payload.get("@odata.deltaLink"),
                    )
                changes.extend(parsed)
                if len(changes) > 5000:
                    raise CalendarFailure("provider_limit")
                if not next_value:
                    if not isinstance(final, str) or not final or len(final) > 20000:
                        raise CalendarFailure("invalid_provider_response")
                    if provider == "microsoft":
                        safe_delta_url(final)
                    return SyncBatch(changes, final)
                if not isinstance(next_value, str) or len(next_value) > 20000:
                    raise CalendarFailure("invalid_provider_response")
            raise CalendarFailure("provider_limit")
        except CalendarFailure:
            raise
        except Exception:
            raise CalendarFailure("invalid_provider_response") from None

    async def watch(
        self,
        provider: str,
        access: str,
        watch_id: str,
        secret: str,
        guard: Callable[[], Awaitable[bool]],
        existing_id: str | None = None,
    ) -> dict[str, Any]:
        base = str(self.settings.calendar_api_public_url).rstrip("/")
        if not base.startswith("https://"):
            raise CalendarFailure("webhook_requires_https")
        if provider == "google":
            raw = await self.request(
                "POST",
                "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
                access,
                guard,
                json={
                    "id": watch_id,
                    "type": "web_hook",
                    "address": f"{base}/api/v1/calendar/webhooks/google",
                    "token": secret,
                    "params": {"ttl": "86400"},
                },
            )
            return {
                "id": raw["id"],
                "resource": raw["resourceId"],
                "expires": datetime.fromtimestamp(int(raw["expiration"]) / 1000, UTC),
            }
        expires = (datetime.now(UTC) + timedelta(days=2)).isoformat()
        if existing_id:
            try:
                raw = await self.request(
                    "PATCH",
                    f"https://graph.microsoft.com/v1.0/subscriptions/{quote(existing_id, safe='')}",
                    access,
                    guard,
                    json={"expirationDateTime": expires},
                )
                return {
                    "id": raw["id"],
                    "resource": "me/events",
                    "expires": datetime.fromisoformat(
                        raw["expirationDateTime"].replace("Z", "+00:00")
                    ),
                }
            except CalendarFailure as error:
                if error.code != "resource_missing":
                    raise
        raw = await self.request(
            "POST",
            "https://graph.microsoft.com/v1.0/subscriptions",
            access,
            guard,
            json={
                "changeType": "created,updated,deleted",
                "notificationUrl": f"{base}/api/v1/calendar/webhooks/microsoft",
                "resource": "me/events",
                "expirationDateTime": expires,
                "clientState": secret,
            },
        )
        return {
            "id": raw["id"],
            "resource": "me/events",
            "expires": datetime.fromisoformat(raw["expirationDateTime"].replace("Z", "+00:00")),
        }

    async def stop_watch(
        self,
        provider: str,
        access: str,
        identifier: str,
        resource: str | None,
        guard: Callable[[], Awaitable[bool]],
    ) -> None:
        if provider == "google" and resource:
            await self.request(
                "POST",
                "https://www.googleapis.com/calendar/v3/channels/stop",
                access,
                guard,
                json={"id": identifier, "resourceId": resource},
            )
        elif provider == "microsoft":
            await self.request(
                "DELETE",
                f"https://graph.microsoft.com/v1.0/subscriptions/{quote(identifier, safe='')}",
                access,
                guard,
            )
