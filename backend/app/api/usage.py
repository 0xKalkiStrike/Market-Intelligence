"""Usage Metering API - Tenant resource consumption, threshold alerts, and usage event ledger."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Organization
from app.auth.deps import get_current_tenant, require_tenant_role
from app.services.tenant_usage_metering_service import TenantUsageMeteringService

router = APIRouter(prefix="/api/usage", tags=["Usage"])


class MeterUsageRequest(BaseModel):
    metric_name: str
    quantity: int
    source_ref: Optional[str] = ""
    idempotency_key: Optional[str] = None


@router.get("/summary")
def get_usage_summary(
    period: Optional[str] = None,
    org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """Retrieve usage aggregations, quota limits, and threshold status for the active billing period."""
    try:
        return TenantUsageMeteringService.get_usage_summary(db, org.id, period_key=period)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.get("/records")
def list_usage_records(
    metric_name: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    org: Organization = Depends(get_current_tenant),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN", "ANALYST"])),
    db: Session = Depends(get_db),
):
    """List raw usage meter records (requires ANALYST or higher)."""
    records = TenantUsageMeteringService.list_usage_records(
        db=db,
        organization_id=org.id,
        metric_name=metric_name,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": r.id,
            "metric_name": r.metric_name,
            "quantity": r.quantity,
            "period_key": r.period_key,
            "source_ref": r.source_ref,
            "idempotency_key": r.idempotency_key,
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in records
    ]


@router.post("/meter")
def meter_usage_event(
    req: MeterUsageRequest,
    org: Organization = Depends(get_current_tenant),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN", "ANALYST", "SERVICE_ACCOUNT"])),
    db: Session = Depends(get_db),
):
    """Record a billable consumption event with idempotency protection."""
    rec = TenantUsageMeteringService.record_usage(
        db=db,
        organization_id=org.id,
        metric_name=req.metric_name,
        quantity=req.quantity,
        source_ref=req.source_ref or "",
        idempotency_key=req.idempotency_key,
    )
    return {
        "status": "RECORDED",
        "id": rec.id,
        "metric_name": rec.metric_name,
        "quantity": rec.quantity,
    }
