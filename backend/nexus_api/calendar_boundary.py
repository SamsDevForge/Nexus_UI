"""Bound provider bodies and remove OAuth query credentials before access logging."""

from __future__ import annotations

from urllib.parse import parse_qs

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class CalendarBoundary:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope.get("path", "").startswith(
            ("/api/v1/calendar", "/api/v1/mail")
        ):
            await self.app(scope, receive, send)
            return
        path = scope["path"]
        if "/oauth/" in path and path.endswith("/callback"):
            raw = scope.get("query_string", b"")
            scope["query_string"] = b""
            try:
                if len(raw) > 8192:
                    raise ValueError("Oversized callback")
                values = parse_qs(raw.decode("utf-8"), max_num_fields=8, strict_parsing=True)
                if any(len(v) != 1 for v in values.values()):
                    raise ValueError("Duplicate callback fields")
                state_key = "mail_oauth" if path.startswith("/api/v1/mail/") else "calendar_oauth"
                scope.setdefault("state", {})[state_key] = {k: v[0] for k, v in values.items()}
            except (ValueError, UnicodeError):
                await JSONResponse({"message": "Invalid provider callback."}, status_code=400)(
                    scope, receive, send
                )
                return
        # Microsoft validation challenges are also echoed without retaining query values in logs.
        if path.endswith("/webhooks/microsoft") and scope.get("query_string"):
            raw = scope["query_string"]
            scope["query_string"] = b""
            try:
                values = parse_qs(raw.decode(), max_num_fields=4)
                token = values.get("validationToken", [""])[0]
                if not 0 < len(token) <= 1024:
                    raise ValueError("Invalid validation")
                scope.setdefault("state", {})["calendar_validation"] = token
            except (ValueError, UnicodeError):
                await JSONResponse({}, status_code=400)(scope, receive, send)
                return
        limit = 1_100_000 if path.endswith("/imports/ics") else 64_000
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > limit:
                await JSONResponse({"message": "Calendar request too large."}, status_code=413)(
                    scope, receive, send
                )
                return
            if not message.get("more_body", False):
                break
        consumed = False

        async def replay() -> Message:
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
