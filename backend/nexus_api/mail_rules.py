"""Conservative deterministic extraction; message content never becomes instructions."""

from __future__ import annotations

import base64
import hashlib
import re
from datetime import UTC, date, datetime
from html.parser import HTMLParser
from typing import Any, Literal, Self
from urllib.parse import quote, urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .calendar_rules import instant, key

MAX_TEXT = 32_000


class PlainText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        if tag in {"script", "style", "head", "iframe", "object"}:
            self.hidden += 1
        if tag in {"br", "p", "div", "tr", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "head", "iframe", "object"}:
            self.hidden = max(0, self.hidden - 1)
        if tag in {"p", "div", "tr", "li"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)


def clean_text(value: str, *, html: bool = False) -> str:
    if html:
        parser = PlainText()
        parser.feed(value[: MAX_TEXT * 4])
        value = "".join(parser.parts)
    lines = []
    for line in value[:MAX_TEXT].splitlines():
        line = line.strip()
        if line.startswith(">") or re.match(r"On .+wrote:|[- ]*Original Message[- ]*", line, re.I):
            break
        if line:
            lines.append(line)
    return "\n".join(lines)[:MAX_TEXT]


def extract(subject: str, text: str, important: bool = False) -> dict[str, Any]:
    text = clean_text(text)
    lines = (subject + "\n" + text).splitlines()
    items: list[dict[str, Any]] = []
    for line_number, line in enumerate(lines):
        deadline = re.search(r"\b(due|deadline|submit|submission)\b", line, re.I)
        event = re.search(
            r"\b(meeting|class|exam|workshop|appointment|interview|session)\b", line, re.I
        )
        match = deadline or event
        if match is None:
            continue
        kind = "deadline" if deadline else "event"
        # Only infer from the excerpt actually retained and shown as evidence.
        context = line[max(0, match.start() - 40) : match.end() + 180].strip()
        dates = re.findall(r"(?<!\w)\d{4}-\d{2}-\d{2}(?!\d)", context)
        value, reason = None, "No unambiguous ISO date found. Review at the source."
        if len(set(dates)) == 1:
            try:
                value = date.fromisoformat(dates[0]).isoformat()
                reason = "Date found; no exact time or timezone inferred."
                clock = re.search(
                    re.escape(value) + r"[T ](\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))\b",
                    context,
                )
                if clock:
                    value = instant(value + "T" + clock[1]).isoformat()
                    reason = "Explicit date, time and offset found. Verify the source."
                elif kind == "event":
                    reason = "Date found; event time, duration and timezone need review."
            except ValueError:
                value, reason = None, "The source date is invalid. Correct it before use."
        elif len(set(dates)) > 1:
            reason = "Multiple dates found; select the intended date yourself."
        identifier = key(f"{kind}:{line_number}:{line}")[:20]
        items.append(
            {
                "id": identifier,
                "kind": kind,
                "title": context[:120],
                "value": value,
                "evidence": context[:240],
                "location": "subject" if line_number == 0 else f"processed body line {line_number}",
                "reason": reason,
                "status": "suggested",
                "confidence": "explicit-pattern" if value else "needs-review",
            }
        )
        if len(items) >= 12:
            break
    signal = subject + "\n" + text[:4000]
    reasons = []
    if important:
        reasons.append("Provider marked this message important.")
    if any(item["kind"] == "deadline" for item in items):
        reasons.append("A deadline or submission phrase was found.")
    if any(item["kind"] == "event" for item in items):
        reasons.append("A meeting or event phrase was found.")
    if re.search(
        r"\b(action required|urgent|please (?:reply|confirm)|follow[ -]?up)\b", signal, re.I
    ):
        reasons.append("An action or follow-up phrase was found.")
    return {
        "important": bool(reasons),
        "reasons": reasons or ["No priority rule matched. You can correct this."],
        "items": items,
        "method": "deterministic-patterns-v1",
        "fingerprint": hashlib.sha256((subject + "\n" + text).encode()).hexdigest(),
    }


def gmail_message(raw: dict[str, Any]) -> dict[str, Any]:
    identifier = str(raw["id"])
    if not re.fullmatch(r"[a-fA-F0-9]{1,128}", identifier):
        raise ValueError("Invalid message identifier")
    payload = raw.get("payload", {})
    headers = {str(h["name"]).lower(): str(h["value"]) for h in payload.get("headers", [])}
    plain: list[str] = []
    html: list[str] = []
    attachments: list[dict[str, Any]] = []
    count = 0
    limited = False

    def walk(part: dict[str, Any], depth: int = 0) -> None:
        nonlocal count, limited
        count += 1
        if depth > 12 or count > 200:
            raise ValueError("MIME limit")
        filename, mime = str(part.get("filename", "")), str(part.get("mimeType", ""))
        if filename:
            if len(attachments) < 20:
                attachments.append(
                    {
                        "name": filename[:200],
                        "mimeType": mime[:100],
                        "size": max(0, int(part.get("body", {}).get("size", 0))),
                    }
                )
            return
        encoded = part.get("body", {}).get("data")
        if encoded and mime in {"text/plain", "text/html"}:
            if not isinstance(encoded, str) or len(encoded) > MAX_TEXT * 4:
                raise ValueError("Message part limit")
            decoded = base64.b64decode(
                encoded + "=" * (-len(encoded) % 4), altchars=b"-_", validate=True
            ).decode("utf-8", errors="replace")
            limited = limited or len(decoded) > MAX_TEXT
            (plain if mime == "text/plain" else html).append(decoded[:MAX_TEXT])
        for child in part.get("parts", []):
            walk(child, depth + 1)

    walk(payload)
    text = clean_text("\n".join(plain or html), html=not bool(plain))
    subject = headers.get("subject", "Untitled message")[:200]
    received = datetime.fromtimestamp(int(raw["internalDate"]) / 1000, UTC)
    return {
        "external_key": key(identifier),
        "received_at": received,
        "data": {
            "subject": subject,
            "sender": headers.get("from", "Unknown sender")[:200],
            "sourceUrl": f"https://mail.google.com/mail/u/0/#all/{identifier}",
            "attachments": attachments,
            "attachmentsIncomplete": len(attachments) >= 20,
            "textLimited": limited or len(text) >= MAX_TEXT or count >= 200,
            **extract(subject, text, "IMPORTANT" in raw.get("labelIds", [])),
        },
    }


def outlook_message(raw: dict[str, Any]) -> dict[str, Any]:
    identifier = str(raw["id"])
    link = str(raw.get("webLink", ""))
    parsed = urlsplit(link)
    if (
        parsed.scheme != "https"
        or parsed.hostname
        not in {"outlook.office.com", "outlook.office365.com", "outlook.live.com"}
        or parsed.username
        or parsed.port not in {None, 443}
    ):
        link = f"https://outlook.office.com/mail/inbox/id/{quote(identifier, safe='')}"
    body = raw.get("body", {})
    text = clean_text(
        str(body.get("content", "")), html=str(body.get("contentType", "")).lower() == "html"
    )
    subject = str(raw.get("subject") or "Untitled message")[:200]
    attachments = [
        {
            "name": str(a.get("name") or "Unnamed attachment")[:200],
            "mimeType": str(a.get("contentType", ""))[:100],
            "size": max(0, int(a.get("size", 0))),
        }
        for a in raw.get("attachments", [])[:20]
    ]
    return {
        "external_key": key(identifier),
        "received_at": instant(raw["receivedDateTime"]),
        "data": {
            "subject": subject,
            "sender": str(
                raw.get("from", {}).get("emailAddress", {}).get("address") or "Unknown sender"
            )[:200],
            "sourceUrl": link,
            "attachments": attachments,
            "textLimited": len(str(body.get("content", ""))) >= MAX_TEXT,
            "attachmentsIncomplete": len(raw.get("attachments", [])) > 20
            or bool(raw.get("attachmentsPageTruncated"))
            or (bool(raw.get("hasAttachments")) and not attachments),
            **extract(subject, text, raw.get("importance") == "high"),
        },
    }


class ItemCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=120)
    value: str | None = Field(default=None, max_length=120)
    status: Literal["confirmed", "dismissed"]

    @field_validator("value")
    @classmethod
    def explicit_date(cls, value: str | None) -> str | None:
        if not value:
            return None
        return (
            date.fromisoformat(value).isoformat()
            if len(value) == 10
            else instant(value).isoformat()
        )

    @model_validator(mode="after")
    def complete(self) -> Self:
        if self.status == "confirmed" and not self.value:
            raise ValueError("A confirmed item needs an explicit date or timestamp with offset.")
        return self


class MailCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1, strict=True)
    important: bool
    items: list[ItemCorrection] = Field(max_length=12)
