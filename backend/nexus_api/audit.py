from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from .models import AuditEvent

logger = logging.getLogger("nexus.audit")


async def record_audit(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    event_type: str,
    request_id: str,
    target_type: str,
    target_id: str | None,
    result: str,
    changed_fields: list[str] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        user_id=user_id,
        event_type=event_type,
        request_id=request_id,
        target_type=target_type,
        target_id=target_id,
        result=result,
        changed_fields=sorted(set(changed_fields or [])),
    )
    session.add(event)
    logger.info(
        "audit_event event_type=%s actor_id=%s target_type=%s target_id=%s "
        "result=%s changed_fields=%s request_id=%s",
        event_type,
        str(user_id) if user_id else "anonymous",
        target_type,
        target_id or "none",
        result,
        ",".join(event.changed_fields),
        request_id,
    )
    return event
