import os
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
from app.database.models import Role, Permission, User


DB_FILE = "./test_api.db"
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



Base.metadata.create_all(bind=engine)





def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


from app.database.models import CollectionRun, Credential, Entity, Product, Project, Source

@pytest.fixture(autouse=True)
def setup_db():
    import sqlalchemy as sa
    TestingSessionLocal.close_all()
    with engine.connect() as conn:
        conn.execute(sa.text("PRAGMA foreign_keys = OFF"))
        conn.commit()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        admin_role = Role(name="admin", description="Administrator")
        analyst_role = Role(name="analyst", description="Analyst")
        perm_read_users = Permission(code="users:read", description="Read users")
        admin_role.permissions.append(perm_read_users)
        db.add_all([admin_role, analyst_role, perm_read_users])
        db.commit()
    finally:
        db.close()





def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_register_first_user_is_superuser():
    db = session_module.SessionLocal()
    db.query(User).delete()
    db.commit()
    db.close()
    res = client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "password123", "full_name": "Admin User"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "admin@example.com"
    assert data["is_superuser"] is True
    assert "admin" in data["roles"]



def test_register_second_user_is_normal_user():
    client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "password123", "full_name": "Admin User"},
    )
    res = client.post(
        "/api/auth/register",
        json={"email": "user2@example.com", "password": "password123", "full_name": "User Two"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "user2@example.com"
    assert data["is_superuser"] is False
    assert "analyst" in data["roles"]


def test_login_and_me():
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "test@example.com"


def test_dashboard_summary():
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    ).json()["access_token"]

    summary_res = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert summary_res.status_code == 200
    assert summary_res.json()["total_projects"] == 0


def test_project_and_product_crud():
    client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "password123", "full_name": "Admin"},
    )
    admin_token = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    ).json()["access_token"]

    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create project
    proj = client.post(
        "/api/projects",
        json={"name": "Electronics", "description": "Tech products"},
        headers=headers,
    ).json()

    # Create product
    prod_res = client.post(
        "/api/products",
        json={
            "project_id": proj["id"],
            "sku": "HEADPHONE-01",
            "title": "Wireless Headset",
            "brand": "AudioTech",
            "category": "Electronics",
            "current_price": 99.99,
        },
        headers=headers,
    )
    assert prod_res.status_code == 201
    prod = prod_res.json()
    assert prod["sku"] == "HEADPHONE-01"

    # List products
    prod_list = client.get("/api/products", headers=headers).json()
    assert len(prod_list) == 1

    # List sources & create source
    source_res = client.post(
        "/api/sources",
        json={"name": "Amazon US", "source_type": "marketplace", "base_url": "https://amazon.com"},
        headers=headers,
    )
    assert source_res.status_code == 201

    # List credentials & create credential
    cred_res = client.post(
        "/api/credentials",
        json={"name": "Amazon API Key", "provider": "AWS", "key_value": "AKIAIOSFODNN7EXAMPLE"},
        headers=headers,
    )
    assert cred_res.status_code == 201
    assert cred_res.json()["key_hint"] == "****MPLE"

    # Audit logs
    audit_res = client.get("/api/audit", headers=headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()) >= 3


def test_excel_upload_and_monitoring():
    client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "password123", "full_name": "Admin"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Sources
    client.post("/api/sources", json={"name": "Amazon", "base_url": "https://amazon.com"}, headers=headers)
    client.post("/api/sources", json={"name": "Walmart", "base_url": "https://walmart.com"}, headers=headers)

    # 2. Create Project
    proj = client.post("/api/projects", json={"name": "Test Project"}, headers=headers).json()

    # 3. Upload CSV sheet of scraped products
    csv_content = (
        "SKU,Title,Brand,Category,Price,Target Price,GTIN,URL\n"
        "SP-101,Ultra Wireless Headphones,SoundPro,Audio,129.99,99.99,123456789,https://example.com/p1\n"
        "SP-102,Smart Fitness Band,HealthTrack,Wearables,49.99,39.99,987654321,https://example.com/p2\n"
    ).encode("utf-8")

    files = {"file": ("scraped_products.csv", csv_content, "text/csv")}
    upload_res = client.post(
        "/api/products/upload-excel",
        data={"project_id": proj["id"]},
        files=files,
        headers=headers,
    )
    assert upload_res.status_code == 201
    res_data = upload_res.json()
    assert res_data["created_products"] == 2
    assert res_data["sources_monitored"] >= 2
    assert res_data["comparisons_generated"] >= 4


    # 4. Verify products list & status
    prods = client.get("/api/products", headers=headers).json()
    assert len(prods) >= 2
    assert prods[0]["status"] == "verified"


    # 5. Fetch single product detail with comparisons
    prod_detail = client.get(f"/api/products/{prods[0]['id']}", headers=headers).json()
    assert "comparisons" in prod_detail
    assert len(prod_detail["comparisons"]) >= 2


    # 6. Check pricing matrix endpoint
    pricing_res = client.get("/api/pricing", headers=headers)
    assert pricing_res.status_code == 200
    pricing_data = pricing_res.json()
    assert len(pricing_data) >= 2

    assert "Amazon" in pricing_data[0]["sources"]
    assert "Walmart" in pricing_data[0]["sources"]


def test_sources_crud():
    client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "password123", "full_name": "Admin"},
    )
    token = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/sources",
        json={"name": "BestBuy", "source_type": "marketplace", "base_url": "https://bestbuy.com"},
        headers=headers,
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/api/sources/{source_id}",
        json={"is_active": False, "name": "BestBuy US"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False
    assert patch_res.json()["name"] == "BestBuy US"

    delete_res = client.delete(f"/api/sources/{source_id}", headers=headers)
    assert delete_res.status_code == 204

