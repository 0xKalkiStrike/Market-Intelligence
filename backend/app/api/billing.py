"""Billing API - Commercial checkout, sandbox payment simulator, invoice history, and HMAC webhook processing."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, Organization
from app.auth.deps import get_current_user, get_current_tenant, require_tenant_role
from app.services.billing_service import BillingService

router = APIRouter(prefix="/api/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    plan_tier: str
    billing_cycle: Optional[str] = "MONTHLY"
    success_url: Optional[str] = "/organization/billing?status=success"
    cancel_url: Optional[str] = "/organization/billing?status=cancel"


class SandboxPayRequest(BaseModel):
    plan_tier: str
    billing_cycle: Optional[str] = "MONTHLY"


@router.post("/checkout")
def create_checkout_session(
    req: CheckoutRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Initiate a checkout session with the payment provider (or sandbox simulator)."""
    try:
        session = BillingService.create_checkout_session(
            db=db,
            organization_id=org.id,
            plan_tier=req.plan_tier,
            billing_cycle=req.billing_cycle or "MONTHLY",
            success_url=req.success_url or "/organization/billing?status=success",
            cancel_url=req.cancel_url or "/organization/billing?status=cancel",
            actor_user=user,
        )
        return session
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/sandbox/pay")
def execute_sandbox_payment(
    req: SandboxPayRequest,
    org: Organization = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Execute a simulated payment in sandbox mode to immediately upgrade plan and issue invoice."""
    try:
        res = BillingService.execute_sandbox_payment(
            db=db,
            organization_id=org.id,
            plan_tier=req.plan_tier,
            billing_cycle=req.billing_cycle or "MONTHLY",
            actor_user=user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/invoices")
def list_invoices(
    org: Organization = Depends(get_current_tenant),
    _membership=Depends(require_tenant_role(["OWNER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """List paid and issued invoices for the current tenant workspace."""
    return BillingService.list_invoices(db, org.id)


@router.post("/webhook")
async def handle_billing_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    x_webhook_signature: Optional[str] = Header(None, alias="X-Webhook-Signature"),
    db: Session = Depends(get_db),
):
    """Process incoming payment provider webhooks with HMAC-SHA256 signature verification and idempotency."""
    payload_bytes = await request.body()
    sig = stripe_signature or x_webhook_signature or ""
    try:
        result = BillingService.process_webhook(
            db=db,
            payload_bytes=payload_bytes,
            signature_header=sig,
        )
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
