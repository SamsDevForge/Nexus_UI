"""Fixed-provider adapters. Source selection and action authority live above these APIs."""

from __future__ import annotations

import json
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any, Literal, Self
from urllib.parse import quote, urlencode, urlsplit

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from cryptography.fernet import Fernet
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .calendar_provider import CalendarFailure
from .calendar_rules import key
from .config import Settings
from .errors import ApiError
from .mail_rules import clean_text

Provider = Literal["notion", "teams"]
Guard = Callable[[], Awaitable[bool]]
TEAMS_SCOPES = "Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read.All offline_access"
NOTION_VERSION = "2026-03-11"


def vault(settings: Settings) -> Fernet:
    if (
        not settings.collaboration_encryption_key
        or not settings.collaboration_encryption_key.get_secret_value()
    ):
        raise ApiError(
            503, "collaboration_key_unavailable", "Collaboration encryption is not configured."
        )
    return Fernet(settings.collaboration_encryption_key.get_secret_value().encode())


def seal(settings: Settings, value: Any) -> str:
    return vault(settings).encrypt(json.dumps(value).encode()).decode()


def unseal(settings: Settings, value: str) -> Any:
    return json.loads(vault(settings).decrypt(value.encode()))


def configuration(settings: Settings, provider: str) -> tuple[str, str]:
    identifier, secret = (
        (settings.notion_client_id, settings.notion_client_secret)
        if provider == "notion"
        else (settings.teams_client_id, settings.teams_client_secret)
    )
    if (
        provider not in {"notion", "teams"}
        or not identifier
        or not secret
        or not secret.get_secret_value()
        or not settings.collaboration_api_public_url
        or not settings.collaboration_web_url
    ):
        raise ApiError(
            503,
            "collaboration_provider_unconfigured",
            "This collaboration provider is not configured.",
        )
    vault(settings)
    return identifier, secret.get_secret_value()


class SourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["page", "data_source", "channel"]
    resource_id: str = Field(min_length=1, max_length=200)
    team_id: str | None = Field(default=None, max_length=100)
    writable: bool = False

    @model_validator(mode="after")
    def valid_ids(self) -> Self:
        if self.kind == "channel":
            self.team_id = str(uuid.UUID(self.team_id or ""))
            if (
                not self.resource_id.startswith("19:")
                or not self.resource_id.endswith(("@thread.tacv2", "@thread.skype"))
                or any(c in self.resource_id for c in "/?#\r\n")
                or self.writable
            ):
                raise ValueError("Choose a read-only Teams channel.")
        else:
            self.resource_id = str(uuid.UUID(self.resource_id))
            if self.team_id:
                raise ValueError("Notion sources do not have a team identifier.")
        return self


def rich_text(value: Any) -> str:
    if not isinstance(value, list):
        return ""
    return "".join(
        str(r.get("plain_text") or r.get("text", {}).get("content") or "")
        for r in value
        if isinstance(r, dict)
    )


def title(value: dict[str, Any]) -> str:
    direct = rich_text(value.get("title"))
    if direct:
        return direct[:200]
    for prop in value.get("properties", {}).values():
        if prop.get("type") == "title":
            return rich_text(prop.get("title"))[:200] or "Untitled page"
    return "Untitled source"


def document(
    identifier: str, name: str, text: str, url: str, kind: str, limited: bool = False
) -> dict[str, Any]:
    return {
        "providerId": identifier,
        "title": name[:200],
        "text": text[:8000],
        "sourceUrl": url,
        "kind": kind,
        "limited": limited or len(text) > 8000,
    }


def fingerprint(value: dict[str, Any]) -> str:
    return key(json.dumps(value, sort_keys=True))


class CollaborationProvider:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings, self.transport = settings, transport
        self.client = httpx.AsyncClient(timeout=10, follow_redirects=False, transport=transport)

    async def close(self) -> None:
        await self.client.aclose()

    def redirect(self, provider: str) -> str:
        origin = str(self.settings.collaboration_api_public_url).rstrip("/")
        return f"{origin}/api/v1/collaboration/oauth/{provider}/callback"

    async def authorize_url(self, provider: str, state: str, verifier: str) -> str:
        identifier, secret = configuration(self.settings, provider)
        if provider == "notion":
            return "https://api.notion.com/v1/oauth/authorize?" + urlencode(
                {
                    "owner": "user",
                    "client_id": identifier,
                    "redirect_uri": self.redirect(provider),
                    "response_type": "code",
                    "state": state,
                }
            )
        async with AsyncOAuth2Client(
            identifier,
            secret,
            redirect_uri=self.redirect(provider),
            scope=TEAMS_SCOPES,
            code_challenge_method="S256",
            transport=self.transport,
        ) as client:
            url, _ = client.create_authorization_url(
                "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
                state=state,
                code_verifier=verifier,
                prompt="select_account",
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
        identifier, secret = configuration(self.settings, provider)
        try:
            if provider == "notion":
                body = (
                    {"grant_type": "refresh_token", "refresh_token": refresh}
                    if refresh
                    else {
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self.redirect(provider),
                    }
                )
                response = await self.client.post(
                    "https://api.notion.com/v1/oauth/token", auth=(identifier, secret), json=body
                )
                if response.status_code in {400, 401}:
                    raise CalendarFailure("consent_required")
                response.raise_for_status()
                value = response.json()
            else:
                async with AsyncOAuth2Client(
                    identifier,
                    secret,
                    redirect_uri=self.redirect(provider),
                    scope=TEAMS_SCOPES,
                    token_endpoint_auth_method="client_secret_post",
                    transport=self.transport,
                    timeout=10,
                    follow_redirects=False,
                ) as client:
                    endpoint = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"
                    value = (
                        await client.refresh_token(endpoint, refresh_token=refresh)
                        if refresh
                        else await client.fetch_token(
                            endpoint,
                            grant_type="authorization_code",
                            code=code,
                            code_verifier=verifier,
                        )
                    )
                scopes = {s.rsplit("/", 1)[-1].lower() for s in str(value.get("scope", "")).split()}
                if (code or scopes) and not {
                    "team.readbasic.all",
                    "channel.readbasic.all",
                    "channelmessage.read.all",
                } <= scopes:
                    raise CalendarFailure("consent_required")
            if not isinstance(value.get("access_token"), str) or not value["access_token"]:
                raise CalendarFailure("invalid_provider_response")
            if code and not value.get("refresh_token"):
                raise CalendarFailure("consent_required")
            expiry = value.get("expires_in")
            if provider == "teams" and (not expiry or not 30 <= int(expiry) <= 86400 * 90):
                raise CalendarFailure("invalid_provider_response")
            return {
                "access": value["access_token"],
                "refresh": value.get("refresh_token") or refresh,
                "expiresAt": (datetime.now(UTC) + timedelta(seconds=int(expiry))).isoformat()
                if expiry
                else None,
                "workspaceId": str(uuid.UUID(value["workspace_id"]))
                if provider == "notion" and code
                else None,
            }
        except CalendarFailure:
            raise
        except Exception as error:
            raise CalendarFailure(
                "consent_required"
                if getattr(error, "error", "") == "invalid_grant"
                else "oauth_unavailable"
            ) from None

    async def request(
        self, provider: str, method: str, path: str, access: str, guard: Guard, **kwargs: Any
    ) -> dict[str, Any]:
        if not path.startswith("/") or ".." in path or "?" in path or "#" in path:
            raise CalendarFailure("invalid_provider_response")
        if not await guard():
            raise CalendarFailure("revoked")
        base = (
            "https://api.notion.com/v1"
            if provider == "notion"
            else "https://graph.microsoft.com/v1.0"
        )
        try:
            response = await self.client.request(
                method,
                base + path,
                headers={"Authorization": f"Bearer {access}", "Notion-Version": NOTION_VERSION},
                **kwargs,
            )
            if response.status_code == 401:
                raise CalendarFailure("consent_required")
            if response.status_code in {403, 404}:
                raise CalendarFailure(
                    "source_unavailable"
                    if method == "GET" or path.endswith("/query")
                    else "write_rejected"
                )
            if response.status_code == 429:
                raise CalendarFailure("rate_limited")
            if response.status_code >= 400:
                raise CalendarFailure(
                    "write_uncertain"
                    if method in {"PATCH", "POST"} and response.status_code >= 500
                    else "provider_unavailable"
                )
            if len(response.content) > 2_000_000:
                raise CalendarFailure("provider_limit")
            result = response.json()
            if not isinstance(result, dict):
                raise CalendarFailure("invalid_provider_response")
            return result
        except CalendarFailure:
            raise
        except Exception:
            raise CalendarFailure(
                "write_uncertain"
                if method in {"PATCH", "POST"} and not path.endswith("/query") and path != "/search"
                else "provider_unavailable"
            ) from None

    async def discover(
        self, provider: str, access: str, guard: Guard, query: str = "", team: str | None = None
    ) -> dict[str, Any]:
        if provider == "notion":
            value = await self.request(
                provider, "POST", "/search", access, guard, json={"query": query, "page_size": 20}
            )
            items = [
                {"kind": r["object"], "resource_id": str(uuid.UUID(r["id"])), "label": title(r)}
                for r in value.get("results", [])[:20]
                if r.get("object") in {"page", "data_source"}
            ]
            return {"items": items, "limited": bool(value.get("has_more"))}
        path = f"/teams/{uuid.UUID(team)}/channels" if team else "/me/joinedTeams"
        value = await self.request(provider, "GET", path, access, guard)
        return {
            "items": [
                {
                    "kind": "channel" if team else "team",
                    "resource_id": str(r["id"]),
                    "team_id": team,
                    "label": str(r.get("displayName") or "Untitled")[:200],
                }
                for r in value.get("value", [])[:50]
            ],
            "limited": bool(value.get("@odata.nextLink")) or len(value.get("value", [])) > 50,
        }

    async def describe(
        self, provider: str, locator: dict[str, Any], access: str, guard: Guard
    ) -> dict[str, Any]:
        kind, identifier = locator["kind"], locator["resource_id"]
        if provider == "notion" and kind in {"page", "data_source"}:
            raw = await self.request(
                provider,
                "GET",
                f"/{'pages' if kind == 'page' else 'data_sources'}/{uuid.UUID(identifier)}",
                access,
                guard,
            )
            if raw.get("archived") or raw.get("in_trash"):
                raise CalendarFailure("source_unavailable")
            return {**locator, "label": title(raw)}
        if provider != "teams" or kind != "channel":
            raise CalendarFailure("invalid_target")
        raw = await self.request(
            provider,
            "GET",
            f"/teams/{uuid.UUID(locator['team_id'])}/channels/{quote(identifier, safe='')}",
            access,
            guard,
        )
        return {**locator, "label": str(raw.get("displayName") or "Selected channel")[:200]}

    async def notion_page(self, identifier: str, access: str, guard: Guard) -> dict[str, Any]:
        identifier = str(uuid.UUID(identifier))
        raw = await self.request("notion", "GET", f"/pages/{identifier}", access, guard)
        if raw.get("archived") or raw.get("in_trash"):
            raise CalendarFailure("source_unavailable")
        blocks = await self.request(
            "notion",
            "GET",
            f"/blocks/{identifier}/children",
            access,
            guard,
            params={"page_size": 50},
        )
        lines = [
            rich_text(b.get(b.get("type", ""), {}).get("rich_text"))
            for b in blocks.get("results", [])[:50]
        ]
        limited = bool(blocks.get("has_more")) or any(
            b.get("has_children") for b in blocks.get("results", [])
        )
        return document(
            identifier,
            title(raw),
            "\n".join(lines),
            f"https://app.notion.com/p/{identifier}",
            "notion-page",
            limited,
        )

    async def read(
        self, provider: str, locator: dict[str, Any], access: str, guard: Guard
    ) -> tuple[list[dict[str, Any]], bool]:
        await self.describe(provider, locator, access, guard)
        if provider == "notion":
            if locator["kind"] == "page":
                doc = await self.notion_page(locator["resource_id"], access, guard)
                return [doc], doc["limited"]
            raw = await self.request(
                provider,
                "POST",
                f"/data_sources/{uuid.UUID(locator['resource_id'])}/query",
                access,
                guard,
                json={"page_size": 10},
            )
            docs = [
                await self.notion_page(r["id"], access, guard) for r in raw.get("results", [])[:10]
            ]
            return docs, bool(raw.get("has_more")) or any(d["limited"] for d in docs)
        path = (
            f"/teams/{uuid.UUID(locator['team_id'])}/channels/"
            f"{quote(locator['resource_id'], safe='')}/messages"
        )
        raw = await self.request(provider, "GET", path, access, guard, params={"$top": 20})
        docs = [
            self.teams_message(r, locator)
            for r in raw.get("value", [])[:20]
            if not r.get("deletedDateTime")
        ]
        return docs, bool(raw.get("@odata.nextLink")) or any(d["limited"] for d in docs)

    def teams_message(self, raw: dict[str, Any], locator: dict[str, Any]) -> dict[str, Any]:
        identifier = str(raw["id"])
        url = str(raw.get("webUrl") or "")
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.netloc.lower() not in {"teams.microsoft.com", "teams.cloud.microsoft"}
            or len(url) > 2048
        ):
            url = (
                f"https://teams.microsoft.com/l/message/{quote(locator['resource_id'], safe='')}/"
                f"{quote(identifier, safe='')}?groupId={quote(locator['team_id'])}"
            )
        body = raw.get("body", {})
        text = clean_text(str(body.get("content", "")), html=body.get("contentType") == "html")
        heading = str(raw.get("subject") or text[:100] or "Channel message")
        context = str(raw.get("messageType") or "message")
        return document(identifier, heading, text, url, f"teams-{context}", len(text) > 8000)

    async def write(
        self,
        locator: dict[str, Any],
        note: dict[str, Any],
        access: str,
        guard: Guard,
        previous: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        operation = note["operation"]
        text = note["body"] + "\n\nSource: " + note["sourceUrl"]
        rich = [
            {"type": "text", "text": {"content": text[i : i + 1000]}}
            for i in range(0, len(text), 1000)
        ]
        paragraph = {"object": "block", "type": "paragraph", "paragraph": {"rich_text": rich}}
        if operation == "update":
            if (
                not previous
                or previous.get("destination") != locator["resource_id"]
                or not previous.get("blockId")
            ):
                raise CalendarFailure("invalid_target")
            block = await self.request(
                "notion", "GET", f"/blocks/{uuid.UUID(previous['blockId'])}", access, guard
            )
            if (
                block.get("archived")
                or block.get("in_trash")
                or block.get("type") != "paragraph"
                or block.get("parent", {}).get("page_id") != previous.get("pageId")
            ):
                raise CalendarFailure("write_conflict")
            if key(rich_text(block.get("paragraph", {}).get("rich_text"))) != previous.get(
                "bodyHash"
            ):
                raise CalendarFailure("write_conflict")
            await self.request(
                "notion",
                "PATCH",
                f"/blocks/{uuid.UUID(previous['blockId'])}",
                access,
                guard,
                json={"paragraph": {"rich_text": rich}},
            )
            return {**previous, "bodyHash": key(text)}
        if operation == "append":
            if locator["kind"] != "page":
                raise CalendarFailure("invalid_target")
            raw = await self.request(
                "notion",
                "PATCH",
                f"/blocks/{uuid.UUID(locator['resource_id'])}/children",
                access,
                guard,
                json={"children": [paragraph]},
            )
            block_id = raw["results"][0]["id"]
            page_id = locator["resource_id"]
        else:
            property_name = "title"
            if locator["kind"] == "data_source":
                schema = await self.request(
                    "notion",
                    "GET",
                    f"/data_sources/{uuid.UUID(locator['resource_id'])}",
                    access,
                    guard,
                )
                property_name = next(
                    (
                        name
                        for name, value in schema.get("properties", {}).items()
                        if value.get("type") == "title"
                    ),
                    "",
                )
                if not property_name:
                    raise CalendarFailure("invalid_target")
            parent = (
                {"type": "data_source_id", "data_source_id": locator["resource_id"]}
                if locator["kind"] == "data_source"
                else {"type": "page_id", "page_id": locator["resource_id"]}
            )
            raw = await self.request(
                "notion",
                "POST",
                "/pages",
                access,
                guard,
                json={
                    "parent": parent,
                    "properties": {
                        property_name: {"title": [{"text": {"content": note["title"]}}]}
                    },
                    "children": [paragraph],
                },
            )
            page_id = str(uuid.UUID(raw["id"]))
            # Page creation already succeeded; failed block discovery never retries creation.
            block_id = None
            try:
                children = await self.request(
                    "notion",
                    "GET",
                    f"/blocks/{page_id}/children",
                    access,
                    guard,
                    params={"page_size": 1},
                )
                first = children.get("results", [])[0]
                if (
                    first.get("type") == "paragraph"
                    and rich_text(first["paragraph"].get("rich_text")) == text
                ):
                    block_id = first["id"]
            except Exception:
                pass
        return {
            "url": f"https://app.notion.com/p/{page_id}",
            "pageId": page_id,
            "blockId": block_id,
            "bodyHash": key(text),
            "destination": locator["resource_id"],
        }
