import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import Base, engine

# Ensure all database tables exist including Phase 4 tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_command_center():
    res = client.get("/api/phase4/command-center?state=FL")
    assert res.status_code == 200
    data = res.json()
    assert "executive_takeaway" in data
    assert "market_status" in data
    assert "capacity_and_demand" in data

def test_watchlists_and_rules():
    # List watchlists
    res = client.get("/api/phase4/watchlists")
    assert res.status_code == 200
    
    # Create watchlist
    res = client.post("/api/phase4/watchlists", json={
        "name": "Test Florida Competitors",
        "category": "Competitor",
        "description": "Watchlist for FL market",
        "items": [{"item_type": "COMPETITOR", "target_identifier": "Veriheal"}]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    wl_id = data["id"]

    # Delete watchlist
    res = client.delete(f"/api/phase4/watchlists/{wl_id}")
    assert res.status_code == 200

    # Monitoring rules
    res = client.get("/api/phase4/monitoring-rules")
    assert res.status_code == 200

def test_intelligent_alert_priority():
    res = client.post("/api/phase4/intelligent-alert-priority", json={
        "magnitude_percent": 25.0,
        "market_relevance": "HIGH",
        "source_confidence": "VERIFIED",
        "operational_impact": "HIGH"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["calculated_priority"] == "CRITICAL"

def test_forecasting():
    # List forecasts
    res = client.get("/api/phase4/forecasts")
    assert res.status_code == 200

    # Generate forecast
    res = client.post("/api/phase4/forecasts", json={
        "metric_name": "APPOINTMENT_VOLUME",
        "state": "FL",
        "horizon_days": 30,
        "model_type": "SEASONAL"
    })
    assert res.status_code == 200
    data = res.json()
    assert "forecast_value" in data
    assert data["horizon_days"] == 30

    # Generate All Time lifetime forecast
    res_all = client.post("/api/phase4/forecasts", json={
        "metric_name": "REVENUE",
        "state": "FL",
        "horizon_days": 0,
        "model_type": "SEASONAL"
    })
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["horizon_days"] == 0
    assert "All Time" in data_all["forecast_period"]
    assert "Lifetime Revenue" in data_all["explanation"]
    assert data_all["data_points_used"] > 1000

    # Evaluations
    res = client.get("/api/phase4/forecasts/evaluations")
    assert res.status_code == 200

def test_capacity_demand():
    res = client.get("/api/phase4/capacity-demand?state=FL")
    assert res.status_code == 200
    data = res.json()
    assert "overall_utilization_rate" in data

def test_geo_optimization():
    res = client.get("/api/phase4/geo-optimization?state=FL")
    assert res.status_code == 200
    data = res.json()
    assert "zip_grid" in data

def test_partnerships():
    res = client.get("/api/phase4/partnerships?state=FL")
    assert res.status_code == 200

def test_competitor_movements():
    res = client.get("/api/phase4/competitor-movements?state=FL")
    assert res.status_code == 200

def test_risk_and_early_warnings():
    res = client.get("/api/phase4/risk-signals")
    assert res.status_code == 200

    res = client.get("/api/phase4/early-warnings?state=FL")
    assert res.status_code == 200

def test_workflows_and_approvals():
    res = client.get("/api/phase4/workflows")
    assert res.status_code == 200

    res = client.get("/api/phase4/approvals")
    assert res.status_code == 200

    res = client.get("/api/phase4/management-queue")
    assert res.status_code == 200

def test_ai_costs_and_routing():
    res = client.get("/api/phase4/ai-costs")
    assert res.status_code == 200

    res = client.post("/api/phase4/ai-costs/route", json={"task_type": "CLASSIFICATION"})
    assert res.status_code == 200
    data = res.json()
    assert data["tier"] == "LIGHTWEIGHT"
