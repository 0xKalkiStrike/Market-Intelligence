"""Platform Administration API - Protected cross-tenant administration for platform operators."""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.database.session import get_db
from app.database.models import (
    User,
    Organization,
    OrganizationMembership,
    OrganizationSubscription,
    TenantUsageRecord,
    TenantAuditLog,
)
from app.auth.deps import require_platform_admin
from app.services.subscription_entitlement_service import PLAN_DEFINITIONS

router = APIRouter(prefix="/api/admin/platform", tags=["Platform Admin"])


class UpdateOrgStatusRequest(BaseModel):
    status: str  # ACTIVE, SUSPENDED, DEACTIVATED


@router.get("/metrics")
def get_platform_metrics(
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """Platform-wide operational intelligence metrics."""
    total_orgs = db.execute(select(func.count(Organization.id))).scalar() or 0
    total_users = db.execute(select(func.count(User.id))).scalar() or 0

    # Total subscriptions by plan
    sub_counts = db.execute(
        select(OrganizationSubscription.plan_tier, func.count(OrganizationSubscription.id))
        .group_by(OrganizationSubscription.plan_tier)
    ).all()
    plan_breakdown = {tier: count for tier, count in sub_counts}

    # Estimated monthly recurring revenue (MRR)
    mrr = 0.0
    for tier, count in plan_breakdown.items():
        price = PLAN_DEFINITIONS.get(tier, {}).get("monthly_price_usd", 0.0)
        mrr += price * count

    # Total AI tokens consumed platform-wide
    total_ai_tokens = db.execute(
        select(func.sum(TenantUsageRecord.quantity))
        .where(TenantUsageRecord.metric_name == "AI_TOKENS")
    ).scalar() or 0

    return {
        "total_organizations": total_orgs,
        "total_users": total_users,
        "mrr_usd": mrr,
        "plan_breakdown": plan_breakdown,
        "total_ai_tokens_consumed": int(total_ai_tokens),
    }


@router.get("/organizations")
def list_all_organizations(
    limit: int = 50,
    offset: int = 0,
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """List all tenant organizations across the platform."""
    orgs = db.execute(
        select(Organization).order_by(desc(Organization.created_at)).offset(offset).limit(limit)
    ).scalars().all()

    result = []
    for org in orgs:
        member_count = db.execute(
            select(func.count(OrganizationMembership.id)).where(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.is_active == True,
            )
        ).scalar() or 0

        sub = db.execute(
            select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org.id)
        ).scalar_one_or_none()

        result.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "domain": org.domain,
            "status": org.status,
            "plan_tier": sub.plan_tier if sub else org.plan_tier,
            "subscription_status": sub.status if sub else "ACTIVE",
            "active_members_count": member_count,
            "is_demo": org.is_demo,
            "created_at": org.created_at.isoformat(),
        })
    return result


@router.patch("/organizations/{org_id}/status")
def update_organization_status(
    org_id: str,
    req: UpdateOrgStatusRequest,
    _admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """Suspend or reactivate an organization workspace."""
    new_status = req.status.upper()
    if new_status not in ("ACTIVE", "SUSPENDED", "DEACTIVATED"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid organization status")

    org = db.execute(select(Organization).where(Organization.id == org_id)).scalar_one_or_none()
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    org.status = new_status
    db.commit()
    return {"status": "SUCCESS", "organization_id": org.id, "new_status": org.status}
