"""Customer Onboarding API - Guided setup wizard endpoints with safe state resumption."""
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, Organization
from app.auth.deps import get_current_user, get_current_tenant, require_tenant_role
from app.services.customer_onboarding_service import CustomerOnboardingService

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


class ProfileStepRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    notification_email: Optional[str] = None


class GeoScopeStepRequest(BaseModel):
    geographic_markets: List[str]


class CompetitorsStepRequest(BaseModel):
    competitors: List[str]


class TeamInvitationsStepRequest(BaseModel):
    invitations: List[Dict[str, str]]  # list of {"email": "...", "role": "..."}


class CompleteOnboardingRequest(BaseModel):
    seed_sample_workspace: bool = True


@router.get("/status")
def get_onboarding_status(
    org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """Fetch current onboarding step, status, and saved draft data."""
    try:
        return CustomerOnboardingService.get_onboarding_status(db, org.id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.post("/step/profile")
def update_profile_step(
    req: ProfileStepRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Step 1: Set organization profile details."""
    try:
        return CustomerOnboardingService.update_profile_step(
            db=db,
            organization_id=org.id,
            name=req.name,
            domain=req.domain,
            notification_email=req.notification_email,
            actor_user=user,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/step/geo-scope")
def update_geo_scope_step(
    req: GeoScopeStepRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Step 2: Select permitted target geographic markets."""
    try:
        return CustomerOnboardingService.update_geo_scope_step(
            db=db,
            organization_id=org.id,
            geographic_markets=req.geographic_markets,
            actor_user=user,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/step/competitors")
def update_competitors_step(
    req: CompetitorsStepRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Step 3: Define monitored competitor watchlist."""
    try:
        return CustomerOnboardingService.update_competitors_step(
            db=db,
            organization_id=org.id,
            competitors=req.competitors,
            actor_user=user,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/step/team-invitations")
def send_team_invitations_step(
    req: TeamInvitationsStepRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Step 4: Dispatch team member invitations."""
    try:
        return CustomerOnboardingService.send_team_invitations_step(
            db=db,
            organization_id=org.id,
            invitations=req.invitations,
            actor_user=user,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/complete")
def complete_onboarding(
    req: CompleteOnboardingRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Step 5: Finalize onboarding and mark workspace active."""
    try:
        return CustomerOnboardingService.complete_onboarding(
            db=db,
            organization_id=org.id,
            seed_sample_workspace=req.seed_sample_workspace,
            actor_user=user,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
