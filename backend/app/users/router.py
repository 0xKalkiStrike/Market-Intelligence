from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import require_permission
from app.auth.schemas import UserResponse
from app.database.models import User
from app.database.session import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_permission("users:read"))) -> list[UserResponse]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            roles=[r.name for r in u.roles],
        )
        for u in users
    ]
