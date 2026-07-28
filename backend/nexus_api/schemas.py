from __future__ import annotations

import re
import uuid
from datetime import date, datetime, time
from enum import StrEnum
from typing import Any, Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(item.capitalize() for item in tail)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        use_enum_values=True,
    )


class TravelMode(StrEnum):
    WALK = "walk"
    CYCLE = "cycle"
    TRANSIT = "transit"
    DRIVE = "drive"


class ProfileInput(ApiModel):
    display_name: str = Field(min_length=1, max_length=120)
    timezone: str = Field(min_length=1, max_length=64)
    locale: str = Field(default="en-IN", min_length=2, max_length=16)

    @field_validator("display_name", "locale")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        value = value.strip()
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("Use a valid IANA timezone.") from error
        return value


class PlaceInput(ApiModel):
    label: str = Field(min_length=1, max_length=60)
    address: str = Field(min_length=1, max_length=300)
    role: Literal["home", "campus", "work", "other"] = "other"
    travel_mode: TravelMode = TravelMode.TRANSIT
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_default_origin: bool = False

    @field_validator("label", "address")
    @classmethod
    def strip_place_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def coordinates_are_paired(self) -> Self:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be supplied together.")
        return self


class PlaceResponse(PlaceInput):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class QuietHours(ApiModel):
    enabled: bool = True
    starts_at: time = time(22, 30)
    ends_at: time = time(7, 0)

    @model_validator(mode="after")
    def validate_interval(self) -> Self:
        if self.enabled and self.starts_at == self.ends_at:
            raise ValueError("Quiet hours must have different start and end times.")
        return self


class NotificationPreferences(ApiModel):
    style: Literal["essential", "balanced", "proactive"] = "balanced"
    in_app: bool = True
    email_digest: bool = False
    device_push: bool = False
    morning_brief_at: time = time(7, 30)
    evening_brief_at: time = time(20, 30)
    quiet_hours: QuietHours = Field(default_factory=QuietHours)


class PersonalizationPreferences(ApiModel):
    concise_explanations: bool = True
    learn_from_feedback: bool = True
    preferred_travel_mode: TravelMode = TravelMode.TRANSIT


class PrivacyPreferences(ApiModel):
    observation_paused: bool = False
    automations_paused: bool = False
    default_retention: Literal["none", "working-context", "30-days", "until-disconnected"] = (
        "30-days"
    )
    future_model_use: Literal["never", "allowed-for-purpose"] = "allowed-for-purpose"


class AccessibilityPreferences(ApiModel):
    reduced_motion: bool = False
    high_contrast: bool = False
    larger_text: bool = False


class PreferenceInput(ApiModel):
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)
    personalization: PersonalizationPreferences = Field(default_factory=PersonalizationPreferences)
    privacy: PrivacyPreferences = Field(default_factory=PrivacyPreferences)
    accessibility: AccessibilityPreferences = Field(default_factory=AccessibilityPreferences)


class CurrentUserResponse(ApiModel):
    id: uuid.UUID
    email: str | None
    display_name: str | None
    onboarding_completed: bool
    status: str
    created_at: datetime
    updated_at: datetime


class OnboardingRequest(ApiModel):
    profile: ProfileInput
    places: list[PlaceInput] = Field(default_factory=list, max_length=8)
    preferences: PreferenceInput = Field(default_factory=PreferenceInput)


class OnboardingResponse(ApiModel):
    user: CurrentUserResponse
    profile: ProfileInput
    places: list[PlaceResponse]
    preferences: PreferenceInput


class CaptureKind(StrEnum):
    NOTE = "note"
    LOCAL_EVENT_DRAFT = "local-event-draft"


class CaptureInput(ApiModel):
    title: str = Field(min_length=1, max_length=160)
    raw_text: str = Field(min_length=1, max_length=20_000)
    source_label: str | None = Field(default=None, max_length=80)
    canonical_fields: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str = Field(min_length=8, max_length=128)

    @field_validator("title", "raw_text")
    @classmethod
    def strip_required_capture_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank.")
        return value

    @field_validator("source_label")
    @classmethod
    def strip_optional_capture_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class EventDraftInput(CaptureInput):
    @model_validator(mode="after")
    def validate_canonical_event(self) -> Self:
        event_date = self.canonical_fields.get("date")
        start_time = self.canonical_fields.get("startTime")
        end_time = self.canonical_fields.get("endTime")
        if not isinstance(event_date, str) or not isinstance(start_time, str):
            raise ValueError("Local event drafts require an explicit date and start time.")
        try:
            date.fromisoformat(event_date)
            parsed_start = time.fromisoformat(start_time)
            parsed_end = (
                time.fromisoformat(end_time) if isinstance(end_time, str) and end_time else None
            )
        except ValueError as error:
            raise ValueError("Use ISO date and 24-hour time values.") from error
        if parsed_end is not None and parsed_end <= parsed_start:
            raise ValueError("End time must be after start time.")
        if re.fullmatch(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", event_date):
            raise ValueError("Ambiguous numeric dates are not accepted.")
        return self


class CapturePatch(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    raw_text: str | None = Field(default=None, min_length=1, max_length=20_000)
    source_label: str | None = Field(default=None, max_length=80)
    canonical_fields: dict[str, Any] | None = None
    status: Literal["saved", "corrected", "archived"] | None = None


class CaptureResponse(ApiModel):
    id: uuid.UUID
    kind: CaptureKind
    title: str
    raw_text: str
    source_label: str | None
    canonical_fields: dict[str, Any]
    provenance: Literal["manual-paste"]
    status: str
    created_at: datetime
    updated_at: datetime


class AuditEventResponse(ApiModel):
    id: uuid.UUID
    event_type: str
    request_id: str
    target_type: str
    target_id: str | None
    result: str
    changed_fields: list[str]
    created_at: datetime


class ApiEnvelope(ApiModel):
    data: Any
    request_id: str


class ApiErrorDetail(ApiModel):
    code: str
    message: str
    request_id: str


class ApiErrorEnvelope(ApiModel):
    error: ApiErrorDetail
