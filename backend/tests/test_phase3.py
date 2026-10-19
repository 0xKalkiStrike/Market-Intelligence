import os
import sys
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

import app.database.models
import app.database.session as session_module
import app.main as main_module
from app.main import app
from app.database.session import Base, get_db

DB_FILE = "./test_p3.db"
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

from unittest.mock import patch

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    from sqlalchemy.orm import close_all_sessions
    close_all_sessions()
    Base.metadata.create_all(bind=engine)


from app.database.models import CollectionRun, Base

@patch("app.services.collection_service.CollectionService.execute_collection_run")
def test_phase3_full_suite(mock_exec):
    mock_run = CollectionRun(
        id="test_run_1",
        source_name="Public Healthcare Registry",
        entity_type="DOCTOR",
        status="COMPLETED",
        records_collected=10,
        records_valid=10,
    )
    mock_exec.return_value = mock_run
    # 1. Register & login
    client.post(
        "/api/auth/register",
        json={"email": "phase3_admin@example.com", "password": "password123", "full_name": "Phase 3 Admin"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "phase3_admin@example.com", "password": "password123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Seed demo data
    seed_res = client.post("/api/market-intelligence/seed-demo", headers=headers)
    assert seed_res.status_code == 201

    # 3. Grounded AI Assistant Ask
    ai_res = client.post(
        "/api/market-intelligence/ai/ask",
        json={"query": "Which competitors changed pricing in Florida?"},
        headers=headers,
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert "answer" in ai_data
    assert "evidence" in ai_data
    assert "confidence" in ai_data
    assert "sources" in ai_data

    # 4. Intelligence Knowledge Objects
    k_res = client.get("/api/market-intelligence/ai/knowledge", headers=headers)
    assert k_res.status_code == 200
    assert k_res.json()["total_objects"] > 0

    # 5. What-Changed Period Comparison
    wc_res = client.get("/api/market-intelligence/ai/what-changed?period=this_week", headers=headers)
    assert wc_res.status_code == 200
    assert "summary" in wc_res.json()

    # 6. Anomalies and Trends
    at_res = client.get("/api/market-intelligence/ai/anomalies-trends", headers=headers)
    assert at_res.status_code == 200
    assert "anomalies" in at_res.json()
    assert "trends" in at_res.json()

    # 7. Cross Source Signals
    cs_res = client.get("/api/market-intelligence/ai/cross-source-signals", headers=headers)
    assert cs_res.status_code == 200
    assert len(cs_res.json()["signals"]) > 0

    # 8. Opportunity Score Explanation
    exp_res = client.get("/api/market-intelligence/ai/opportunity-explain/FL", headers=headers)
    assert exp_res.status_code == 200
    assert "contributing_factors" in exp_res.json()

    # 9. Scanned Opportunities
    opp_res = client.get("/api/market-intelligence/ai/opportunities-scanned", headers=headers)
    assert opp_res.status_code == 200
    assert "opportunities" in opp_res.json()

    # 10. Competitor Profile & Movement Timeline
    comp_res = client.get("/api/market-intelligence/ai/competitors/Veriheal", headers=headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["competitor_name"] is not None

    timeline_res = client.get("/api/market-intelligence/ai/competitors-movement", headers=headers)
    assert timeline_res.status_code == 200

    # 11. Scenario Simulations
    p_sim = client.post(
        "/api/market-intelligence/ai/scenarios/price-change",
        json={"state": "FL", "new_price": 129.0},
        headers=headers,
    )
    assert p_sim.status_code == 200
    assert p_sim.json()["scenario_type"] == "PRICE_CHANGE"

    e_sim = client.post(
        "/api/market-intelligence/ai/scenarios/state-expansion",
        json={"state": "TX", "estimated_setup_cost": 45000.0},
        headers=headers,
    )
    assert e_sim.status_code == 200
    assert e_sim.json()["scenario_type"] == "MARKET_EXPANSION"

    sims_list = client.get("/api/market-intelligence/ai/scenarios", headers=headers)
    assert sims_list.status_code == 200
    assert len(sims_list.json()["simulations"]) >= 2

    # 12. Daily Briefing & Weekly Executive Report
    daily_res = client.get("/api/market-intelligence/reports/daily-briefing", headers=headers)
    assert daily_res.status_code == 200

    weekly_res = client.get("/api/market-intelligence/reports/weekly-executive", headers=headers)
    assert weekly_res.status_code == 200
    assert "markdown_report" in weekly_res.json()

    # 13. Admin Config & Audit Logs
    cfg_res = client.get("/api/market-intelligence/ai/admin/config", headers=headers)
    assert cfg_res.status_code == 200

    cfg_upd = client.post(
        "/api/market-intelligence/ai/admin/config",
        json={"provider_name": "OpenAI", "model_name": "gpt-4o", "max_tokens": 4096, "temperature": 0.1},
        headers=headers,
    )
    assert cfg_upd.status_code == 200

    logs_res = client.get("/api/market-intelligence/ai/admin/audit-logs", headers=headers)
    assert logs_res.status_code == 200

    # 14. Quality Evaluation Suite
    eval_res = client.get("/api/market-intelligence/ai/admin/eval-suite", headers=headers)
    assert eval_res.status_code == 200
    assert eval_res.json()["eval_summary"]["total_benchmarks"] > 0

    # 15. Workload Orchestrator
    workload_status = client.get("/api/market-intelligence/ai/admin/workload-status", headers=headers)
    assert workload_status.status_code == 200

    task_res = client.post(
        "/api/market-intelligence/ai/admin/workload-task",
        json={"task_type": "ANOMALY_DETECTION", "payload": {"scope": "all_states"}},
        headers=headers,
    )
    assert task_res.status_code == 201
    assert task_res.json()["task_type"] == "ANOMALY_DETECTION"
