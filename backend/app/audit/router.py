from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import AuditLog, User
from app.database.session import get_db


class AuditLogResponse(BaseModel):
    id: str
    user_id: str | None
    action: str
    entity: str
    details: str
    created_at: datetime

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditLog]:
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
