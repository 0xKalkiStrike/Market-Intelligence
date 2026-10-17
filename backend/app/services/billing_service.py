"""Billing Service - Provider-independent commercial billing, checkout, invoice generation, and HMAC webhook processing."""
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.config import settings
from app.database.models import (
    Organization,
    OrganizationSubscription,
    BillingCustomer,
    BillingInvoice,
    BillingWebhookEvent,
    User,
)
from app.services.tenant_audit_service import TenantAuditService
from app.services.subscription_entitlement_service import PLAN_DEFINITIONS, SubscriptionEntitlementService


class BillingService:

    @staticmethod
    def get_provider_mode() -> str:
        """Return 'STRIPE' if credentials configured, otherwise 'SANDBOX'."""
        stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
        if stripe_key and stripe_key.startswith("sk_"):
            return "STRIPE"
        return "SANDBOX"

    @staticmethod
    def create_checkout_session(
        db: Session,
        organization_id: str,
        plan_tier: str,
        billing_cycle: str = "MONTHLY",
        success_url: str = "/organization/billing?status=success",
        cancel_url: str = "/organization/billing?status=cancel",
        actor_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Create a checkout session for subscribing or upgrading."""
        plan_tier = plan_tier.upper()
        if plan_tier not in PLAN_DEFINITIONS:
            raise ValueError(f"Unknown plan tier: {plan_tier}")

        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        provider = BillingService.get_provider_mode()
        session_id = f"cs_{provider.lower()}_{uuid.uuid4().hex[:16]}"
        plan_data = PLAN_DEFINITIONS[plan_tier]
        amount = plan_data["annual_price_usd"] if billing_cycle.upper() == "ANNUAL" else plan_data["monthly_price_usd"]

        if provider == "STRIPE":
            # Real Stripe Checkout initialization would occur here using stripe library
            # If stripe is not installed or configured, sandbox fallback
            checkout_url = f"https://checkout.stripe.com/pay/{session_id}"
        else:
            # Sandbox simulated checkout URL
            checkout_url = f"/organization/billing?session_id={session_id}&plan={plan_tier}&simulated=true"

        return {
            "session_id": session_id,
            "provider": provider,
            "plan_tier": plan_tier,
            "billing_cycle": billing_cycle.upper(),
            "amount_usd": amount,
            "checkout_url": checkout_url,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }

    @staticmethod
    def execute_sandbox_payment(
        db: Session,
        organization_id: str,
        plan_tier: str,
        billing_cycle: str = "MONTHLY",
        actor_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Execute a simulated payment in Sandbox mode to immediately upgrade and issue an invoice."""
        plan_tier = plan_tier.upper()
        if plan_tier not in PLAN_DEFINITIONS:
            raise ValueError(f"Unknown plan tier: {plan_tier}")

        org = db.execute(select(Organization).where(Organization.id == organization_id)).scalar_one_or_none()
        if not org:
            raise ValueError("Organization not found")

        plan_data = PLAN_DEFINITIONS[plan_tier]
        amount = plan_data["annual_price_usd"] if billing_cycle.upper() == "ANNUAL" else plan_data["monthly_price_usd"]
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        period_days = 365 if billing_cycle.upper() == "ANNUAL" else 30

        # Update Subscription
        sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == organization_id)).scalar_one_or_none()
        if not sub:
            sub = OrganizationSubscription(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
                plan_tier=plan_tier,
                status="ACTIVE",
                billing_cycle=billing_cycle.upper(),
                current_period_start=now,
                current_period_end=now + timedelta(days=period_days),
                provider_name="SANDBOX",
                created_at=now,
                updated_at=now,
            )
            db.add(sub)
        else:
            sub.plan_tier = plan_tier
            sub.status = "ACTIVE"
            sub.billing_cycle = billing_cycle.upper()
            sub.current_period_start = now
            sub.current_period_end = now + timedelta(days=period_days)
            sub.updated_at = now

        org.plan_tier = plan_tier

        # Generate Invoice
        inv_number = f"INV-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        invoice = BillingInvoice(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            invoice_number=inv_number,
            amount_due_usd=amount,
            amount_paid_usd=amount,
            status="PAID",
            period_start=now,
            period_end=now + timedelta(days=period_days),
            pdf_url=f"/api/billing/invoices/{inv_number}/download",
            created_at=now,
        )
        db.add(invoice)
        db.commit()

        if actor_user:
            TenantAuditService.log_event(
                db=db,
                organization_id=organization_id,
                actor_user_id=actor_user.id,
                actor_email=actor_user.email,
                action="INVOICE_PAID",
                target_type="INVOICE",
                target_id=invoice.id,
                metadata={"invoice_number": inv_number, "amount_usd": amount, "plan_tier": plan_tier},
            )

        return {
            "status": "SUCCESS",
            "invoice_number": inv_number,
            "plan_tier": plan_tier,
            "amount_paid_usd": amount,
            "current_period_end": sub.current_period_end.isoformat(),
        }

    @staticmethod
    def verify_webhook_signature(payload_bytes: bytes, signature_header: str, secret: str) -> bool:
        """Verify HMAC-SHA256 signature."""
        if not signature_header or not secret:
            return False
        expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header.strip())

    @staticmethod
    def process_webhook(
        db: Session,
        payload_bytes: bytes,
        signature_header: str,
        secret: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verify webhook signature, protect against duplicate events, and update subscription state."""
        webhook_secret = secret or getattr(settings, "STRIPE_WEBHOOK_SECRET", "test_webhook_secret_key_12345")

        # Verify HMAC
        if not BillingService.verify_webhook_signature(payload_bytes, signature_header, webhook_secret):
            raise ValueError("Invalid webhook signature")

        payload = json.loads(payload_bytes.decode("utf-8"))
        event_id = payload.get("id")
        event_type = payload.get("type", "unknown")

        if not event_id:
            raise ValueError("Webhook missing event id")

        # Duplicate event check
        stmt = select(BillingWebhookEvent).where(BillingWebhookEvent.event_id == event_id)
        if db.execute(stmt).scalar_one_or_none():
            return {"status": "ALREADY_PROCESSED", "event_id": event_id}

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        event_record = BillingWebhookEvent(
            id=str(uuid.uuid4()),
            provider_name="STRIPE",
            event_id=event_id,
            event_type=event_type,
            payload_json=json.dumps(payload),
            status="PROCESSED",
            processed_at=now,
        )
        db.add(event_record)

        # Dispatch
        data_obj = payload.get("data", {}).get("object", {})
        org_id = data_obj.get("metadata", {}).get("organization_id")

        if event_type == "invoice.paid" and org_id:
            amount_paid = float(data_obj.get("amount_paid", 0)) / 100.0
            invoice_num = data_obj.get("number") or f"INV-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            invoice = BillingInvoice(
                id=str(uuid.uuid4()),
                organization_id=org_id,
                invoice_number=invoice_num,
                amount_due_usd=amount_paid,
                amount_paid_usd=amount_paid,
                status="PAID",
                period_start=now,
                period_end=now + timedelta(days=30),
                created_at=now,
            )
            db.add(invoice)

        elif event_type == "invoice.payment_failed" and org_id:
            sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org_id)).scalar_one_or_none()
            if sub:
                sub.status = "PAST_DUE"

        elif event_type == "customer.subscription.deleted" and org_id:
            sub = db.execute(select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org_id)).scalar_one_or_none()
            if sub:
                sub.status = "CANCELED"

        db.commit()
        return {"status": "PROCESSED", "event_id": event_id, "event_type": event_type}

    @staticmethod
    def list_invoices(db: Session, organization_id: str) -> List[Dict[str, Any]]:
        """List billing invoices for an organization."""
        stmt = (
            select(BillingInvoice)
            .where(BillingInvoice.organization_id == organization_id)
            .order_by(desc(BillingInvoice.created_at))
        )
        invoices = db.execute(stmt).scalars().all()
        return [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "amount_due_usd": inv.amount_due_usd,
                "amount_paid_usd": inv.amount_paid_usd,
                "status": inv.status,
                "period_start": inv.period_start.isoformat(),
                "period_end": inv.period_end.isoformat(),
                "pdf_url": inv.pdf_url,
                "created_at": inv.created_at.isoformat(),
            }
            for inv in invoices
        ]
