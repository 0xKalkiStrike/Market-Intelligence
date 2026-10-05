from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.database.models import Project, ProjectUser, User
from app.database.session import get_db

from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        return db.get(User, payload.get("sub"))
    except Exception:
        return None


def require_permission(code: str):
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.is_superuser:
            return user
        codes = {perm.code for role in user.roles for perm in role.permissions}
        if code not in codes:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {code}")
        return user

    return _check


def require_project_member(project_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    if user.is_superuser or project.owner_id == user.id:
        return project
    link = (
        db.query(ProjectUser)
        .filter(ProjectUser.project_id == project_id, ProjectUser.user_id == user.id)
        .first()
    )
    if link is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this project")
    return project
