"""Deterministic scheduling; no provider calls, identity shortcuts or implicit actions."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .models import Preference


def utc(value: datetime) -> datetime:
    # SQLite test storage drops tzinfo; PostgreSQL returns aware timestamps.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def local_instant(day: date, at: time, zone: str) -> datetime:
    """Earlier fold once on autumn DST; first valid minute after a spring gap."""
    tz = ZoneInfo(zone)
    wall = datetime.combine(day, at.replace(tzinfo=None))
    for minutes in range(181):
        candidate = wall + timedelta(minutes=minutes)
        instants = [candidate.replace(tzinfo=tz, fold=fold).astimezone(UTC) for fold in (0, 1)]
        valid = [i for i in instants if i.astimezone(tz).replace(tzinfo=None) == candidate]
        if valid:
            return min(valid)
    raise ValueError("No valid local schedule time near the requested time.")


def quiet_until(now: datetime, preference: Preference, zone: str) -> datetime | None:
    if not preference.quiet_hours_enabled:
        return None
    local = utc(now).astimezone(ZoneInfo(zone))
    clock = local.time().replace(tzinfo=None)
    start, end = preference.quiet_hours_start, preference.quiet_hours_end
    inside = start <= clock < end if start < end else clock >= start or clock < end
    if not inside:
        return None
    end_day = local.date() + timedelta(days=int(start >= end and clock >= start))
    result = local_instant(end_day, end, zone)
    if result <= utc(now):
        # The quiet interval may end during the second fold of an autumn DST transition.
        result = datetime.combine(end_day, end, ZoneInfo(zone)).replace(fold=1).astimezone(UTC)
    return result


def paused(preference: Preference) -> bool:
    return preference.observation_paused or preference.automations_paused
