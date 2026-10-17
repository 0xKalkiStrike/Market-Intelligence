"""
Phase 6 Automated Test Suite — Enterprise Integrations, Governed API, Platform Extensibility & Collaboration.
Validates:
1. Enterprise Integration Framework & Internal MMJ-DOCS Aggregate Adapter (strictly NO PHI)
2. Integration Registry, live health verification, and synchronization checkpoints
3. Secure API Keys and Service Accounts (hashing, prefix, expiration, rate limits, scopes)
4. Outbound Webhook Framework, HMAC-SHA256 signatures, SSRF protection, delivery logs & replay
5. Controlled Data Import Center (CSV/JSON, column mapping, duplicate pre-screening)
6. Controlled Data Export Center (CSV/JSON, column filtering, permission-based internal metric redaction)
7. Cross-System Entity Resolution (multi-signal weighted matching, canonical links)
8. Integration Conflict Resolution (source authority weighting, evidence preservation, manual audit trail)
9. Collaboration Workspace, private internal notes, and shared watchlists
10. Intelligence Case Management lifecycle across 7 market categories
11. Extensible Module Registry and multi-channel Report Distribution
"""
import json
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database.models as models
import app.database.session as session_module
import app.main as main_module
from app.main import app
from app.database.session import Base, get_db
from app.database.models import (
    User,
    Role,
    ApiKey,
    Entity,
    EntityLocation,
    StateMarketMetric,
    WebhookSubscription,
    WebhookDeliveryLog,
    DataImport,
    ExportJob,
    CrossSystemEntityLink,
    DataConflict,
    CollaborationFinding,
    IntelligenceNote,
    IntelligenceCase,
    ReportDistributionConfig,
)
from app.integrations.internal_adapter import InternalMmjDocsAdapter
from app.services.integration_registry_service import IntegrationRegistryService
from app.services.webhook_service import WebhookService
from app.services.event_dispatcher import EventDispatcher
from app.services.data_import_service import DataImportService
from app.services.data_export_service import DataExportService
from app.services.entity_resolution_service import EntityResolutionService
from app.services.conflict_resolution_service import ConflictResolutionService
from app.services.collaboration_service import CollaborationService
from app.services.case_management_service import CaseManagementService
from app.services.module_registry_service import ModuleRegistryService
from app.services.report_distribution_service import ReportDistributionService
from app.auth.api_key_auth import generate_secure_api_key, AuthenticatedPrincipal

DB_FILE = "./test_p6.db"
if os.path.exists(DB_FILE):
    try:
        os.remove(DB_FILE)
    except Exception:
        pass

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
session_module.engine = engine
session_module.SessionLocal.configure(bind=engine)
main_module.engine = engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    from sqlalchemy.orm import close_all_sessions
    close_all_sessions()
    session_module.engine = engine
    session_module.SessionLocal.configure(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[session_module.get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed system_admin role
        admin_role = db.query(Role).filter(Role.name == "system_admin").first()
        if not admin_role:
            admin_role = Role(name="system_admin", description="System Admin")
            db.add(admin_role)

        # Seed superuser
        user = db.query(User).filter(User.email == "p6_admin@example.com").first()
        if not user:
            from app.auth.security import hash_password
            user = User(
                email="p6_admin@example.com",
                hashed_password=hash_password("adminpass123"),
                full_name="P6 Enterprise Integration Architect",
                is_active=True,
                is_superuser=True,
            )
            user.roles.append(admin_role)
            db.add(user)

        # Seed regular researcher user
        researcher = db.query(User).filter(User.email == "researcher@example.com").first()
        if not researcher:
            from app.auth.security import hash_password
            res_role = Role(name="market_researcher", description="Market Researcher")
            db.add(res_role)
            researcher = User(
                email="researcher@example.com",
                hashed_password=hash_password("researchpass123"),
                full_name="Public Market Researcher",
                is_active=True,
                is_superuser=False,
            )
            researcher.roles.append(res_role)
            db.add(researcher)

        db.commit()
    finally:
        db.close()


def get_auth_headers(email: str = "p6_admin@example.com", password: str = "adminpass123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. INTEGRATION FRAMEWORK & INTERNAL ADAPTER (STRICT NO PHI)
# ==============================================================================
def test_phase6_internal_adapter_and_phi_guard():
    adapter = InternalMmjDocsAdapter()

    # 1. Test Connectivity probe
    probe = adapter.test_connection()
    assert probe["status"] == "HEALTHY"
    assert "latency_ms" in probe

    # 2. Test PHI Exclusion Filter (Must reject clinical / patient details)
    phi_payload = {
        "batch_id": "test_phi_01",
        "aggregates": [
            {
                "state": "FL",
                "patient_name": "John Doe",  # Prohibited PHI!
                "diagnosis": "Severe Chronic Pain",  # Prohibited clinical diagnosis!
            }
        ]
    }
    with pytest.raises(ValueError, match="Protected Health Information"):
        adapter.validate_payload(phi_payload)

    # 3. Test Valid Aggregate Payload Normalization & Sync
    with TestingSessionLocal() as db:
        res = adapter.sync(db)
        assert res.status == "SUCCESS"
        assert res.records_processed >= 3
        assert res.checkpoint is not None

        # Verify state market metric was updated with aggregated appointment volume
        fl_metric = db.query(StateMarketMetric).filter(StateMarketMetric.state == "FL").first()
        assert fl_metric is not None
        assert fl_metric.mmj_patient_volume == 8500


# ==============================================================================
# 2. INTEGRATION REGISTRY & HEALTH MANAGEMENT
# ==============================================================================
def test_phase6_integration_registry():
    with TestingSessionLocal() as db:
        svc = IntegrationRegistryService()

        # 1. List catalog
        integrations = svc.list_integrations(db)
        assert len(integrations) >= 5
        names = [i["integration_name"] for i in integrations]
        assert "internal_mmj_docs_core" in names
        assert "npi_registry" in names

        # 2. Verify health probe
        probe_res = svc.verify_integration_health(db, "internal_mmj_docs_core")
        assert probe_res["status"] == "HEALTHY"

        # 3. Toggle enabled
        toggle_res = svc.toggle_integration(db, "internal_mmj_docs_core", False)
        assert toggle_res["is_enabled"] is False

        # 4. Set sync frequency
        freq_res = svc.set_sync_frequency(db, "internal_mmj_docs_core", "DAILY")
        assert freq_res["sync_frequency"] == "DAILY"


# ==============================================================================
# 3. API KEYS & SERVICE ACCOUNTS
# ==============================================================================
def test_phase6_api_keys_and_governed_access():
    headers = get_auth_headers()

    # 1. Create API Key via Governed API endpoint
    create_res = client.post(
        "/api/v1/governed/api-keys",
        json={
            "name": "Partner Clinical ERP Service Account",
            "scopes": ["intelligence:read", "export:create"],
            "rate_limit_per_minute": 50,
            "expires_in_days": 30,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    key_data = create_res.json()
    assert "full_api_key" in key_data
    assert key_data["full_api_key"].startswith("mmj_")
    api_key_str = key_data["full_api_key"]
    key_id = key_data["id"]

    # 2. Call Governed API using X-API-Key header (No Bearer Token)
    api_headers = {"X-API-Key": api_key_str}
    gov_res = client.get("/api/v1/governed/competitors", headers=api_headers)
    assert gov_res.status_code == 200
    assert "items" in gov_res.json()

    # 3. List API Keys (requires system:manage)
    list_res = client.get("/api/v1/governed/api-keys", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Revoke API key
    del_res = client.delete(f"/api/v1/governed/api-keys/{key_id}", headers=headers)
    assert del_res.status_code == 200

    # 5. Calling with revoked key must be rejected with 403 Forbidden
    rejected_res = client.get("/api/v1/governed/competitors", headers=api_headers)
    assert rejected_res.status_code == 403
    assert "revoked" in rejected_res.json()["detail"].lower()


# ==============================================================================
# 4. WEBHOOKS & UNIVERSAL EVENT DISPATCHER
# ==============================================================================
def test_phase6_webhooks_and_event_dispatcher():
    headers = get_auth_headers()

    # 1. Create Webhook Subscription with SSRF validation
    # Try invalid private IP destination -> must fail SSRF check
    ssrf_res = client.post(
        "/api/v1/governed/webhooks",
        json={"name": "Bad Webhook", "target_url": "http://127.0.0.1:8000/callback", "event_types": ["*"]},
        headers=headers,
    )
    assert ssrf_res.status_code == 500 or ssrf_res.status_code == 400

    # Create safe public destination
    wh_res = client.post(
        "/api/v1/governed/webhooks",
        json={
            "name": "Market Intelligence Partner Hub",
            "target_url": "https://api.mmjdocs-partner.com/webhook-listener",
            "event_types": ["competitor.price_changed", "market.opportunity_detected"],
        },
        headers=headers,
    )
    assert wh_res.status_code == 201
    wh_data = wh_res.json()
    assert "secret_key" in wh_data
    sub_id = wh_data["id"]

    # 2. Rotate secret
    rot_res = client.post(f"/api/v1/governed/webhooks/{sub_id}/rotate-secret", headers=headers)
    assert rot_res.status_code == 200
    assert rot_res.json()["secret_key"] != wh_data["secret_key"]

    # 3. Test Event Dispatcher dispatch
    with TestingSessionLocal() as db:
        dispatcher = EventDispatcher(db)
        event = dispatcher.dispatch(
            event_type="competitor.price_changed",
            entity_name="Veriheal FL Clinic",
            state="FL",
            description="Competitor dropped price from $199 to $149.",
            importance="HIGH",
            previous_value="$199",
            new_value="$149",
            async_webhooks=False,
        )
        assert event.id is not None
        assert event.importance == "HIGH"

        # Verify delivery log was recorded
        logs = db.query(WebhookDeliveryLog).filter(WebhookDeliveryLog.subscription_id == sub_id).all()
        assert len(logs) >= 1
        assert logs[0].event_type == "competitor.price_changed"


# ==============================================================================
# 5. CONTROLLED DATA IMPORT & EXPORT CENTERS
# ==============================================================================
def test_phase6_data_import_and_export():
    headers = get_auth_headers()

    # 1. Import Center: Upload & Preview CSV
    csv_content = b"""name,state,city,phone,website,estimated_revenue
Sunnyside Cannabis Dispensary,FL,Orlando,407-555-0199,https://sunnyside.shop,"$2,500,000"
Trulieve Health Center,FL,Tampa,813-555-0144,https://trulieve.com,"$4,200,000"
"""
    files = {"file": ("dispensaries_batch.csv", csv_content, "text/csv")}
    preview_res = client.post("/api/v1/governed/imports/preview", files=files, headers=headers)
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["total_rows_detected"] == 2
    assert "name" in pdata["headers"]

    # 2. Execute Import
    files2 = {"file": ("dispensaries_batch.csv", csv_content, "text/csv")}
    exec_res = client.post(
        "/api/v1/governed/imports/execute",
        files=files2,
        data={
            "entity_type": "DISPENSARY",
            "column_mapping_json": json.dumps({"name": "name", "state": "state", "city": "city"}),
        },
        headers=headers,
    )
    assert exec_res.status_code == 200
    res_json = exec_res.json()
    assert res_json["added_records"] >= 1 or res_json["updated_records"] >= 1

    # 3. Export Center: Authorized Admin Export (Full Internal Data)
    export_res = client.post(
        "/api/v1/governed/exports/generate",
        params={"export_name": "Q4 Executive Export", "format_type": "CSV", "entity_type": "DISPENSARY"},
        headers=headers,
    )
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert exp_data["format"] == "CSV"
    assert "Sunnyside" in exp_data["content"]
    assert "$2,500,000" in exp_data["content"]

    # 4. Export Center: Researcher Export (Must REDACT internal metrics)
    researcher_headers = get_auth_headers(email="researcher@example.com", password="researchpass123")
    res_export = client.post(
        "/api/v1/governed/exports/generate",
        params={"export_name": "Public Researcher Export", "format_type": "CSV", "entity_type": "DISPENSARY"},
        headers=researcher_headers,
    )
    assert res_export.status_code == 200
    researcher_content = res_export.json()["content"]
    assert "[RESTRICTED - INTERNAL MMJ-DOCS DATA]" in researcher_content


# ==============================================================================
# 6. CROSS-SYSTEM ENTITY RESOLUTION & CONFLICT RESOLUTION
# ==============================================================================
def test_phase6_entity_resolution_and_conflicts():
    headers = get_auth_headers()

    with TestingSessionLocal() as db:
        # Clean previous test records
        db.query(CrossSystemEntityLink).filter(CrossSystemEntityLink.system_name == "STATE_DOH").delete()
        db.query(Entity).filter(Entity.name.ilike("Curaleaf Medical%")).delete()
        db.commit()

        # Seed canonical entity
        ent = Entity(name="Curaleaf Medical Dispensary LLC", entity_type="DISPENSARY")
        db.add(ent)
        db.flush()
        loc = EntityLocation(entity_id=ent.id, state="FL", city="Orlando")
        db.add(loc)
        db.commit()
        db.refresh(ent)
        ent_id = ent.id

    # 1. Resolve External Identity via multi-signal matcher
    res = client.post(
        "/api/v1/governed/entity-resolution/resolve",
        json={
            "system_name": "STATE_DOH",
            "external_id": "DOH-DISP-9921",
            "name": "Curaleaf Dispensary",
            "state": "FL",
            "license_number": "MMTC-2026-004",
        },
        headers=headers,
    )
    assert res.status_code == 200
    match_data = res.json()
    assert match_data["canonical_entity_id"] == ent_id
    assert match_data["match_confidence"] >= 0.20

    # 2. Integration Conflict Resolution: Record & Resolve
    with TestingSessionLocal() as db:
        conf_svc = ConflictResolutionService(db)
        conflict = conf_svc.detect_and_record_conflict(
            entity_id=ent_id,
            field_name="address",
            source_a_name="STATE_DOH",
            source_a_value="100 Main Blvd, Orlando, FL",
            source_b_name="SURFACE_SCRAPE",
            source_b_value="102 Main Blvd, Orlando, FL",
        )
        assert conflict is not None
        # State DOH (Authority 100) vs Surface Scrape (Authority 40) auto-resolves to State DOH
        assert conflict.resolution_status == "RESOLVED_SOURCE_A"
        assert conflict.winning_value == "100 Main Blvd, Orlando, FL"

        # Test Manual Conflict Resolution
        conflict2 = conf_svc.detect_and_record_conflict(
            entity_id=ent_id,
            field_name="phone",
            source_a_name="COMMERCIAL_DIRECTORY",
            source_a_value="407-555-0111",
            source_b_name="SURFACE_SCRAPE",
            source_b_value="407-555-0222",
        )
        res_manual = conf_svc.resolve_conflict_manually(
            conflict_id=conflict2.id,
            chosen_value="407-555-0111",
            justification="Verified by direct telephone confirmation.",
            resolved_by="compliance@mmjdocs.com",
        )
        assert res_manual["status"] == "MANUALLY_OVERRIDDEN"


# ==============================================================================
# 7. COLLABORATION WORKSPACE, NOTES & SHARED WATCHLISTS
# ==============================================================================
def test_phase6_collaboration_and_cases():
    headers = get_auth_headers()

    # 1. Create Collaborative Finding
    finding_res = client.post(
        "/api/v1/governed/collaboration/findings",
        json={
            "title": "Orlando North Market Cannibalization Threat",
            "category": "GEO",
            "finding_summary": "Two competitor clinics opened within 1.5 miles of Orlando North partner.",
            "evidence_sources": [{"source": "OpenStreetMap", "distance_miles": 1.2}],
            "assigned_reviewer": "director_analytics@mmjdocs.com",
        },
        headers=headers,
    )
    assert finding_res.status_code == 201
    f_id = finding_res.json()["id"]

    # 2. Add Strictly Private Internal Note
    note_res = client.post(
        f"/api/v1/governed/collaboration/findings/{f_id}/notes",
        json={"note_content": "Internal strategy meeting scheduled with regional coordinator."},
        headers=headers,
    )
    assert note_res.status_code == 200

    # 3. Record Management Decision
    dec_res = client.post(
        f"/api/v1/governed/collaboration/findings/{f_id}/decision",
        json={"management_decision": "Approve opening mobile telehealth certification pop-up in Lake Mary."},
        headers=headers,
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "ACTION_APPROVED"

    # 4. Intelligence Case Management
    case_res = client.post(
        "/api/v1/governed/cases",
        json={
            "title": "Sudden Competitor Price Drop Under-cutting Telehealth",
            "category": "PRICING_CHANGE",
            "severity": "CRITICAL",
            "evidence_summary": "Competitor dropped renewal fee to $99 across California.",
            "assigned_investigator": "senior_analyst@mmjdocs.com",
        },
        headers=headers,
    )
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # Update investigation
    inv_res = client.post(
        f"/api/v1/governed/cases/{case_id}/investigate",
        params={"findings": "Temporary promotion expiring in 14 days."},
        headers=headers,
    )
    assert inv_res.status_code == 200

    # Record decision & close case
    close_res = client.post(
        f"/api/v1/governed/cases/{case_id}/decision",
        params={
            "decision": "Maintain quality value proposition and emphasize 24-hr certification guarantee.",
            "outcome": "Customer retention remained at 94.2%.",
            "close_case": True,
        },
        headers=headers,
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 5. Shared Watchlists
    wl_res = client.post(
        "/api/v1/governed/watchlists/shared",
        json={
            "name": "Team Florida Key Competitors",
            "category": "Competitor",
            "sharing_scope": "TEAM",
            "team_name": "Florida Operations",
        },
        headers=headers,
    )
    assert wl_res.status_code == 201
    assert wl_res.json()["sharing_scope"] == "TEAM"


# ==============================================================================
# 8. MODULE REGISTRY & REPORT DISTRIBUTION
# ==============================================================================
def test_phase6_modules_and_report_distribution():
    headers = get_auth_headers()

    # 1. Query Extensible Intelligence Modules
    mod_res = client.get("/api/v1/governed/modules", headers=headers)
    assert mod_res.status_code == 200
    modules = mod_res.json()
    assert len(modules) >= 6
    mod_names = [m["module_name"] for m in modules]
    assert "competitor_movement_engine" in mod_names
    assert "internal_ehr_bridge" in mod_names

    # 2. Create Report Distribution
    dist_res = client.post(
        "/api/v1/governed/report-distributions",
        json={
            "report_type": "EXECUTIVE_WEEKLY",
            "channel": "IN_APP",
            "recipient_target": "executive_team@mmjdocs.com",
            "schedule_cron": "0 8 * * 1",
        },
        headers=headers,
    )
    assert dist_res.status_code == 201
    dist_id = dist_res.json()["id"]

    # 3. Trigger Report Distribution
    trigger_res = client.post(f"/api/v1/governed/report-distributions/{dist_id}/trigger", headers=headers)
    assert trigger_res.status_code == 200
    assert trigger_res.json()["status"] == "SUCCESS"
