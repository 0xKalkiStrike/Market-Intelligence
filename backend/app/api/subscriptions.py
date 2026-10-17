"""Subscriptions and Entitlements API - Commercial plans, feature flags, and quota management."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, Organization
from app.auth.deps import get_current_user, get_current_tenant, require_tenant_role
from app.services.subscription_entitlement_service import SubscriptionEntitlementService

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


class UpgradePlanRequest(BaseModel):
    new_plan_tier: str
    billing_cycle: Optional[str] = "MONTHLY"


@router.get("/plans")
def list_available_plans():
    """List all available commercial plans, pricing, and entitlement limits."""
    return SubscriptionEntitlementService.list_available_plans()


@router.get("/current")
def get_current_subscription(
    org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """Retrieve active subscription tier, limits, and feature access for current workspace."""
    try:
        return SubscriptionEntitlementService.get_organization_entitlements(db, org.id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.post("/upgrade")
def upgrade_subscription(
    req: UpgradePlanRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER"])),
    db: Session = Depends(get_db),
):
    """Upgrade or change subscription tier (requires OWNER)."""
    try:
        sub = SubscriptionEntitlementService.upgrade_organization_plan(
            db=db,
            organization_id=org.id,
            new_plan_tier=req.new_plan_tier,
            actor_user=user,
            billing_cycle=req.billing_cycle or "MONTHLY",
        )
        return {
            "status": "SUCCESS",
            "plan_tier": sub.plan_tier,
            "billing_cycle": sub.billing_cycle,
            "current_period_end": sub.current_period_end.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
