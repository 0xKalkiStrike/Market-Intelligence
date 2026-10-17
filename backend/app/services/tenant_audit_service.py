"""Tenant Audit Service - Immutable structured audit logging for multi-tenant actions."""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import TenantAuditLog


def _sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize metadata to ensure no passwords, credit cards, or secret tokens are stored."""
    sensitive_keys = {
        "password", "token", "secret", "api_key", "card_number", "cvv", "credit_card",
        "authorization", "access_token", "refresh_token", "signing_secret"
    }
    sanitized = {}
    for k, v in metadata.items():
        if any(sens in k.lower() for sens in sensitive_keys):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_metadata(v)
        else:
            sanitized[k] = v
    return sanitized


class TenantAuditService:

    @staticmethod
    def log_event(
        db: Session,
        organization_id: str,
        actor_email: str,
        action: str,
        target_type: str,
        target_id: str = "",
        actor_user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> TenantAuditLog:
        """Create an immutable audit log entry."""
        meta = _sanitize_metadata(metadata or {})
        
        entry = TenantAuditLog(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action=action.upper(),
            target_type=target_type.upper(),
            target_id=str(target_id),
            metadata_json=json.dumps(meta),
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def list_logs(
        db: Session,
        organization_id: str,
        action: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TenantAuditLog]:
        """Query audit logs scoped to a specific tenant."""
        stmt = select(TenantAuditLog).where(TenantAuditLog.organization_id == organization_id)
        if action:
            stmt = stmt.where(TenantAuditLog.action == action.upper())
        stmt = stmt.order_by(desc(TenantAuditLog.created_at)).offset(offset).limit(limit)
        return list(db.execute(stmt).scalars().all())
