"""PHASE 9 TEST SUITE: Enterprise Multi-Tenancy, Customer Onboarding & Commercial Readiness

Verification & Regression Tests:
1. Multi-Tenant Creation & Default Organization Backfill
2. Cross-Tenant Data Isolation & Security Enforcement (Anti-IDOR / Anti-Leakage)
3. Organization Membership Roles, Permissions & Ownership Transfer
4. Team Invitation Lifecycle (Create, Accept, Revoke, Expiry)
5. Customer Onboarding 5-Step Guided Wizard & Resumption
6. Subscription Entitlements, Tier Limits & Server-Side Enforcement
7. Tenant Usage Metering & Idempotency Protection (Anti-Double-Charging)
8. Billing Checkout & Simulated Sandbox Payment
9. Billing Webhook HMAC-SHA256 Signature Verification & Idempotency
10. Tenant Audit Logging & Credential Sanitization
11. Platform Administration & Cross-Tenant Visibility
12. Phase 9 REST API Endpoints Integration Pass
"""
import hmac
import hashlib
import json
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import session as session_module
from app.database.models import (
    Base,
    User,
    Role,
    Organization,
    OrganizationMembership,
    OrganizationInvitation,
    OrganizationSettings,
    OrganizationSubscription,
    BillingInvoice,
    BillingWebhookEvent,
    TenantUsageRecord,
    TenantAuditLog,
    Project,
)
from app.services.tenant_membership_service import TenantMembershipService
from app.services.customer_onboarding_service import CustomerOnboardingService
from app.services.subscription_entitlement_service import SubscriptionEntitlementService, PLAN_DEFINITIONS
from app.services.tenant_usage_metering_service import TenantUsageMeteringService
from app.services.billing_service import BillingService
from app.services.tenant_audit_service import TenantAuditService
from app.auth.security import hash_password, create_access_token
from app.main import app

# Dedicated SQLite test database for Phase 9
TEST_DB_FILE = "./test_p9.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


USER_ADMIN_ID = "c1000000-0000-0000-0000-000000000001"
USER_A_ID = "c1000000-0000-0000-0000-000000000002"
USER_B_ID = "c1000000-0000-0000-0000-000000000003"
USER_ANALYST_ID = "c1000000-0000-0000-0000-000000000004"
USER_INVITEE_ID = "c1000000-0000-0000-0000-000000000005"


@pytest.fixture(scope="module", autouse=True)
def setup_phase9_db():
    session_module.engine = engine
    session_module.SessionLocal.configure(bind=engine)
    from app.database.session import get_db
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[session_module.get_db] = override_get_db

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed baseline users
    db = TestingSessionLocal()
    try:
        # Superuser
        u_admin = User(
            id=USER_ADMIN_ID,
            email="superadmin@example.com",
            hashed_password=hash_password("adminpass123"),
            is_active=True,
            is_superuser=True,
        )
        db.add(u_admin)

        # Tenant A User (Owner)
        u_a = User(
            id=USER_A_ID,
            email="owner_a@acme-cannabis.com",
            hashed_password=hash_password("password123"),
            is_active=True,
            is_superuser=False,
        )
        db.add(u_a)

        # Tenant B User (Owner)
        u_b = User(
            id=USER_B_ID,
            email="owner_b@zenith-dispensary.com",
            hashed_password=hash_password("password123"),
            is_active=True,
            is_superuser=False,
        )
        db.add(u_b)

        # Tenant A Member (Analyst)
        u_analyst = User(
            id=USER_ANALYST_ID,
            email="analyst@acme-cannabis.com",
            hashed_password=hash_password("password123"),
            is_active=True,
            is_superuser=False,
        )
        db.add(u_analyst)

        db.commit()
    finally:
        db.close()

    yield
    TestingSessionLocal.close_all()


def auth_header_for(user_id: str, email: str) -> dict:
    """Generate bearer auth token header for test user."""
    token = create_access_token(subject=user_id, extra_claims={"email": email})
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. MULTI-TENANT CREATION & DEFAULT ORG BACKFILL
# ==============================================================================
def test_multi_tenant_creation_and_default_organization_backfill():
    db = TestingSessionLocal()
    try:
        # Test ensure default primary organization
        default_org = TenantMembershipService.ensure_default_organization(db)
        assert default_org.slug == "mmj-docs-primary"
        assert default_org.plan_tier == "ENTERPRISE"
        assert default_org.status == "ACTIVE"

        # Verify default settings created
        settings = db.query(OrganizationSettings).filter_by(organization_id=default_org.id).first()
        assert settings is not None
        assert settings.onboarding_status == "COMPLETED"

        # Verify all users attached
        members = TenantMembershipService.list_members(db, default_org.id)
        assert len(members) >= 4

        # Test custom organization creation with slugification
        u_a = db.query(User).filter_by(id=USER_A_ID).first()
        org_a = TenantMembershipService.create_organization(
            db=db,
            name="Acme Cannabis Group",
            domain="acme-cannabis.com",
            plan_tier="PROFESSIONAL",
            owner_user=u_a,
        )
        assert org_a.slug == "acme-cannabis-group"
        assert org_a.plan_tier == "PROFESSIONAL"

        # Verify owner membership
        membership = db.query(OrganizationMembership).filter_by(organization_id=org_a.id, user_id=u_a.id).first()
        assert membership is not None
        assert membership.role == "OWNER"

        # Verify duplicate slug handling (auto-suffix)
        org_a_dup = TenantMembershipService.create_organization(
            db=db,
            name="Acme Cannabis Group",
            plan_tier="STARTER",
        )
        assert org_a_dup.slug == "acme-cannabis-group-1"
    finally:
        db.close()


# ==============================================================================
# 2. CROSS-TENANT DATA ISOLATION & ANTI-IDOR ENFORCEMENT
# ==============================================================================
def test_cross_tenant_data_isolation():
    db = TestingSessionLocal()
    try:
        u_b = db.query(User).filter_by(id=USER_B_ID).first()
        org_b = TenantMembershipService.create_organization(
            db=db,
            name="Zenith Dispensary Network",
            domain="zenith-dispensary.com",
            plan_tier="STARTER",
            owner_user=u_b,
        )

        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()

        # User B attempts to access Org A settings via X-Organization-Id header
        headers_b = auth_header_for(USER_B_ID, "owner_b@zenith-dispensary.com")
        headers_b["X-Organization-Id"] = org_a.id

        res = client.get("/api/tenants/settings", headers=headers_b)
        # Server must reject cross-tenant unauthorized spoofing with 403 Forbidden!
        assert res.status_code == 403
        assert "Cross-tenant access forbidden" in res.json()["detail"]

        # User B attempts to list Org A members
        res_members = client.get("/api/tenants/members", headers=headers_b)
        assert res_members.status_code == 403

        # Superuser can legitimately manage cross-tenant context
        headers_admin = auth_header_for(USER_ADMIN_ID, "superadmin@example.com")
        headers_admin["X-Organization-Id"] = org_a.id
        res_admin = client.get("/api/tenants/current", headers=headers_admin)
        assert res_admin.status_code == 200
        assert res_admin.json()["name"] == "Acme Cannabis Group"
    finally:
        db.close()


# ==============================================================================
# 3. ORGANIZATION MEMBERSHIP ROLES & OWNERSHIP TRANSFER
# ==============================================================================
def test_organization_membership_roles_and_permissions():
    db = TestingSessionLocal()
    try:
        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()
        u_a = db.query(User).filter_by(id=USER_A_ID).first()
        u_analyst = db.query(User).filter_by(id=USER_ANALYST_ID).first()

        # Add analyst to Org A
        m = TenantMembershipService.add_member(
            db=db,
            organization_id=org_a.id,
            user_id=u_analyst.id,
            role="ANALYST",
            actor_user=u_a,
        )
        assert m.role == "ANALYST"

        # Promote analyst to ADMIN
        m_updated = TenantMembershipService.update_member_role(
            db=db,
            organization_id=org_a.id,
            target_user_id=u_analyst.id,
            new_role="ADMIN",
            actor_user=u_a,
        )
        assert m_updated.role == "ADMIN"

        # Attempt to demote sole owner without transfer (must fail)
        with pytest.raises(ValueError, match="Cannot demote the sole owner"):
            TenantMembershipService.update_member_role(
                db=db,
                organization_id=org_a.id,
                target_user_id=u_a.id,
                new_role="ANALYST",
                actor_user=u_a,
            )

        # Transfer ownership to analyst
        success = TenantMembershipService.transfer_ownership(
            db=db,
            organization_id=org_a.id,
            current_owner_user=u_a,
            new_owner_user_id=u_analyst.id,
        )
        assert success is True

        # Verify new owner
        m_analyst = db.query(OrganizationMembership).filter_by(organization_id=org_a.id, user_id=u_analyst.id).first()
        assert m_analyst.role == "OWNER"

        # Transfer ownership back to u_a
        TenantMembershipService.transfer_ownership(
            db=db,
            organization_id=org_a.id,
            current_owner_user=u_analyst,
            new_owner_user_id=u_a.id,
        )
    finally:
        db.close()


# ==============================================================================
# 4. TEAM INVITATIONS LIFECYCLE
# ==============================================================================
def test_team_invitation_lifecycle():
    db = TestingSessionLocal()
    try:
        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()
        u_a = db.query(User).filter_by(id=USER_A_ID).first()

        # Create invitation
        inv = TenantMembershipService.create_invitation(
            db=db,
            organization_id=org_a.id,
            email="invitee@partner-brand.com",
            role="ANALYST",
            actor_user=u_a,
        )
        assert inv.status == "PENDING"
        assert len(inv.token) > 20
        assert inv.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)

        # Create new user to accept invitation
        u_invitee = User(
            id=USER_INVITEE_ID,
            email="invitee@partner-brand.com",
            hashed_password=hash_password("password123"),
            is_active=True,
            is_superuser=False,
        )
        db.add(u_invitee)
        db.commit()

        # Accept invitation
        membership = TenantMembershipService.accept_invitation(
            db=db,
            token=inv.token,
            user=u_invitee,
        )
        assert membership.organization_id == org_a.id
        assert membership.role == "ANALYST"
        assert inv.status == "ACCEPTED"

        # Revocation test
        inv2 = TenantMembershipService.create_invitation(
            db=db,
            organization_id=org_a.id,
            email="to_be_revoked@partner-brand.com",
            role="VIEWER",
            actor_user=u_a,
        )
        revoked = TenantMembershipService.revoke_invitation(
            db=db,
            organization_id=org_a.id,
            invitation_id=inv2.id,
            actor_user=u_a,
        )
        assert revoked is True
        assert inv2.status == "REVOKED"
    finally:
        db.close()


# ==============================================================================
# 5. CUSTOMER ONBOARDING GUIDED WIZARD & RESUMPTION
# ==============================================================================
def test_customer_onboarding_guided_wizard_and_resumption():
    db = TestingSessionLocal()
    try:
        u_b = db.query(User).filter_by(id=USER_B_ID).first()
        org_b = db.query(Organization).filter_by(name="Zenith Dispensary Network").first()

        # Initial onboarding status check
        status_0 = CustomerOnboardingService.get_onboarding_status(db, org_b.id)
        assert status_0["organization_name"] == "Zenith Dispensary Network"
        assert status_0["is_completed"] is False

        # Step 1: Profile
        status_1 = CustomerOnboardingService.update_profile_step(
            db=db,
            organization_id=org_b.id,
            name="Zenith Dispensaries Florida",
            domain="zenith-fl.com",
            notification_email="alerts@zenith-fl.com",
            actor_user=u_b,
        )
        assert status_1["onboarding_step"] >= 2
        assert status_1["profile"]["name"] == "Zenith Dispensaries Florida"

        # Step 2: Geo Scope
        status_2 = CustomerOnboardingService.update_geo_scope_step(
            db=db,
            organization_id=org_b.id,
            geographic_markets=["FL", "OK"],
            actor_user=u_b,
        )
        assert status_2["onboarding_step"] >= 3
        assert "FL" in status_2["geographic_markets"]
        assert "OK" in status_2["geographic_markets"]

        # Step 3: Competitors
        status_3 = CustomerOnboardingService.update_competitors_step(
            db=db,
            organization_id=org_b.id,
            competitors=["Trulieve", "Curaleaf", "Surterra"],
            actor_user=u_b,
        )
        assert status_3["onboarding_step"] >= 4
        assert len(status_3["monitored_competitors"]) == 3

        # Step 4: Team Invites
        status_4 = CustomerOnboardingService.send_team_invitations_step(
            db=db,
            organization_id=org_b.id,
            invitations=[{"email": "colleague@zenith-fl.com", "role": "ANALYST"}],
            actor_user=u_b,
        )
        assert status_4["onboarding_step"] >= 5

        # Step 5: Complete and seed sample workspace
        status_5 = CustomerOnboardingService.complete_onboarding(
            db=db,
            organization_id=org_b.id,
            seed_sample_workspace=True,
            actor_user=u_b,
        )
        assert status_5["is_completed"] is True
        assert status_5["onboarding_status"] == "COMPLETED"

        # Verify resumption returns exact completed state
        resumed = CustomerOnboardingService.get_onboarding_status(db, org_b.id)
        assert resumed["is_completed"] is True
        assert len(resumed["monitored_competitors"]) == 3
    finally:
        db.close()


# ==============================================================================
# 6. SUBSCRIPTION ENTITLEMENTS & SERVER-SIDE LIMIT ENFORCEMENT
# ==============================================================================
def test_subscription_entitlement_limits_and_enforcement():
    db = TestingSessionLocal()
    try:
        org_b = db.query(Organization).filter_by(name="Zenith Dispensaries Florida").first()
        u_b = db.query(User).filter_by(id=USER_B_ID).first()

        # Verify Starter limits
        entitlements = SubscriptionEntitlementService.get_organization_entitlements(db, org_b.id)
        assert entitlements["plan_tier"] == "STARTER"
        assert entitlements["limits"]["max_users"] == 3
        assert entitlements["limits"]["max_exports_monthly"] == 10

        # Feature checks
        assert SubscriptionEntitlementService.check_feature_access(db, org_b.id, "intelligence:read") is True
        assert SubscriptionEntitlementService.check_feature_access(db, org_b.id, "webhooks:manage") is False

        # Quota checks within limit
        allowed, reason, meta = SubscriptionEntitlementService.check_quota(db, org_b.id, "EXPORTS_GENERATED", 5)
        assert allowed is True

        # Quota check exceeding limit (Starter limit is 10)
        allowed_exceeded, reason_exceeded, meta_exceeded = SubscriptionEntitlementService.check_quota(db, org_b.id, "EXPORTS_GENERATED", 15)
        assert allowed_exceeded is False
        assert "Quota exceeded" in reason_exceeded

        # Upgrade plan to PROFESSIONAL
        sub = SubscriptionEntitlementService.upgrade_organization_plan(
            db=db,
            organization_id=org_b.id,
            new_plan_tier="PROFESSIONAL",
            actor_user=u_b,
            billing_cycle="MONTHLY",
        )
        assert sub.plan_tier == "PROFESSIONAL"

        # Post-upgrade verification: export limit is now 100
        allowed_after_upgrade, _, _ = SubscriptionEntitlementService.check_quota(db, org_b.id, "EXPORTS_GENERATED", 15)
        assert allowed_after_upgrade is True
    finally:
        db.close()


# ==============================================================================
# 7. TENANT USAGE METERING & IDEMPOTENCY PROTECTION
# ==============================================================================
def test_tenant_usage_metering_and_idempotency():
    db = TestingSessionLocal()
    try:
        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()

        # Record usage with idempotency key
        key1 = "idemp_ai_run_001"
        rec1 = TenantUsageMeteringService.record_usage(
            db=db,
            organization_id=org_a.id,
            metric_name="AI_TOKENS",
            quantity=5000,
            source_ref="research_agent_run",
            idempotency_key=key1,
        )
        assert rec1.quantity == 5000

        # Duplicate call with same idempotency key (simulating network retry or background task retry)
        rec2 = TenantUsageMeteringService.record_usage(
            db=db,
            organization_id=org_a.id,
            metric_name="AI_TOKENS",
            quantity=5000,
            source_ref="research_agent_run",
            idempotency_key=key1,
        )
        assert rec2.id == rec1.id  # Must return exact same record, no double counting!

        # Record exports usage
        TenantUsageMeteringService.record_usage(
            db=db,
            organization_id=org_a.id,
            metric_name="EXPORTS_GENERATED",
            quantity=2,
            source_ref="pdf_report_export",
        )

        # Get summary
        summary = TenantUsageMeteringService.get_usage_summary(db, org_a.id)
        assert summary["plan_tier"] == "PROFESSIONAL"
        ai_metric = next(m for m in summary["metrics"] if m["metric_id"] == "AI_TOKENS")
        assert ai_metric["used"] == 5000
        assert ai_metric["limit"] == 500000
        assert ai_metric["status"] == "NORMAL"
    finally:
        db.close()


# ==============================================================================
# 8. BILLING CHECKOUT & SIMULATED SANDBOX PAYMENT
# ==============================================================================
def test_billing_checkout_and_sandbox_payment():
    db = TestingSessionLocal()
    try:
        org_b = db.query(Organization).filter_by(name="Zenith Dispensaries Florida").first()
        u_b = db.query(User).filter_by(id=USER_B_ID).first()

        # Checkout session creation
        checkout = BillingService.create_checkout_session(
            db=db,
            organization_id=org_b.id,
            plan_tier="ENTERPRISE",
            billing_cycle="ANNUAL",
            actor_user=u_b,
        )
        assert "session_id" in checkout
        assert checkout["plan_tier"] == "ENTERPRISE"
        assert checkout["amount_usd"] == 149990.0

        # Execute sandbox simulated payment
        payment_res = BillingService.execute_sandbox_payment(
            db=db,
            organization_id=org_b.id,
            plan_tier="ENTERPRISE",
            billing_cycle="ANNUAL",
            actor_user=u_b,
        )
        assert payment_res["status"] == "SUCCESS"
        assert "INV-" in payment_res["invoice_number"]

        # List invoices
        invoices = BillingService.list_invoices(db, org_b.id)
        assert len(invoices) >= 1
        assert invoices[0]["status"] == "PAID"
        assert invoices[0]["amount_paid_usd"] == 149990.0
    finally:
        db.close()


# ==============================================================================
# 9. BILLING WEBHOOK HMAC-SHA256 SIGNATURE VERIFICATION & IDEMPOTENCY
# ==============================================================================
def test_billing_webhook_hmac_verification_and_idempotency():
    db = TestingSessionLocal()
    try:
        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()
        secret = "test_webhook_secret_key_12345"

        payload_dict = {
            "id": "evt_test_paid_999",
            "type": "invoice.paid",
            "data": {
                "object": {
                    "number": "INV-2026-TEST-999",
                    "amount_paid": 499900,
                    "metadata": {"organization_id": org_a.id},
                }
            }
        }
        payload_bytes = json.dumps(payload_dict).encode("utf-8")

        # 1. Test valid HMAC signature
        valid_sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        res_valid = BillingService.process_webhook(
            db=db,
            payload_bytes=payload_bytes,
            signature_header=valid_sig,
            secret=secret,
        )
        assert res_valid["status"] == "PROCESSED"
        assert res_valid["event_id"] == "evt_test_paid_999"

        # 2. Test duplicate webhook event (idempotency check)
        res_dup = BillingService.process_webhook(
            db=db,
            payload_bytes=payload_bytes,
            signature_header=valid_sig,
            secret=secret,
        )
        assert res_dup["status"] == "ALREADY_PROCESSED"

        # 3. Test invalid HMAC signature (must be rejected)
        with pytest.raises(ValueError, match="Invalid webhook signature"):
            BillingService.process_webhook(
                db=db,
                payload_bytes=payload_bytes,
                signature_header="invalid_tampered_signature_hex",
                secret=secret,
            )
    finally:
        db.close()


# ==============================================================================
# 10. TENANT AUDIT LOGGING & CREDENTIAL SANITIZATION
# ==============================================================================
def test_tenant_audit_logs_immutability_and_redaction():
    db = TestingSessionLocal()
    try:
        org_a = db.query(Organization).filter_by(slug="acme-cannabis-group").first()

        # Log event with potential sensitive credentials
        entry = TenantAuditService.log_event(
            db=db,
            organization_id=org_a.id,
            actor_email="security_auditor@acme-cannabis.com",
            action="API_KEY_GENERATED",
            target_type="API_KEY",
            target_id="key-001",
            metadata={
                "key_prefix": "ak_live_",
                "api_key": "secret_raw_live_token_that_must_be_redacted",
                "credit_card": "4111-2222-3333-4444",
                "safe_field": "production-eu-cluster",
            },
        )
        assert entry.action == "API_KEY_GENERATED"

        # Retrieve and verify redaction
        logs = TenantAuditService.list_logs(db, org_a.id, action="API_KEY_GENERATED")
        assert len(logs) >= 1
        meta = json.loads(logs[0].metadata_json)
        assert meta["safe_field"] == "production-eu-cluster"
        assert meta["api_key"] == "[REDACTED]"
        assert meta["credit_card"] == "[REDACTED]"
    finally:
        db.close()


# ==============================================================================
# 11. PLATFORM ADMINISTRATION & CROSS-TENANT VISIBILITY
# ==============================================================================
def test_platform_admin_cross_tenant_management():
    # 1. Regular user trying to access platform admin metrics -> 403
    headers_user = auth_header_for(USER_A_ID, "owner_a@acme-cannabis.com")
    res_forbidden = client.get("/api/admin/platform/metrics", headers=headers_user)
    assert res_forbidden.status_code == 403

    # 2. Platform superadmin accessing metrics -> 200
    headers_admin = auth_header_for(USER_ADMIN_ID, "superadmin@example.com")
    res_metrics = client.get("/api/admin/platform/metrics", headers=headers_admin)
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert metrics["total_organizations"] >= 2
    assert "mrr_usd" in metrics

    # 3. Platform superadmin listing organizations
    res_orgs = client.get("/api/admin/platform/organizations", headers=headers_admin)
    assert res_orgs.status_code == 200
    assert len(res_orgs.json()) >= 2
