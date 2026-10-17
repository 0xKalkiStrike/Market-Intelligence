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
from app.database.models import User, Role, Permission, Entity, DuplicateCandidate, WorkloadTask
from app.auth.rbac import validate_safe_url

DB_FILE = "./test_p5.db"
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
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed admin and analyst roles
        admin_role = db.query(Role).filter(Role.name == "system_admin").first()
        if not admin_role:
            admin_role = Role(name="system_admin", description="System Admin")
            db.add(admin_role)

        # Seed superuser
        user = db.query(User).filter(User.email == "p5_admin@example.com").first()
        if not user:
            from app.auth.security import hash_password
            user = User(
                email="p5_admin@example.com",
                hashed_password=hash_password("adminpass123"),
                full_name="P5 Enterprise Admin",
                is_active=True,
                is_superuser=True,
            )
            user.roles.append(admin_role)
            db.add(user)
        db.commit()
    finally:
        db.close()


def get_auth_headers():
    res = client.post("/api/auth/login", json={"email": "p5_admin@example.com", "password": "adminpass123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_phase5_observability_and_health():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # 2. Readiness probe
    ready_res = client.get("/api/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "READY"

    # 3. Dependencies health check
    dep_res = client.get("/api/health/dependencies")
    assert dep_res.status_code == 200
    data = dep_res.json()
    assert "dependencies" in data
    assert data["dependencies"]["database"]["status"] == "HEALTHY"

    # 4. Prometheus metrics text export
    metrics_res = client.get("/api/metrics")
    assert metrics_res.status_code == 200
    assert "mmj_http_requests_total" in metrics_res.text

    # 5. Observability JSON summary
    obs_res = client.get("/api/observability/summary")
    assert obs_res.status_code == 200
    obs_data = obs_res.json()
    assert "total_http_requests" in obs_data
    assert "error_rate_percentage" in obs_data


def test_phase5_workload_orchestration():
    headers = get_auth_headers()

    # 1. Check queue metrics
    metrics_res = client.get("/api/orchestration/metrics", headers=headers)
    assert metrics_res.status_code == 200
    assert "max_concurrency" in metrics_res.json()

    # 2. Enqueue workload task
    enqueue_res = client.post(
        "/api/orchestration/enqueue",
        json={"task_type": "FORECASTING", "payload": {"metric_name": "APPOINTMENT_VOLUME", "state": "FL"}, "priority": 3},
        headers=headers,
    )
    assert enqueue_res.status_code == 201
    task_id = enqueue_res.json()["task_id"]
    assert enqueue_res.json()["priority"] == 3

    # 3. List tasks
    tasks_res = client.get("/api/orchestration/tasks", headers=headers)
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()) >= 1

    # 4. Execute next task
    exec_res = client.post("/api/orchestration/execute-next", headers=headers)
    assert exec_res.status_code == 200
    assert exec_res.json()["status"] in ("COMPLETED", "RUNNING", "IDLE")

    # 5. Cancel a task
    cancel_enqueue = client.post(
        "/api/orchestration/enqueue",
        json={"task_type": "AI_ANALYSIS", "payload": {}, "priority": 8},
        headers=headers,
    )
    t_id = cancel_enqueue.json()["task_id"]
    cancel_res = client.post(f"/api/orchestration/tasks/{t_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


def test_phase5_data_governance_and_quality():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    try:
        # Seed a test entity
        ent = Entity(
            name="Test Wellness Clinic",
            entity_type="CLINIC",
            verification_status="UNVERIFIED",
            freshness_status="FRESH",
            data_quality_score=0.85,
        )
        db.add(ent)
        db.commit()
        db.refresh(ent)
        entity_id = ent.id
    finally:
        db.close()

    # 1. Governance overview
    gov_res = client.get("/api/governance/overview", headers=headers)
    assert gov_res.status_code == 200
    assert "governance_status_breakdown" in gov_res.json()

    # 2. Quality issues scan
    scan_res = client.get("/api/governance/quality-issues", headers=headers)
    assert scan_res.status_code == 200
    assert isinstance(scan_res.json(), list)

    # 3. Entity correction workflow with audit trail
    correct_res = client.put(
        f"/api/governance/entities/{entity_id}/correct",
        json={
            "updates": {"name": "Corrected Enterprise Clinic", "verification_status": "VERIFIED"},
            "reason": "Verified via official state health registry filing",
        },
        headers=headers,
    )
    assert correct_res.status_code == 200
    assert correct_res.json()["name"] == "Corrected Enterprise Clinic"

    # 4. View audit trail
    audit_res = client.get(f"/api/governance/audit-trail?entity_id={entity_id}", headers=headers)
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()
    assert len(audit_entries) >= 1
    assert audit_entries[0]["action"] == "FIELD_CORRECTION"


def test_phase5_integration_management():
    headers = get_auth_headers()

    # 1. List connectors
    list_res = client.get("/api/integrations/status", headers=headers)
    assert list_res.status_code == 200
    connectors = list_res.json()
    assert len(connectors) >= 8

    # 2. Reset circuit breaker
    reset_res = client.post("/api/integrations/npi_registry/circuit-breaker/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["circuit_state"] == "CLOSED"


def test_phase5_ai_governance_and_regression():
    headers = get_auth_headers()

    # 1. Check AI budget tracking
    budget_res = client.get("/api/ai-governance/budgets", headers=headers)
    assert budget_res.status_code == 200
    assert "daily_budget_limit_usd" in budget_res.json()

    # 2. Run Executive Core 6 Regression Benchmark Suite
    bench_res = client.post("/api/ai-governance/benchmark?prompt_version=v5.0", headers=headers)
    assert bench_res.status_code == 200
    data = bench_res.json()
    assert data["benchmark_suite"] == "EXECUTIVE_CORE_6"
    assert data["total_questions"] == 6
    assert data["accuracy_score"] >= 0.8
    assert len(data["questions"]) == 6


def test_phase5_incidents_and_runbooks():
    headers = get_auth_headers()

    # 1. Fetch SRE runbooks
    runbook_res = client.get("/api/incidents/runbooks", headers=headers)
    assert runbook_res.status_code == 200
    runbooks = runbook_res.json()
    assert "DATABASE_CONNECTION_LOSS" in runbooks
    assert "EXTERNAL_PROVIDER_RATE_LIMITED" in runbooks

    # 2. Create an incident
    create_res = client.post(
        "/api/incidents",
        json={
            "title": "NPI Registry High Latency Spike",
            "severity": "HIGH",
            "affected_component": "NPI_REGISTRY_CONNECTOR",
            "description": "Provider response latency exceeded 4500ms threshold.",
            "impact": "Delayed provider enrichment in California region.",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    incident_id = create_res.json()["incident_id"]

    # 3. Update and resolve incident
    update_res = client.patch(
        f"/api/incidents/{incident_id}",
        json={
            "status": "RESOLVED",
            "root_cause": "Upstream government gateway maintenance window.",
            "corrective_action": "Configured fallback to cached public registry records.",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "RESOLVED"


def test_phase5_security_and_ssrf():
    # 1. Unauthenticated request to restricted admin endpoint must be rejected (401)
    unauth_res = client.post("/api/orchestration/enqueue", json={"task_type": "FORECASTING"})
    assert unauth_res.status_code in (401, 403)

    # 2. SSRF URL validation checks
    assert validate_safe_url("https://npiregistry.cms.hhs.gov/api/") == "https://npiregistry.cms.hhs.gov/api/"

    with pytest.raises(ValueError, match="internal localhost"):
        validate_safe_url("http://127.0.0.1:8000/internal")

    with pytest.raises(ValueError, match="private IP address"):
        validate_safe_url("http://192.168.1.1/secret")
