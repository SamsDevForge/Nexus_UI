"""Provider-neutral calendar contracts and deterministic planning rules."""

from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime, time, timedelta
from typing import Any, Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from babel.core import get_global
from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)

Provider = Literal["google", "microsoft"]


def key(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def zone(value: str) -> ZoneInfo:
    mapped = get_global("windows_zone_mapping").get(value, value)
    return ZoneInfo(mapped)


def instant(value: str, timezone: str | None = None) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        if not timezone:
            raise ValueError("A calendar timestamp requires a timezone.")
        tz = zone(timezone)
        candidates = [parsed.replace(tzinfo=tz, fold=f).astimezone(UTC) for f in (0, 1)]
        valid = {i for i in candidates if i.astimezone(tz).replace(tzinfo=None) == parsed}
        if len(valid) != 1:
            raise ValueError("An ambiguous or nonexistent event time requires an explicit offset.")
        return valid.pop()
    return parsed.astimezone(UTC)


class EventData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    external_key: str
    title: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=300)
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    timezone: str
    all_day: bool = False
    starts_on: str | None = None
    ends_on: str | None = None
    busy: bool = True
    status: Literal["confirmed", "tentative", "declined"] = "confirmed"
    preparation_minutes: int = Field(default=15, ge=0, le=240)
    source_updated_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def valid_interval(self) -> Self:
        if not self.starts_at <= self.ends_at <= self.starts_at + timedelta(days=366):
            raise ValueError("Events require an end after the start, within 366 days.")
        if self.starts_at == self.ends_at:
            self.busy, self.preparation_minutes = False, 0
        zone(self.timezone)
        if self.all_day and (not self.starts_on or not self.ends_on):
            raise ValueError("All-day events require their original source dates.")
        return self

    @field_validator("starts_at", "ends_at", "source_updated_at")
    @classmethod
    def canonical_utc(cls, value: datetime | None) -> datetime | None:
        return value.astimezone(UTC) if value is not None else None


class ManualEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=300)
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    preparation_minutes: int = Field(default=15, ge=0, le=240, strict=True)
    idempotency_key: str = Field(min_length=8, max_length=100)

    @model_validator(mode="after")
    def valid_interval(self) -> Self:
        if not self.starts_at < self.ends_at <= self.starts_at + timedelta(days=7):
            raise ValueError("Manual events must end within seven days of their start.")
        return self


class TimetableInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=300)
    timezone: str
    weekdays: list[StrictInt] = Field(min_length=1, max_length=7)
    starts_on: date
    ends_on: date
    start_time: time
    end_time: time
    preparation_minutes: int = Field(default=15, ge=0, le=240, strict=True)

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Use an IANA timezone such as Asia/Kolkata.") from error
        return value

    @model_validator(mode="after")
    def bounded(self) -> Self:
        if not self.starts_on <= self.ends_on <= self.starts_on + timedelta(days=120):
            raise ValueError("A timetable may span at most 120 days.")
        if any(type(day) is not int or not 0 <= day <= 6 for day in self.weekdays):
            raise ValueError("Weekdays are Monday=0 through Sunday=6.")
        if self.start_time.tzinfo or self.end_time.tzinfo or not self.start_time < self.end_time:
            raise ValueError("Use same-day local timetable times, with the end after the start.")
        return self


def conflicts(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Intervals are half-open. Preparation is suggested time, never a calendar write."""
    rows = sorted(
        (e for e in events if e["busy"] and e["status"] != "declined"), key=lambda e: e["startsAt"]
    )
    found = []
    for index, first in enumerate(rows):
        first_end = instant(first["endsAt"])
        for second in rows[index + 1 :]:
            start = instant(second["startsAt"])
            if start - timedelta(minutes=240) >= first_end:
                break
            prepare = start - timedelta(
                minutes=second["preparationMinutes"] if not second["allDay"] else 0
            )
            if prepare >= first_end:
                # Later rows can have longer preparation, so do not break the scan.
                continue
            if instant(first["startsAt"]) < instant(second["endsAt"]):
                found.append(
                    {
                        "firstId": first["id"],
                        "secondId": second["id"],
                        "kind": "overlap" if start < first_end else "preparation",
                        "message": "Busy events overlap."
                        if start < first_end
                        else "The suggested preparation buffer overlaps an earlier event.",
                    }
                )
            if len(found) >= 200:
                return found
    return found


def event_times(start: date | datetime, end: date | datetime, timezone: str) -> dict[str, Any]:
    if isinstance(start, datetime):
        if not isinstance(end, datetime):
            raise ValueError("Mixed all-day and timed event boundaries.")
        return {
            "starts_at": instant(start.isoformat(), timezone),
            "ends_at": instant(end.isoformat(), timezone),
            "timezone": zone(timezone).key,
        }
    if isinstance(end, datetime):
        raise ValueError("Mixed event boundaries.")
    return {
        "starts_at": datetime.combine(start, time(), zone(timezone)).astimezone(UTC),
        "ends_at": datetime.combine(end, time(), zone(timezone)).astimezone(UTC),
        "timezone": zone(timezone).key,
        "all_day": True,
        "starts_on": start.isoformat(),
        "ends_on": end.isoformat(),
        "preparation_minutes": 0,
    }


def google_event(raw: dict[str, Any], timezone: str) -> tuple[str, EventData | None]:
    identifier = key(str(raw["id"]))
    if raw.get("status") == "cancelled":
        return identifier, None
    start, end = raw["start"], raw["end"]
    if "date" in start:
        times = event_times(
            date.fromisoformat(start["date"]), date.fromisoformat(end["date"]), timezone
        )
    else:
        tz = start.get("timeZone", timezone)
        times = {
            "starts_at": instant(start["dateTime"], tz),
            "ends_at": instant(end["dateTime"], end.get("timeZone", tz)),
            "timezone": zone(tz).key,
        }
    declined = any(
        a.get("self") and a.get("responseStatus") == "declined" for a in raw.get("attendees", [])
    )
    return identifier, EventData(
        external_key=identifier,
        title=str(raw.get("summary") or "Untitled event")[:200],
        location=str(raw.get("location") or "")[:300],
        busy=raw.get("transparency") != "transparent" and not declined,
        status="declined"
        if declined
        else "tentative"
        if raw.get("status") == "tentative"
        else "confirmed",
        source_updated_at=instant(raw["updated"]) if raw.get("updated") else None,
        **times,
    )


def microsoft_event(raw: dict[str, Any]) -> tuple[str, EventData | None]:
    identifier = key(str(raw["id"]))
    if "@removed" in raw or raw.get("isCancelled"):
        return identifier, None
    start, end = raw["start"], raw["end"]
    starts, ends = (
        instant(start["dateTime"], start["timeZone"]),
        instant(end["dateTime"], end["timeZone"]),
    )
    timezone = zone(raw.get("originalStartTimeZone", start["timeZone"])).key
    all_day = bool(raw.get("isAllDay"))
    declined = raw.get("responseStatus", {}).get("response") == "declined"
    return identifier, EventData(
        external_key=identifier,
        title=str(raw.get("subject") or "Untitled event")[:200],
        location=str(raw.get("location", {}).get("displayName") or "")[:300],
        starts_at=starts,
        ends_at=ends,
        timezone=timezone,
        all_day=all_day,
        starts_on=starts.astimezone(zone(timezone)).date().isoformat() if all_day else None,
        ends_on=ends.astimezone(zone(timezone)).date().isoformat() if all_day else None,
        preparation_minutes=0 if all_day else 15,
        busy=raw.get("showAs") != "free" and not declined,
        status="declined"
        if declined
        else "tentative"
        if raw.get("showAs") == "tentative"
        else "confirmed",
        source_updated_at=instant(raw["lastModifiedDateTime"])
        if raw.get("lastModifiedDateTime")
        else None,
    )
