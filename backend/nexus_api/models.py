from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
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
