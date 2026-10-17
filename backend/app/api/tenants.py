"""Tenants API - Organization workspaces, membership, roles, invitations, settings, and audit logs."""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, Organization, OrganizationSettings
from app.auth.deps import get_current_user, get_current_tenant, require_tenant_role
from app.services.tenant_membership_service import TenantMembershipService
from app.services.tenant_audit_service import TenantAuditService
import json

router = APIRouter(prefix="/api/tenants", tags=["Tenants"])


# --- Pydantic Schemas ---
class CreateOrgRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    plan_tier: Optional[str] = "STARTER"
    is_demo: Optional[bool] = False


class AddMemberRequest(BaseModel):
    user_id: str
    role: str = "ANALYST"


class UpdateRoleRequest(BaseModel):
    new_role: str


class TransferOwnershipRequest(BaseModel):
    new_owner_user_id: str


class CreateInvitationRequest(BaseModel):
    email: EmailStr
    role: str = "ANALYST"


class AcceptInvitationRequest(BaseModel):
    token: str


class UpdateSettingsRequest(BaseModel):
    permitted_geographic_markets: Optional[List[str]] = None
    monitored_competitors: Optional[List[str]] = None
    notification_email: Optional[str] = None
    custom_opportunity_weights: Optional[Dict[str, Any]] = None
    alert_thresholds: Optional[Dict[str, Any]] = None


# --- Endpoints ---
@router.get("/current")
def get_current_organization_info(
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details for the active organization workspace."""
    members = TenantMembershipService.list_members(db, org.id)
    user_role = "OWNER" if user.is_superuser else "ANALYST"
    for m in members:
        if m["user_id"] == user.id:
            user_role = m["role"]
            break

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "domain": org.domain,
        "status": org.status,
        "plan_tier": org.plan_tier,
        "is_demo": org.is_demo,
        "user_role": user_role,
        "created_at": org.created_at.isoformat(),
    }


@router.get("/my-organizations")
def list_my_organizations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all organizations the current authenticated user belongs to."""
    TenantMembershipService.ensure_default_organization(db)
    return TenantMembershipService.get_user_organizations(db, user.id)


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_organization(
    req: CreateOrgRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new independent tenant workspace."""
    org = TenantMembershipService.create_organization(
        db=db,
        name=req.name,
        domain=req.domain,
        plan_tier=req.plan_tier or "STARTER",
        owner_user=user,
        is_demo=req.is_demo or False,
    )
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "plan_tier": org.plan_tier,
        "status": org.status,
    }


@router.get("/members")
def list_organization_members(
    org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """List team members of the active organization."""
    return TenantMembershipService.list_members(db, org.id)


@router.post("/members")
def add_organization_member(
    req: AddMemberRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Add a member to the organization (requires OWNER or ADMIN)."""
    try:
        membership = TenantMembershipService.add_member(
            db=db,
            organization_id=org.id,
            user_id=req.user_id,
            role=req.role,
            actor_user=user,
        )
        return {"status": "SUCCESS", "membership_id": membership.id, "role": membership.role}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.patch("/members/{user_id}/role")
def update_member_role(
    user_id: str,
    req: UpdateRoleRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Update role for a team member (requires OWNER or ADMIN)."""
    try:
        membership = TenantMembershipService.update_member_role(
            db=db,
            organization_id=org.id,
            target_user_id=user_id,
            new_role=req.new_role,
            actor_user=user,
        )
        return {"status": "SUCCESS", "role": membership.role}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/members/{user_id}")
def remove_member(
    user_id: str,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Remove a member from the organization (requires OWNER or ADMIN)."""
    try:
        TenantMembershipService.remove_member(
            db=db,
            organization_id=org.id,
            target_user_id=user_id,
            actor_user=user,
        )
        return {"status": "SUCCESS"}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/transfer-ownership")
def transfer_organization_ownership(
    req: TransferOwnershipRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER"])),
    db: Session = Depends(get_db),
):
    """Transfer ownership of the organization to another member (requires OWNER)."""
    try:
        TenantMembershipService.transfer_ownership(
            db=db,
            organization_id=org.id,
            current_owner_user=user,
            new_owner_user_id=req.new_owner_user_id,
        )
        return {"status": "SUCCESS"}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/invitations")
def list_invitations(
    org: Organization = Depends(get_current_tenant),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """List pending invitations (requires OWNER or ADMIN)."""
    return TenantMembershipService.list_invitations(db, org.id)


@router.post("/invitations")
def create_invitation(
    req: CreateInvitationRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Send an invitation to join the organization (requires OWNER or ADMIN)."""
    try:
        inv = TenantMembershipService.create_invitation(
            db=db,
            organization_id=org.id,
            email=req.email,
            role=req.role,
            actor_user=user,
        )
        return {
            "id": inv.id,
            "email": inv.email,
            "role": inv.role,
            "token": inv.token,
            "expires_at": inv.expires_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/invitations/{invitation_id}")
def revoke_invitation(
    invitation_id: str,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Revoke an active invitation (requires OWNER or ADMIN)."""
    try:
        TenantMembershipService.revoke_invitation(
            db=db,
            organization_id=org.id,
            invitation_id=invitation_id,
            actor_user=user,
        )
        return {"status": "SUCCESS"}
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/invitations/accept")
def accept_invitation(
    req: AcceptInvitationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept an organization invitation by token."""
    try:
        membership = TenantMembershipService.accept_invitation(
            db=db,
            token=req.token,
            user=user,
        )
        return {
            "status": "SUCCESS",
            "organization_id": membership.organization_id,
            "role": membership.role,
        }
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/settings")
def get_organization_settings(
    org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """Fetch organization configuration settings."""
    settings_obj = db.query(OrganizationSettings).filter(OrganizationSettings.organization_id == org.id).first()
    if not settings_obj:
        return {
            "permitted_geographic_markets": ["FL"],
            "monitored_competitors": [],
            "notification_email": None,
            "custom_opportunity_weights": {},
            "alert_thresholds": {},
        }
    return {
        "permitted_geographic_markets": json.loads(settings_obj.permitted_geographic_markets_json or "[]"),
        "monitored_competitors": json.loads(settings_obj.monitored_competitors_json or "[]"),
        "notification_email": settings_obj.notification_email,
        "custom_opportunity_weights": json.loads(settings_obj.custom_opportunity_weights_json or "{}"),
        "alert_thresholds": json.loads(settings_obj.alert_thresholds_json or "{}"),
        "onboarding_status": settings_obj.onboarding_status,
        "onboarding_step": settings_obj.onboarding_step,
    }


@router.put("/settings")
def update_organization_settings(
    req: UpdateSettingsRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Update workspace configuration (requires OWNER or ADMIN)."""
    settings_obj = db.query(OrganizationSettings).filter(OrganizationSettings.organization_id == org.id).first()
    if not settings_obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Settings not found")

    if req.permitted_geographic_markets is not None:
        settings_obj.permitted_geographic_markets_json = json.dumps(req.permitted_geographic_markets)
    if req.monitored_competitors is not None:
        settings_obj.monitored_competitors_json = json.dumps(req.monitored_competitors)
    if req.notification_email is not None:
        settings_obj.notification_email = req.notification_email
    if req.custom_opportunity_weights is not None:
        settings_obj.custom_opportunity_weights_json = json.dumps(req.custom_opportunity_weights)
    if req.alert_thresholds is not None:
        settings_obj.alert_thresholds_json = json.dumps(req.alert_thresholds)

    db.commit()
    TenantAuditService.log_event(
        db=db,
        organization_id=org.id,
        actor_user_id=user.id,
        actor_email=user.email,
        action="WORKSPACE_SETTINGS_UPDATED",
        target_type="ORGANIZATION_SETTINGS",
        target_id=settings_obj.id,
    )
    return {"status": "SUCCESS"}


@router.get("/audit-logs")
def list_organization_audit_logs(
    action: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    org: Organization = Depends(get_current_tenant),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Retrieve immutable tenant audit trail (requires OWNER or ADMIN)."""
    logs = TenantAuditService.list_logs(db, org.id, action=action, limit=limit, offset=offset)
    return [
        {
            "id": l.id,
            "actor_user_id": l.actor_user_id,
            "actor_email": l.actor_email,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "metadata": json.loads(l.metadata_json or "{}"),
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
