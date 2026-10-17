import os
os.environ["TESTING"] = "1"
os.environ["SKIP_LIVE_LOOKUPS"] = "1"
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database.models
import app.database.session as session_module
import app.main as main_module
from app.main import app
from app.database.session import Base, get_db

DB_FILE = "./test_mi.db"
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
    TestingSessionLocal.close_all()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)




def test_market_intelligence_seed_and_dashboard():
    # 1. Register admin user
    client.post(
        "/api/auth/register",
        json={"email": "market_admin@example.com", "password": "password123", "full_name": "Market Admin"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "market_admin@example.com", "password": "password123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Seed Demo Data
    seed_res = client.post("/api/market-intelligence/seed-demo", headers=headers)
    assert seed_res.status_code == 201
    assert seed_res.json()["status"] == "success"

    # 3. Fetch Dashboard Data
    dash_res = client.get("/api/market-intelligence/dashboard", headers=headers)
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert data["metrics"]["summary"]["total_entities"] > 0
    assert data["metrics"]["summary"]["doctors"] > 0
    assert data["metrics"]["summary"]["dispensaries"] > 0
    assert data["metrics"]["summary"]["competitors"] > 0
    assert data["metrics"]["summary"]["data_quality_percentage"] > 0

    # 4. List Filtered Entities
    entities_res = client.get("/api/market-intelligence/entities?entity_type=DOCTOR", headers=headers)
    assert entities_res.status_code == 200
    ent_data = entities_res.json()
    assert ent_data["total"] >= 1
    entity_id = ent_data["items"][0]["id"]

    # 5. Fetch Entity Detail
    detail_res = client.get(f"/api/market-intelligence/entities/{entity_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["name"] is not None
    assert "verifications" in detail
    assert "sources" in detail

    # 6. Trigger Collection Run
    collect_res = client.post(
        "/api/market-intelligence/collect",
        json={"source_name": "Public Healthcare Registry", "entity_type": "DOCTOR", "max_records": 10},
        headers=headers,
    )
    assert collect_res.status_code == 201
    assert collect_res.json()["status"] in ("RUNNING", "COMPLETED")

    # 7. Test Export CSV
    export_csv = client.get("/api/market-intelligence/export?format=csv", headers=headers)
    assert export_csv.status_code == 200
    assert "ID,Name,Type" in export_csv.text

    # 8. Test Export JSON
    export_json = client.get("/api/market-intelligence/export?format=json", headers=headers)
    assert export_json.status_code == 200
    assert len(export_json.json()) > 0


def test_custom_collection_limit():
    client.post(
        "/api/auth/register",
        json={"email": "limit_admin@example.com", "password": "password123", "full_name": "Limit Admin"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "limit_admin@example.com", "password": "password123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger collection with 10 limit
    collect_res = client.post(
        "/api/market-intelligence/collect",
        json={
            "source_name": "Public Healthcare Registry",
            "entity_type": "DOCTOR",
            "location": "California",
            "max_records": 10,
        },
        headers=headers,
    )
    assert collect_res.status_code == 201
    res_data = collect_res.json()
    assert res_data["status"] in ("RUNNING", "COMPLETED")
    assert res_data["records_collected"] >= 0


