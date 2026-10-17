from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.billing import router as billing_router
from app.api.dashboard import router as dashboard_router
from app.api.governed import router as governed_router
from app.api.market_intelligence import router as market_intelligence_router
from app.api.onboarding import router as onboarding_router
from app.api.operations import router as operations_router
from app.api.phase4 import router as phase4_router
from app.api.platform_admin import router as platform_admin_router
from app.api.quality import router as quality_router
from app.api.research import router as research_router
from app.api.subscriptions import router as subscriptions_router
from app.api.tenants import router as tenants_router
from app.api.usage import router as usage_router
from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.core.config import get_settings
from app.core.observability import ObservabilityMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.credentials.router import router as credentials_router
from app.database.session import Base, engine
from app.evidence.router import router as evidence_router
from app.monitoring.router import router as monitoring_router
from app.pricing.router import router as pricing_router
from app.products.router import router as products_router
from app.projects.router import router as projects_router
from app.reports.router import router as reports_router
from app.services.tenant_membership_service import TenantMembershipService
from app.sources.router import router as sources_router
from app.users.router import router as users_router
from app.verification.router import router as verification_router
from app.workers.jobs_router import router as jobs_router
from app.workers.router import router as workers_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    # Ensure database tables exist & apply automatic schema migration for new columns
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            try:
                conn.execute(text("PRAGMA journal_mode=WAL;"))
                conn.execute(text("PRAGMA busy_timeout=60000;"))
            except Exception:
                pass

            migrations = [
                ("products", "url", "VARCHAR(500)"),
                ("products", "image_url", "VARCHAR(500)"),
                ("products", "specifications", "TEXT"),
                ("entities", "estimated_revenue", "VARCHAR(100)"),
                ("entities", "rating", "FLOAT"),
                ("entities", "review_count", "INTEGER"),
                ("entities", "reviews_source_url", "VARCHAR(500)"),
                ("entities", "employee_count", "VARCHAR(100)"),
                ("entity_contacts", "social_links", "TEXT"),
                ("doctor_details", "estimated_revenue", "VARCHAR(100)"),
                ("doctor_details", "rating", "FLOAT"),
                ("doctor_details", "review_count", "INTEGER"),
                ("doctor_details", "reviews_source_url", "VARCHAR(500)"),
                ("dispensary_details", "estimated_revenue", "VARCHAR(100)"),
                ("dispensary_details", "rating", "FLOAT"),
                ("dispensary_details", "review_count", "INTEGER"),
                ("dispensary_details", "reviews_source_url", "VARCHAR(500)"),
                ("competitor_details", "estimated_revenue", "VARCHAR(100)"),
                ("competitor_details", "employee_count", "VARCHAR(100)"),
                ("competitor_details", "rating", "FLOAT"),
                ("competitor_details", "review_count", "INTEGER"),
                ("competitor_details", "reviews_source_url", "VARCHAR(500)"),
                ("watchlists", "sharing_scope", "VARCHAR(50) DEFAULT 'PERSONAL'"),
                ("watchlists", "team_name", "VARCHAR(100)"),
                ("integration_connector_statuses", "sync_frequency", "VARCHAR(50) DEFAULT 'HOURLY'"),
                ("integration_connector_statuses", "supported_entities", "VARCHAR(255) DEFAULT 'DOCTOR,DISPENSARY,COMPETITOR'"),
                ("integration_connector_statuses", "is_enabled", "BOOLEAN DEFAULT 1"),
                ("integration_connector_statuses", "last_sync_checkpoint", "VARCHAR(255)"),
                ("projects", "organization_id", "VARCHAR(36)"),
                ("research_projects", "organization_id", "VARCHAR(36)"),
            ]
            for tbl, col, col_type in migrations:
                try:
                    res = conn.execute(text(f"PRAGMA table_info({tbl});")).fetchall()
                    existing_cols = [r[1] for r in res]
                    if col not in existing_cols:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type};"))
                        conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print("Database startup schema migration note:", e)

    # Pre-warm analytical and geospatial in-memory caches and ensure default organization in background thread on startup
    import threading
    from app.database.session import SessionLocal
    from app.auth.router import cleanup_demo_users
    from app.services.analytics_service import AnalyticsService
    from app.services.geographic_optimization_service import GeographicOptimizationService

    def warm_startup_cache():
        try:
            with SessionLocal() as db:
                cleanup_demo_users(db)
                TenantMembershipService.ensure_default_organization(db)
                AnalyticsService().get_dashboard_metrics(db)
                geo_svc = GeographicOptimizationService(db)
                for st in ["FL", "CA", "PA", "TX"]:
                    geo_svc.get_geo_grid(st)
        except Exception as ex:
            print("Cache warm exception:", ex)

    threading.Thread(target=warm_startup_cache, daemon=True).start()

    yield


app = FastAPI(title=settings.app_name, version="0.9.0", lifespan=lifespan)

# Enterprise Observability & Rate Limiting Middleware
app.add_middleware(ObservabilityMiddleware)
app.add_middleware(RateLimitMiddleware)

# Secure Enterprise CORS Middleware
cors_origins = settings.cors_origins if settings.cors_origins else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Organization-Id"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in cors_origins else cors_origins[0]
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Credentials": "true"
        }
    )

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(products_router)
app.include_router(sources_router)
app.include_router(credentials_router)
app.include_router(jobs_router)
app.include_router(audit_router)
app.include_router(monitoring_router)
app.include_router(verification_router)
app.include_router(pricing_router)
app.include_router(evidence_router)
app.include_router(reports_router)
app.include_router(workers_router)
app.include_router(dashboard_router)
app.include_router(market_intelligence_router)
app.include_router(phase4_router)
app.include_router(operations_router)
app.include_router(governed_router)
app.include_router(research_router)
app.include_router(quality_router)
app.include_router(tenants_router)
app.include_router(onboarding_router)
app.include_router(subscriptions_router)
app.include_router(billing_router)
app.include_router(usage_router)
app.include_router(platform_admin_router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/health/system")
def system_health() -> dict:
    return {"status": "ok", "system": "Market Intelligence Platform Enterprise v5.0.0"}

