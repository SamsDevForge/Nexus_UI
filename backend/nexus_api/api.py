from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Query, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .audit import record_audit
from .errors import ApiError
from .identity import (
    AuthenticatedPrincipal,
    IdentityUnavailableError,
    IdentityVerificationError,
    IdentityVerifier,
)
from .models import (
    AuditEvent,
    ExternalIdentity,
    ManualCapture,
    Place,
    Preference,
    Profile,
    User,
)
from .schemas import (
    AuditEventResponse,
    CaptureInput,
    CaptureKind,
    CapturePatch,
    CaptureResponse,
    CurrentUserResponse,
    EventDraftInput,
    OnboardingRequest,
    OnboardingResponse,
    PlaceInput,
    PlaceResponse,
    PreferenceInput,
    ProfileInput,
)

api_router = APIRouter(prefix="/api/v1")
health_router = APIRouter(prefix="/health")


def request_id(request: Request) -> str:
    return str(request.state.request_id)


def envelope(request: Request, data: Any) -> dict[str, Any]:
    return {"data": data, "requestId": request_id(request)}


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    database = request.app.state.database
    if database.session_factory is None:
        raise ApiError(503, "database_unavailable", "The database is not configured.")
    async for session in database.session():
        yield session


SessionDependency = Annotated[AsyncSession, Depends(get_session)]


async def authenticate(
    request: Request,
    session: SessionDependency,
    authorization: Annotated[str | None, Header()] = None,
) -> AuthenticatedPrincipal:
    if not authorization or not authorization.startswith("Bearer "):
        await record_audit(
            session,
            user_id=None,
            event_type="authentication.missing",
            request_id=request_id(request),
            target_type="session",
            target_id=None,
            result="denied",
        )
        await session.commit()
        raise ApiError(401, "authentication_required", "Sign in to continue.")

    token = authorization.removeprefix("Bearer ").strip()
    verifier: IdentityVerifier = request.app.state.identity_verifier
    try:
        return await verifier.verify(token)
    except IdentityUnavailableError as error:
        raise ApiError(503, "identity_unavailable", str(error)) from error
    except IdentityVerificationError as error:
        await record_audit(
            session,
            user_id=None,
            event_type="authentication.invalid",
            request_id=request_id(request),
            target_type="session",
            target_id=None,
            result="denied",
        )
        await session.commit()
        raise ApiError(401, "invalid_identity_token", str(error)) from error


PrincipalDependency = Annotated[AuthenticatedPrincipal, Depends(authenticate)]


async def resolve_user(
    request: Request,
    session: SessionDependency,
    principal: PrincipalDependency,
) -> User:
    identity = await session.scalar(
        select(ExternalIdentity).where(
            ExternalIdentity.provider == principal.provider,
            ExternalIdentity.subject == principal.subject,
        )
    )
    created = False
    if identity is None:
        user = User(
            email=principal.email,
            display_name=principal.display_name,
        )
        identity = ExternalIdentity(
            user=user,
            provider=principal.provider,
            subject=principal.subject,
            email_verified=principal.email_verified,
            auth_time=principal.auth_time,
        )
        session.add_all([user, identity])
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            identity = await session.scalar(
                select(ExternalIdentity).where(
                    ExternalIdentity.provider == principal.provider,
                    ExternalIdentity.subject == principal.subject,
                )
            )
            if identity is None:
                raise
            existing_user = await session.get(User, identity.user_id)
            if existing_user is None:
                raise ApiError(
                    401, "account_unavailable", "The account is unavailable."
                ) from None
            user = existing_user
        else:
            created = True
            session.add(
                Preference(
                    user_id=user.id,
                )
            )
    else:
        existing_user = await session.get(User, identity.user_id)
        if existing_user is None or existing_user.status != "active":
            raise ApiError(403, "account_unavailable", "The account is unavailable.")
        user = existing_user
        identity.email_verified = principal.email_verified
        identity.auth_time = principal.auth_time
        if principal.email:
            user.email = principal.email
        if principal.display_name and not user.display_name:
            user.display_name = principal.display_name

    await record_audit(
        session,
        user_id=user.id,
        event_type="authentication.first_login" if created else "authentication.succeeded",
        request_id=request_id(request),
        target_type="user",
        target_id=str(user.id),
        result="success",
        changed_fields=["identity"] if created else [],
    )
    await session.commit()
    return user


UserDependency = Annotated[User, Depends(resolve_user)]


def user_response(user: User) -> CurrentUserResponse:
    return CurrentUserResponse.model_validate(user)


def profile_response(profile: Profile) -> ProfileInput:
    return ProfileInput.model_validate(profile)


def place_response(place: Place) -> PlaceResponse:
    return PlaceResponse.model_validate(place)


def preference_response(preference: Preference) -> PreferenceInput:
    return PreferenceInput(
        notifications={
            "style": preference.notification_style,
            "inApp": preference.in_app,
            "emailDigest": preference.email_digest,
            "devicePush": preference.device_push,
            "morningBriefAt": preference.morning_brief_at,
            "eveningBriefAt": preference.evening_brief_at,
            "quietHours": {
                "enabled": preference.quiet_hours_enabled,
                "startsAt": preference.quiet_hours_start,
                "endsAt": preference.quiet_hours_end,
            },
        },
        personalization={
            "conciseExplanations": preference.concise_explanations,
            "learnFromFeedback": preference.learn_from_feedback,
            "preferredTravelMode": preference.travel_mode,
        },
        privacy={
            "observationPaused": preference.observation_paused,
            "automationsPaused": preference.automations_paused,
            "defaultRetention": preference.default_retention,
            "futureModelUse": preference.future_model_use,
        },
        accessibility={
            "reducedMotion": preference.reduced_motion,
            "highContrast": preference.high_contrast,
            "largerText": preference.larger_text,
        },
    )


def apply_preferences(model: Preference, value: PreferenceInput) -> list[str]:
    changed: list[str] = []
    updates = {
        "notification_style": value.notifications.style,
        "in_app": value.notifications.in_app,
        "email_digest": value.notifications.email_digest,
        "device_push": value.notifications.device_push,
        "morning_brief_at": value.notifications.morning_brief_at,
        "evening_brief_at": value.notifications.evening_brief_at,
        "quiet_hours_enabled": value.notifications.quiet_hours.enabled,
        "quiet_hours_start": value.notifications.quiet_hours.starts_at,
        "quiet_hours_end": value.notifications.quiet_hours.ends_at,
        "concise_explanations": value.personalization.concise_explanations,
        "learn_from_feedback": value.personalization.learn_from_feedback,
        "travel_mode": value.personalization.preferred_travel_mode,
        "observation_paused": value.privacy.observation_paused,
        "automations_paused": value.privacy.automations_paused,
        "default_retention": value.privacy.default_retention,
        "future_model_use": value.privacy.future_model_use,
        "reduced_motion": value.accessibility.reduced_motion,
        "high_contrast": value.accessibility.high_contrast,
        "larger_text": value.accessibility.larger_text,
    }
    for field, next_value in updates.items():
        if getattr(model, field) != next_value:
            setattr(model, field, next_value)
            changed.append(field)
    return changed


def capture_response(capture: ManualCapture) -> CaptureResponse:
    return CaptureResponse.model_validate(capture)


async def owned_place_or_404(
    session: AsyncSession, user_id: uuid.UUID, place_id: uuid.UUID
) -> Place:
    place = await session.scalar(
        select(Place).where(Place.id == place_id, Place.user_id == user_id)
    )
    if place is None:
        raise ApiError(404, "resource_not_found", "The requested resource was not found.")
    return place


async def owned_capture_or_404(
    session: AsyncSession, user_id: uuid.UUID, capture_id: uuid.UUID
) -> ManualCapture:
    capture = await session.scalar(
        select(ManualCapture).where(
            ManualCapture.id == capture_id,
            ManualCapture.user_id == user_id,
        )
    )
    if capture is None:
        raise ApiError(404, "resource_not_found", "The requested resource was not found.")
    return capture


@health_router.get("/live")
async def health_live(request: Request) -> dict[str, Any]:
    return envelope(request, {"status": "live"})


@health_router.get("/ready")
async def health_ready(request: Request) -> dict[str, Any]:
    ready = await request.app.state.database.ready()
    if not ready:
        raise ApiError(503, "database_not_ready", "The database is not ready.")
    return envelope(request, {"status": "ready"})


@api_router.get("/me")
async def get_me(request: Request, user: UserDependency) -> dict[str, Any]:
    return envelope(request, user_response(user))


@api_router.get("/profile")
async def get_profile(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    profile = await session.get(Profile, user.id)
    if profile is None:
        raise ApiError(404, "profile_not_configured", "Complete onboarding to create a profile.")
    return envelope(request, profile_response(profile))


@api_router.put("/profile")
async def put_profile(
    payload: ProfileInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    profile = await session.get(Profile, user.id)
    changed = ["display_name", "timezone", "locale"]
    if profile is None:
        profile = Profile(user_id=user.id, **payload.model_dump())
        session.add(profile)
    else:
        changed = [
            field
            for field, value in payload.model_dump().items()
            if getattr(profile, field) != value
        ]
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)
    user.display_name = payload.display_name
    await record_audit(
        session,
        user_id=user.id,
        event_type="profile.updated",
        request_id=request_id(request),
        target_type="profile",
        target_id=str(user.id),
        result="success",
        changed_fields=changed,
    )
    await session.commit()
    await session.refresh(profile)
    return envelope(request, profile_response(profile))


@api_router.get("/preferences")
async def get_preferences(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    preference = await session.get(Preference, user.id)
    if preference is None:
        preference = Preference(user_id=user.id)
        session.add(preference)
        await session.commit()
        await session.refresh(preference)
    return envelope(request, preference_response(preference))


@api_router.put("/preferences")
async def put_preferences(
    payload: PreferenceInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    preference = await session.get(Preference, user.id)
    if preference is None:
        preference = Preference(user_id=user.id)
        session.add(preference)
    changed = apply_preferences(preference, payload)
    await record_audit(
        session,
        user_id=user.id,
        event_type="preferences.updated",
        request_id=request_id(request),
        target_type="preferences",
        target_id=str(user.id),
        result="success",
        changed_fields=changed,
    )
    await session.commit()
    await session.refresh(preference)
    return envelope(request, preference_response(preference))


@api_router.get("/places")
async def list_places(
    request: Request, session: SessionDependency, user: UserDependency
) -> dict[str, Any]:
    places = list(
        await session.scalars(
            select(Place).where(Place.user_id == user.id).order_by(Place.created_at)
        )
    )
    return envelope(request, [place_response(place) for place in places])


@api_router.post("/places", status_code=status.HTTP_201_CREATED)
async def create_place(
    payload: PlaceInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    place = Place(user_id=user.id, **payload.model_dump())
    session.add(place)
    await session.flush()
    await record_audit(
        session,
        user_id=user.id,
        event_type="place.created",
        request_id=request_id(request),
        target_type="place",
        target_id=str(place.id),
        result="success",
        changed_fields=list(payload.model_fields_set),
    )
    await session.commit()
    await session.refresh(place)
    return envelope(request, place_response(place))


@api_router.put("/places/{place_id}")
async def update_place(
    place_id: uuid.UUID,
    payload: PlaceInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    place = await owned_place_or_404(session, user.id, place_id)
    changed = [
        field for field, value in payload.model_dump().items() if getattr(place, field) != value
    ]
    for field, value in payload.model_dump().items():
        setattr(place, field, value)
    await record_audit(
        session,
        user_id=user.id,
        event_type="place.updated",
        request_id=request_id(request),
        target_type="place",
        target_id=str(place.id),
        result="success",
        changed_fields=changed,
    )
    await session.commit()
    await session.refresh(place)
    return envelope(request, place_response(place))


@api_router.delete("/places/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place(
    place_id: uuid.UUID,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> Response:
    place = await owned_place_or_404(session, user.id, place_id)
    await session.delete(place)
    await record_audit(
        session,
        user_id=user.id,
        event_type="place.deleted",
        request_id=request_id(request),
        target_type="place",
        target_id=str(place.id),
        result="success",
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.post("/onboarding/complete")
async def complete_onboarding(
    payload: OnboardingRequest,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    profile = await session.get(Profile, user.id)
    if profile is None:
        profile = Profile(user_id=user.id, **payload.profile.model_dump())
        session.add(profile)
    else:
        for field, value in payload.profile.model_dump().items():
            setattr(profile, field, value)
    user.display_name = payload.profile.display_name

    preference = await session.get(Preference, user.id)
    if preference is None:
        preference = Preference(user_id=user.id)
        session.add(preference)
    preference_fields = apply_preferences(preference, payload.preferences)

    await session.execute(delete(Place).where(Place.user_id == user.id))
    places = [Place(user_id=user.id, **value.model_dump()) for value in payload.places]
    session.add_all(places)
    user.onboarding_completed = True
    await session.flush()
    await record_audit(
        session,
        user_id=user.id,
        event_type="onboarding.completed",
        request_id=request_id(request),
        target_type="user",
        target_id=str(user.id),
        result="success",
        changed_fields=[
            "display_name",
            "timezone",
            "locale",
            "places",
            *preference_fields,
        ],
    )
    await session.commit()
    await session.refresh(user)
    await session.refresh(profile)
    await session.refresh(preference)
    for place in places:
        await session.refresh(place)
    return envelope(
        request,
        OnboardingResponse(
            user=user_response(user),
            profile=profile_response(profile),
            places=[place_response(place) for place in places],
            preferences=preference_response(preference),
        ),
    )


async def create_capture(
    *,
    kind: CaptureKind,
    payload: CaptureInput,
    request: Request,
    session: AsyncSession,
    user: User,
) -> dict[str, Any]:
    existing = await session.scalar(
        select(ManualCapture).where(
            ManualCapture.user_id == user.id,
            ManualCapture.idempotency_key == payload.idempotency_key,
        )
    )
    if existing is not None:
        return envelope(request, capture_response(existing))

    capture = ManualCapture(
        user_id=user.id,
        kind=kind.value,
        title=payload.title,
        raw_text=payload.raw_text,
        source_label=payload.source_label,
        canonical_fields=payload.canonical_fields,
        idempotency_key=payload.idempotency_key,
        provenance="manual-paste",
        status="saved",
    )
    session.add(capture)
    await session.flush()
    await record_audit(
        session,
        user_id=user.id,
        event_type=(
            "quick_capture.note_created"
            if kind == CaptureKind.NOTE
            else "quick_capture.local_event_created"
        ),
        request_id=request_id(request),
        target_type="manual_capture",
        target_id=str(capture.id),
        result="success",
        changed_fields=["kind", "source_label", "canonical_fields"],
    )
    await session.commit()
    await session.refresh(capture)
    return envelope(request, capture_response(capture))


@api_router.post("/captures/notes", status_code=status.HTTP_201_CREATED)
async def create_note_capture(
    payload: CaptureInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    return await create_capture(
        kind=CaptureKind.NOTE,
        payload=payload,
        request=request,
        session=session,
        user=user,
    )


@api_router.post("/captures/local-event-drafts", status_code=status.HTTP_201_CREATED)
async def create_event_capture(
    payload: EventDraftInput,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    return await create_capture(
        kind=CaptureKind.LOCAL_EVENT_DRAFT,
        payload=payload,
        request=request,
        session=session,
        user=user,
    )


@api_router.get("/captures")
async def list_captures(
    request: Request,
    session: SessionDependency,
    user: UserDependency,
    kind: Annotated[CaptureKind | None, Query()] = None,
) -> dict[str, Any]:
    query = select(ManualCapture).where(ManualCapture.user_id == user.id)
    if kind is not None:
        query = query.where(ManualCapture.kind == kind.value)
    captures = list(await session.scalars(query.order_by(ManualCapture.created_at.desc())))
    return envelope(request, [capture_response(capture) for capture in captures])


@api_router.get("/captures/{capture_id}")
async def get_capture(
    capture_id: uuid.UUID,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    capture = await owned_capture_or_404(session, user.id, capture_id)
    return envelope(request, capture_response(capture))


@api_router.patch("/captures/{capture_id}")
async def update_capture(
    capture_id: uuid.UUID,
    payload: CapturePatch,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> dict[str, Any]:
    capture = await owned_capture_or_404(session, user.id, capture_id)
    changed: list[str] = []
    for field, value in payload.model_dump(exclude_unset=True).items():
        if getattr(capture, field) != value:
            setattr(capture, field, value)
            changed.append(field)
    if changed:
        capture.status = payload.status or "corrected"
        if "status" not in changed:
            changed.append("status")
    await record_audit(
        session,
        user_id=user.id,
        event_type="quick_capture.corrected",
        request_id=request_id(request),
        target_type="manual_capture",
        target_id=str(capture.id),
        result="success",
        changed_fields=changed,
    )
    await session.commit()
    await session.refresh(capture)
    return envelope(request, capture_response(capture))


@api_router.delete("/captures/{capture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_capture(
    capture_id: uuid.UUID,
    request: Request,
    session: SessionDependency,
    user: UserDependency,
) -> Response:
    capture = await owned_capture_or_404(session, user.id, capture_id)
    await session.delete(capture)
    await record_audit(
        session,
        user_id=user.id,
        event_type="quick_capture.deleted",
        request_id=request_id(request),
        target_type="manual_capture",
        target_id=str(capture.id),
        result="success",
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@api_router.get("/activity")
async def list_activity(
    request: Request,
    session: SessionDependency,
    user: UserDependency,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, Any]:
    events = list(
        await session.scalars(
            select(AuditEvent)
            .where(AuditEvent.user_id == user.id)
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
    )
    return envelope(
        request,
        [AuditEventResponse.model_validate(event) for event in events],
    )
