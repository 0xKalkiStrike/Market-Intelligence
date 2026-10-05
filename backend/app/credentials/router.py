from datetime import datetime
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Credential, User, AuditLog
from app.database.session import get_db


class CredentialCreate(BaseModel):
    name: str
    provider: str
    key_value: str


class CredentialResponse(BaseModel):
    id: str
    name: str
    provider: str
    key_hint: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/api/credentials", tags=["credentials"])


@router.get("", response_model=list[CredentialResponse])
def list_credentials(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Credential]:
    return db.query(Credential).order_by(Credential.created_at.desc()).all()


@router.post("", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
def create_credential(
    payload: CredentialCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Credential:
    hint = payload.key_value[-4:] if len(payload.key_value) >= 4 else "****"
    cred = Credential(
        name=payload.name,
        provider=payload.provider,
        key_hint=f"****{hint}",
        is_active=True,
    )
    db.add(cred)

    audit = AuditLog(user_id=user.id, action="CREATE", entity="CREDENTIAL", details=f"Added credential {cred.name}")
    db.add(audit)

    db.commit()
    db.refresh(cred)
    return cred
