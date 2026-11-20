"""Bounded local imports. No URLs, attachments, alarms or embedded code are executed."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import recurring_ical_events
from icalendar import Calendar

from .calendar_rules import EventData, TimetableInput, event_times, key
from .errors import ApiError
from .notification_rules import local_instant


def import_ics(contents: str, timezone: str, now: datetime | None = None) -> list[EventData]:
    now = now or datetime.now(UTC)
    start, end = now - timedelta(days=30), now + timedelta(days=90)
    if len(contents.encode()) > 1_000_000 or contents.upper().count("BEGIN:") > 800:
        raise ApiError(
            413, "calendar_too_large", "Use an ICS file under 1 MB and 200 event definitions."
        )
    try:
        calendar = Calendar.from_ical(contents)
        components = calendar.walk("VEVENT")
        if len(components) > 200 or calendar.errors:
            raise ValueError("Too many or invalid event definitions")
        for item in components:
            if item.errors or "DTSTART" not in item or "UID" not in item:
                raise ValueError("An event requires UID and DTSTART")
            rule = item.get("RRULE")
            if rule:
                allowed = {
                    "FREQ",
                    "COUNT",
                    "INTERVAL",
                    "UNTIL",
                    "BYDAY",
                    "BYMONTH",
                    "BYMONTHDAY",
                    "BYSETPOS",
                    "WKST",
                }
                if set(rule) - allowed or str(rule.get("FREQ", [""])[0]) not in {
                    "DAILY",
                    "WEEKLY",
                    "MONTHLY",
                    "YEARLY",
                }:
                    raise ValueError("Unsupported recurrence rule")
                if (
                    not 1 <= int(rule.get("COUNT", [1])[0]) <= 1000
                    or not 1 <= int(rule.get("INTERVAL", [1])[0]) <= 366
                ):
                    raise ValueError("Recurrence exceeds the import bound")
                original = item.decoded("DTSTART")
                original_date = original.date() if isinstance(original, datetime) else original
                if original_date < (now - timedelta(days=730)).date():
                    raise ValueError("Export a recent window for older recurring series")
        expanded = recurring_ical_events.of(calendar).between(start, end)
        if len(expanded) > 5000:
            raise ValueError("Too many event occurrences")
        results: dict[str, EventData] = {}
        for item in expanded:
            if str(item.get("STATUS", "")).upper() == "CANCELLED":
                continue
            begins = item.decoded("DTSTART")
            finishes = item.decoded("DTEND", None)
            if finishes is None:
                duration = item.decoded("DURATION", None)
                finishes = begins + (
                    duration
                    if isinstance(duration, timedelta)
                    else timedelta(days=1)
                    if not isinstance(begins, datetime)
                    else timedelta()
                )
            times = event_times(begins, finishes, timezone)
            occurrence = item.get("RECURRENCE-ID")
            discriminator = str(occurrence) if occurrence is not None else str(begins)
            identifier = key(f"{item['UID']}:{discriminator}")
            results[identifier] = EventData(
                external_key=identifier,
                title=str(item.get("SUMMARY") or "Untitled event")[:200],
                location=str(item.get("LOCATION") or "")[:300],
                busy=str(item.get("TRANSP", "OPAQUE")).upper() != "TRANSPARENT",
                status="tentative"
                if str(item.get("STATUS", "")).upper() == "TENTATIVE"
                else "confirmed",
                **times,
            )
        return list(results.values())
    except ApiError:
        raise
    except Exception as error:
        raise ApiError(
            422,
            "invalid_ics",
            "This ICS could not be imported. Check event times, timezone and recurrence limits; "
            "no existing import was changed.",
        ) from error


def timetable_events(value: TimetableInput) -> list[EventData]:
    output = []
    for offset in range((value.ends_on - value.starts_on).days + 1):
        day = value.starts_on + timedelta(days=offset)
        if day.weekday() not in value.weekdays:
            continue
        output.append(
            EventData(
                external_key=key(day.isoformat()),
                title=value.title,
                location=value.location,
                starts_at=local_instant(day, value.start_time, value.timezone),
                ends_at=local_instant(day, value.end_time, value.timezone),
                timezone=value.timezone,
                preparation_minutes=value.preparation_minutes,
            )
        )
    return output
