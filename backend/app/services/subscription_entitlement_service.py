"""Subscription and Entitlement Service - Centralized tier definitions, server-side limits, and quota enforcement."""
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.database.models import (
    Organization,
    OrganizationSubscription,
    OrganizationMembership,
    TenantUsageRecord,
    User,
)
from app.services.tenant_audit_service import TenantAuditService


PLAN_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "STARTER": {
        "name": "Starter",
        "description": "Essential market intelligence for regional operators and growing brands.",
        "monthly_price_usd": 1499.0,
        "annual_price_usd": 14990.0,
        "limits": {
            "max_users": 3,
            "max_competitors": 5,
            "max_geographic_markets": 2,
            "max_ai_tokens_monthly": 50000,
            "max_exports_monthly": 10,
            "max_scenarios_monthly": 5,
            "data_refresh_frequency": "WEEKLY",
        },
        "features": [
            "intelligence:read",
            "export:basic",
            "search:basic",
        ],
    },
    "PROFESSIONAL": {
        "name": "Professional",
        "description": "Full intelligence research, scenario optimization, and automated market monitoring.",
        "monthly_price_usd": 4999.0,
        "annual_price_usd": 49990.0,
        "limits": {
            "max_users": 15,
            "max_competitors": 25,
            "max_geographic_markets": 10,
            "max_ai_tokens_monthly": 500000,
            "max_exports_monthly": 100,
            "max_scenarios_monthly": 50,
            "data_refresh_frequency": "DAILY",
        },
        "features": [
            "intelligence:read",
            "intelligence:write",
            "export:basic",
            "export:advanced",
            "api:access",
            "scenarios:advanced",
            "alerts:custom",
        ],
    },
    "ENTERPRISE": {
        "name": "Enterprise",
        "description": "Unrestricted intelligence, continuous data pipelines, webhooks, and multi-state coverage.",
        "monthly_price_usd": 14999.0,
        "annual_price_usd": 149990.0,
        "limits": {
            "max_users": 9999,
            "max_competitors": 9999,
            "max_geographic_markets": 50,
            "max_ai_tokens_monthly": 10000000,
            "max_exports_monthly": 9999,
            "max_scenarios_monthly": 9999,
            "data_refresh_frequency": "CONTINUOUS",
        },
        "features": [
            "intelligence:read",
            "intelligence:write",
            "export:basic",
            "export:advanced",
            "api:access",
            "scenarios:advanced",
            "alerts:custom",
            "webhooks:manage",
            "sso:configure",
            "audit:export",
            "connectors:custom",
        ],
    },
}


class SubscriptionEntitlementService:

    @staticmethod
    def list_available_plans() -> List[Dict[str, Any]]:
        """List all available commercial plans and their entitlement limits."""
        return [
            {
                "tier": tier,
                **data,
            }
            for tier, data in PLAN_DEFINITIONS.items()
        ]

    @staticmethod
    def get_plan_details(plan_tier: str) -> Dict[str, Any]:
        """Fetch tier definition or default to STARTER."""
        return PLAN_DEFINITIONS.get(plan_tier.upper(), PLAN_DEFINITIONS["STARTER"])

    @staticmethod
    def get_organization_entitlements(db: Session, organization_id: str) -> Dict[str, Any]:
        """Get the effective entitlements and plan status for an organization."""
        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        plan_tier = (sub.plan_tier if sub else org.plan_tier) or "STARTER"
        plan_info = SubscriptionEntitlementService.get_plan_details(plan_tier)

        # Count active members
        active_members_count = db.execute(
            select(func.count(OrganizationMembership.id)).where(
                and_(
                    OrganizationMembership.organization_id == organization_id,
                    OrganizationMembership.is_active == True,
                )
            )
        ).scalar() or 0

        # Current period usage
        period_key = datetime.now(timezone.utc).strftime("%Y-%m")
        usage_rows = db.execute(
            select(TenantUsageRecord.metric_name, func.sum(TenantUsageRecord.quantity))
            .where(
                and_(
                    TenantUsageRecord.organization_id == organization_id,
                    TenantUsageRecord.period_key == period_key,
                )
            )
            .group_by(TenantUsageRecord.metric_name)
        ).all()
        current_usage = {row[0]: int(row[1] or 0) for row in usage_rows}

        return {
            "organization_id": org.id,
            "organization_name": org.name,
            "plan_tier": plan_tier,
            "subscription_status": sub.status if sub else "ACTIVE",
            "billing_cycle": sub.billing_cycle if sub else "MONTHLY",
            "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "limits": plan_info["limits"],
            "features": plan_info["features"],
            "current_active_users": active_members_count,
            "current_month_usage": current_usage,
        }

    @staticmethod
    def check_feature_access(db: Session, organization_id: str, feature_name: str) -> bool:
        """Check if organization's active plan allows a given feature."""
        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            return False
        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        plan_tier = (sub.plan_tier if sub else org.plan_tier) or "STARTER"
        plan_info = SubscriptionEntitlementService.get_plan_details(plan_tier)
        return feature_name in plan_info.get("features", [])

    @staticmethod
    def check_quota(
        db: Session,
        organization_id: str,
        metric_name: str,
        requested_quantity: int = 1,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """Verify if adding `requested_quantity` to `metric_name` remains within plan limit.
        Returns: (allowed: bool, reason: str, usage_meta: dict)
        """
        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            return False, "Organization not found", {}

        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        plan_tier = (sub.plan_tier if sub else org.plan_tier) or "STARTER"
        plan_info = SubscriptionEntitlementService.get_plan_details(plan_tier)
        limits = plan_info.get("limits", {})

        limit_key_map = {
            "AI_TOKENS": "max_ai_tokens_monthly",
            "EXPORTS_GENERATED": "max_exports_monthly",
            "SCENARIOS_RUN": "max_scenarios_monthly",
            "ACTIVE_USERS": "max_users",
        }
        limit_key = limit_key_map.get(metric_name)
        if not limit_key or limit_key not in limits:
            # Unrestricted metric
            return True, "Metric not capped", {"limit": None, "current": 0}

        limit_value = limits[limit_key]

        if metric_name == "ACTIVE_USERS":
            current_val = db.execute(
                select(func.count(OrganizationMembership.id)).where(
                    and_(
                        OrganizationMembership.organization_id == organization_id,
                        OrganizationMembership.is_active == True,
                    )
                )
            ).scalar() or 0
        else:
            period_key = datetime.now(timezone.utc).strftime("%Y-%m")
            current_val = db.execute(
                select(func.sum(TenantUsageRecord.quantity)).where(
                    and_(
                        TenantUsageRecord.organization_id == organization_id,
                        TenantUsageRecord.metric_name == metric_name,
                        TenantUsageRecord.period_key == period_key,
                    )
                )
            ).scalar() or 0

        projected = current_val + requested_quantity
        if projected > limit_value:
            return False, f"Quota exceeded for {metric_name}. Current: {current_val}, Limit: {limit_value}, Requested: {requested_quantity}", {
                "limit": limit_value,
                "current": current_val,
                "projected": projected,
            }

        return True, "Quota verified", {
            "limit": limit_value,
            "current": current_val,
            "projected": projected,
        }

    @staticmethod
    def upgrade_organization_plan(
        db: Session,
        organization_id: str,
        new_plan_tier: str,
        actor_user: User,
        billing_cycle: str = "MONTHLY",
    ) -> OrganizationSubscription:
        """Upgrade or modify an organization's subscription tier."""
        new_plan_tier = new_plan_tier.upper()
        if new_plan_tier not in PLAN_DEFINITIONS:
            raise ValueError(f"Unknown plan tier: {new_plan_tier}")

        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        days = 365 if billing_cycle.upper() == "ANNUAL" else 30

        if not sub:
            sub = OrganizationSubscription(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
                plan_tier=new_plan_tier,
                status="ACTIVE",
                billing_cycle=billing_cycle.upper(),
                current_period_start=now,
                current_period_end=now + timedelta(days=days),
                provider_name="SANDBOX",
                created_at=now,
                updated_at=now,
            )
            db.add(sub)
        else:
            old_tier = sub.plan_tier
            sub.plan_tier = new_plan_tier
            sub.billing_cycle = billing_cycle.upper()
            sub.current_period_end = now + timedelta(days=days)
            sub.updated_at = now

        org.plan_tier = new_plan_tier
        db.commit()
        db.refresh(sub)

        TenantAuditService.log_event(
            db=db,
            organization_id=organization_id,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="SUBSCRIPTION_PLAN_CHANGED",
            target_type="SUBSCRIPTION",
            target_id=sub.id,
            metadata={"new_plan_tier": new_plan_tier, "billing_cycle": billing_cycle},
        )
        return sub
