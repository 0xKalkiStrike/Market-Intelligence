"""Tenant Usage Metering Service - Metering billable resources, idempotency enforcement, and quota threshold alerts."""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, desc

from app.database.models import (
    TenantUsageRecord,
    Organization,
    OrganizationSubscription,
)
from app.services.subscription_entitlement_service import SubscriptionEntitlementService


class TenantUsageMeteringService:

    @staticmethod
    def record_usage(
        db: Session,
        organization_id: str,
        metric_name: str,
        quantity: int,
        source_ref: str = "",
        idempotency_key: Optional[str] = None,
    ) -> TenantUsageRecord:
        """Record billable or rate-limited usage with idempotency protection against retried background jobs."""
        metric_name = metric_name.upper().strip()
        period_key = datetime.now(timezone.utc).strftime("%Y-%m")

        # Idempotency check
        if idempotency_key:
            stmt = select(TenantUsageRecord).where(TenantUsageRecord.idempotency_key == idempotency_key)
            existing = db.execute(stmt).scalar_one_or_none()
            if existing:
                return existing

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        record = TenantUsageRecord(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            metric_name=metric_name,
            quantity=quantity,
            period_key=period_key,
            source_ref=source_ref,
            idempotency_key=idempotency_key,
            recorded_at=now,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_usage_summary(
        db: Session,
        organization_id: str,
        period_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Aggregate usage across all billable metrics and compare with plan limits."""
        if not period_key:
            period_key = datetime.now(timezone.utc).strftime("%Y-%m")

        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        plan_tier = (sub.plan_tier if sub else org.plan_tier) or "STARTER"
        plan_info = SubscriptionEntitlementService.get_plan_details(plan_tier)
        limits = plan_info.get("limits", {})

        # Query all metrics used this period
        stmt = (
            select(TenantUsageRecord.metric_name, func.sum(TenantUsageRecord.quantity))
            .where(
                and_(
                    TenantUsageRecord.organization_id == organization_id,
                    TenantUsageRecord.period_key == period_key,
                )
            )
            .group_by(TenantUsageRecord.metric_name)
        )
        rows = db.execute(stmt).all()
        measured = {r[0]: int(r[1] or 0) for r in rows}

        tracked_metrics = [
            ("AI_TOKENS", "max_ai_tokens_monthly", "AI Request Tokens"),
            ("EXPORTS_GENERATED", "max_exports_monthly", "Intelligence Exports"),
            ("SCENARIOS_RUN", "max_scenarios_monthly", "Optimization Scenarios"),
            ("API_REQUESTS", None, "API Calls"),
        ]

        summary_metrics = []
        overall_status = "HEALTHY"

        for metric_id, limit_key, label in tracked_metrics:
            used = measured.get(metric_id, 0)
            limit_val = limits.get(limit_key) if limit_key else None

            if limit_val is not None and limit_val > 0:
                pct = round((used / limit_val) * 100.0, 1)
                if pct >= 100.0:
                    status = "EXCEEDED"
                    overall_status = "QUOTA_EXCEEDED"
                elif pct >= 95.0:
                    status = "CRITICAL"
                    if overall_status != "QUOTA_EXCEEDED":
                        overall_status = "WARNING"
                elif pct >= 80.0:
                    status = "WARNING"
                    if overall_status != "QUOTA_EXCEEDED":
                        overall_status = "WARNING"
                else:
                    status = "NORMAL"
            else:
                pct = 0.0
                status = "UNLIMITED"

            summary_metrics.append({
                "metric_id": metric_id,
                "label": label,
                "used": used,
                "limit": limit_val,
                "percentage_used": pct,
                "status": status,
            })

        return {
            "organization_id": org.id,
            "period_key": period_key,
            "plan_tier": plan_tier,
            "overall_status": overall_status,
            "metrics": summary_metrics,
        }

    @staticmethod
    def list_usage_records(
        db: Session,
        organization_id: str,
        metric_name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TenantUsageRecord]:
        """Fetch raw usage event ledger for auditing and reconciliation."""
        stmt = select(TenantUsageRecord).where(TenantUsageRecord.organization_id == organization_id)
        if metric_name:
            stmt = stmt.where(TenantUsageRecord.metric_name == metric_name.upper())
        stmt = stmt.order_by(desc(TenantUsageRecord.recorded_at)).offset(offset).limit(limit)
        return list(db.execute(stmt).scalars().all())
