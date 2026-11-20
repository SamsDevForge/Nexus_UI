from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(24), default="active", nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(120))

    identities: Mapped[list[ExternalIdentity]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    profile: Mapped[Profile | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    preferences: Mapped[Preference | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class ExternalIdentity(TimestampMixin, Base):
    __tablename__ = "external_identities"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auth_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="identities")


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    locale: Mapped[str] = mapped_column(String(16), default="en-IN", nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class Place(TimestampMixin, Base):
    __tablename__ = "places"
    __table_args__ = (Index("ix_places_user_label", "user_id", "label"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(60), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    role: Mapped[str] = mapped_column(String(24), default="other", nullable=False)
    travel_mode: Mapped[str] = mapped_column(String(16), default="transit", nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_default_origin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Preference(TimestampMixin, Base):
    __tablename__ = "preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    travel_mode: Mapped[str] = mapped_column(String(16), default="transit", nullable=False)
    notification_style: Mapped[str] = mapped_column(String(16), default="balanced", nullable=False)
    in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_digest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    device_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    morning_brief_at: Mapped[time] = mapped_column(Time, default=time(7, 30), nullable=False)
    evening_brief_at: Mapped[time] = mapped_column(Time, default=time(20, 30), nullable=False)
    morning_brief_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    evening_brief_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quiet_hours_start: Mapped[time] = mapped_column(Time, default=time(22, 30), nullable=False)
    quiet_hours_end: Mapped[time] = mapped_column(Time, default=time(7, 0), nullable=False)
    concise_explanations: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    learn_from_feedback: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    observation_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    automations_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_retention: Mapped[str] = mapped_column(String(24), default="30-days", nullable=False)
    future_model_use: Mapped[str] = mapped_column(
        String(32), default="allowed-for-purpose", nullable=False
    )
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    larger_text: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="preferences")


class ManualCapture(TimestampMixin, Base):
    __tablename__ = "manual_captures"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_capture_user_idempotency"),
        Index("ix_manual_captures_user_kind_created", "user_id", "kind", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    canonical_fields: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    source_label: Mapped[str | None] = mapped_column(String(80))
    provenance: Mapped[str] = mapped_column(String(24), default="manual-paste", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="saved", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_events_user_created", "user_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type: Mapped[str] = mapped_column(String(48), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(64))
    result: Mapped[str] = mapped_column(String(24), nullable=False)
    changed_fields: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "dedup_key", name="uq_notification_user_dedup"),
        Index("ix_notification_queue", "status", "due_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(16))
    dedup_key: Mapped[str] = mapped_column(String(160))
    timezone: Mapped[str] = mapped_column(String(64))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), default="queued")
    reason: Mapped[str | None] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(120), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PushDevice(TimestampMixin, Base):
    __tablename__ = "push_devices"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    token_encrypted: Mapped[str] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(String(16))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class PushDelivery(TimestampMixin, Base):
    __tablename__ = "push_deliveries"
    __table_args__ = (
        UniqueConstraint("notification_id", "device_id", name="uq_push_notification_device"),
        Index("ix_push_queue", "status", "created_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    notification_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notifications.id", ondelete="CASCADE")
    )
    device_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("push_devices.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(24), default="queued")
    reason: Mapped[str | None] = mapped_column(String(64))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_message_id: Mapped[str | None] = mapped_column(String(255))


class CalendarConnection(TimestampMixin, Base):
    __tablename__ = "calendar_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_calendar_owner_provider"),
        UniqueConstraint("id", "user_id", name="uq_calendar_connection_owner"),
        Index("ix_calendar_sync_due", "status", "next_sync_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(24), default="connected")
    generation: Mapped[int] = mapped_column(Integer, default=1)
    sync_version: Mapped[int] = mapped_column(Integer, default=1)
    access_encrypted: Mapped[str | None] = mapped_column(Text)
    refresh_encrypted: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    cursor_encrypted: Mapped[str | None] = mapped_column(Text)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_full_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    watch_id: Mapped[str | None] = mapped_column(String(255))
    watch_resource: Mapped[str | None] = mapped_column(String(255))
    watch_secret_hash: Mapped[str | None] = mapped_column(String(64))
    watch_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(64))


class CalendarOAuthState(Base):
    __tablename__ = "calendar_oauth_states"
    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(16))
    verifier_encrypted: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CalendarCollection(TimestampMixin, Base):
    __tablename__ = "calendar_collections"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "name", name="uq_calendar_collection_name"),
        UniqueConstraint("id", "user_id", name="uq_calendar_collection_owner"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(100))
    fingerprint: Mapped[str | None] = mapped_column(String(64))


class CalendarEvent(TimestampMixin, Base):
    __tablename__ = "calendar_events"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_key", name="uq_calendar_remote_event"),
        UniqueConstraint("collection_id", "external_key", name="uq_calendar_local_event"),
        ForeignKeyConstraint(
            ["connection_id", "user_id"],
            ["calendar_connections.id", "calendar_connections.user_id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["collection_id", "user_id"],
            ["calendar_collections.id", "calendar_collections.user_id"],
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "(connection_id IS NULL) != (collection_id IS NULL)", name="ck_calendar_one_source"
        ),
        Index("ix_calendar_owner_start", "user_id", "starts_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    connection_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    collection_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    external_key: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(300), default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(64))
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    starts_on: Mapped[str | None] = mapped_column(String(10))
    ends_on: Mapped[str | None] = mapped_column(String(10))
    busy: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(16), default="confirmed")
    preparation_minutes: Mapped[int] = mapped_column(Integer, default=15)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
