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


from fastapi import Request
from app.database.models import Organization, OrganizationMembership


def get_current_tenant(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    """Validate and resolve tenant context. NEVER trust a client-supplied tenant ID without active membership check."""
    # 1. Check header or query parameter
    requested_org_id = request.headers.get("X-Organization-Id") or request.query_params.get("organization_id")
    
    org: Optional[Organization] = None

    if requested_org_id:
        org = db.query(Organization).filter(
            (Organization.id == requested_org_id) | (Organization.slug == requested_org_id)
        ).first()
        if not org:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Requested organization not found")

        # Security check: User must be active member or superuser
        if not user.is_superuser:
            membership = db.query(OrganizationMembership).filter(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.is_active == True,
            ).first()
            if not membership:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    "Cross-tenant access forbidden. You are not an active member of this organization."
                )
    else:
        # Fallback: find user's primary active organization
        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.is_active == True,
        ).order_by(OrganizationMembership.joined_at.asc()).first()

        if membership:
            org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        elif user.is_superuser:
            # Fallback to default primary enterprise organization for superusers
            org = db.query(Organization).filter(Organization.slug == "mmj-docs-primary").first()

    if not org:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No active organization workspace found for this user. Please complete onboarding."
        )

    if org.status == "DEACTIVATED":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This organization has been deactivated.")

    # Cache tenant context on request
    request.state.organization = org
    return org


def require_tenant_role(allowed_roles: list[str]):
    """Enforce organization role authorization (e.g. OWNER, ADMIN, ANALYST)."""
    def _role_checker(
        org: Organization = Depends(get_current_tenant),
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> OrganizationMembership:
        if user.is_superuser:
            # Create a virtual owner membership representation for superuser
            return OrganizationMembership(
                id="superuser-override",
                organization_id=org.id,
                user_id=user.id,
                role="OWNER",
                is_active=True,
            )

        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == org.id,
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.is_active == True,
        ).first()

        if not membership:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this organization.")

        if membership.role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Insufficient organization role. Required one of: {allowed_roles}, but you have: {membership.role}"
            )

        return membership

    return _role_checker


def require_platform_admin(user: User = Depends(get_current_user)) -> User:
    """Enforce platform superadmin access for cross-tenant management."""
    if not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform administrator privileges required.")
    return user

