"""
Governed API Platform Router (Phase 6).
Provides a unified, permission-aware, audited, versioned interface (/api/v1/governed):
- Authentication via JWT Bearer or X-API-Key
- Granular permission scope checks
- Consistent pagination, filtering, and error handling
- Internal business metric redaction for unprivileged callers
- Access to all 16 platform intelligence and integration services
"""
import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.api_key_auth import (
    AuthenticatedPrincipal,
    generate_secure_api_key,
    require_governed_scope,
)
from app.auth.rbac import sanitize_internal_business_data
from app.database.models import ApiKey, Entity, EntityLocation, PriceHistory, StateMarketMetric
from app.database.session import get_db
from app.services.analytics_service import AnalyticsService
from app.services.case_management_service import CaseManagementService
from app.services.collaboration_service import CollaborationService
from app.services.conflict_resolution_service import ConflictResolutionService
from app.services.data_export_service import DataExportService
from app.services.data_import_service import DataImportService
from app.services.entity_resolution_service import EntityResolutionService
from app.services.event_alert_service import EventAlertService
from app.services.forecasting_service import ForecastingService
from app.services.geographic_optimization_service import GeographicOptimizationService
from app.services.integration_registry_service import IntegrationRegistryService
from app.services.module_registry_service import ModuleRegistryService
from app.services.opportunity_scoring_service import OpportunityScoringService
from app.services.partnership_service import PartnershipService
from app.services.regulatory_intelligence_service import RegulatoryIntelligenceService
from app.services.report_distribution_service import ReportDistributionService
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/api/v1/governed", tags=["Governed API Platform"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scopes: List[str] = Field(default=["intelligence:read"])
    rate_limit_per_minute: int = Field(default=60, ge=1, le=500)
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365)


class WebhookCreateRequest(BaseModel):
    name: str
    target_url: str
    event_types: List[str] = ["*"]


class EntityResolutionRequest(BaseModel):
    system_name: str
    external_id: str
    name: str
    state: str
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None


class FindingCreateRequest(BaseModel):
    title: str
    category: str = "OPPORTUNITY"
    finding_summary: str
    evidence_sources: List[Dict[str, Any]] = []
    entity_id: Optional[str] = None
    assigned_reviewer: Optional[str] = None
    follow_up_owner: Optional[str] = None


class NoteCreateRequest(BaseModel):
    note_content: str
    finding_id: Optional[str] = None
    entity_id: Optional[str] = None


class DecisionRequest(BaseModel):
    management_decision: str
    status: str = "ACTION_APPROVED"


class CaseCreateRequest(BaseModel):
    title: str
    category: str
    evidence_summary: str
    severity: str = "MEDIUM"
    assigned_investigator: Optional[str] = None
    assigned_reviewer: Optional[str] = None


class SharedWatchlistRequest(BaseModel):
    name: str
    category: str = "Competitor"
    description: Optional[str] = None
    sharing_scope: str = "PERSONAL"
    team_name: Optional[str] = None


class ReportDistributionRequest(BaseModel):
    report_type: str
    channel: str
    recipient_target: str
    schedule_cron: str = "0 9 * * 1"


# ==========================================
# 1. MARKET INTELLIGENCE CORE
# ==========================================

@router.get("/market-intelligence")
def get_governed_market_overview(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    analytics_svc = AnalyticsService()
    raw_data = analytics_svc.get_dashboard_metrics(db)
    if principal.user:
        return sanitize_internal_business_data(raw_data, principal.user)
    elif not principal.has_scope("internal_metrics:read"):
        if "summary" in raw_data and "estimated_total_revenue" in raw_data["summary"]:
            raw_data["summary"]["estimated_total_revenue"] = "[RESTRICTED - INTERNAL MMJ-DOCS DATA]"
    return raw_data


@router.get("/competitors")
def get_governed_competitors(
    state: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    query = db.query(Entity).filter(Entity.entity_type == "COMPETITOR")
    if state and state.upper() != "ALL":
        query = query.join(Entity.locations).filter(EntityLocation.state == state.upper())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    can_read_internal = principal.has_scope("internal_metrics:read")
    results = []
    for c in items:
        loc = c.locations[0] if c.locations else None
        results.append({
            "id": c.id,
            "name": c.name,
            "state": loc.state if loc else None,
            "city": loc.city if loc else None,
            "verification_status": c.verification_status,
            "rating": c.rating,
            "review_count": c.review_count,
            "estimated_revenue": c.estimated_revenue if can_read_internal else "[RESTRICTED]",
            "website": c.contacts[0].website if c.contacts else None,
            "phone": c.contacts[0].phone if c.contacts else None,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": results}


@router.get("/competitor-pricing")
def get_governed_pricing(
    state: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    query = db.query(PriceHistory)
    if state and state.upper() != "ALL":
        query = query.filter(PriceHistory.state == state.upper())
    prices = query.order_by(PriceHistory.effective_date.desc()).limit(100).all()

    results = []
    for p in prices:
        results.append({
            "id": p.id,
            "competitor_name": p.competitor_name,
            "state": p.state,
            "service_name": p.service_name,
            "new_price": p.new_price,
            "previous_price": p.previous_price,
            "confidence": p.confidence,
            "source_name": p.source_name,
            "effective_date": p.effective_date.isoformat() if p.effective_date else None,
        })
    return {"total": len(results), "items": results}


@router.get("/dispensaries")
def get_governed_dispensaries(
    state: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    query = db.query(Entity).filter(Entity.entity_type == "DISPENSARY")
    if state and state.upper() != "ALL":
        query = query.join(Entity.locations).filter(EntityLocation.state == state.upper())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": d.id,
                "name": d.name,
                "state": d.locations[0].state if d.locations else None,
                "city": d.locations[0].city if d.locations else None,
                "phone": d.contacts[0].phone if d.contacts else None,
                "website": d.contacts[0].website if d.contacts else None,
                "verification_status": d.verification_status,
            }
            for d in items
        ]
    }


@router.get("/partnerships")
def get_governed_partnerships(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("partnerships:manage")),
    db: Session = Depends(get_db),
):
    svc = PartnershipService(db)
    return svc.list_opportunities()


@router.get("/state-markets")
def get_governed_state_markets(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    metrics = db.query(StateMarketMetric).all()
    can_read_internal = principal.has_scope("internal_metrics:read")
    return [
        {
            "id": m.id,
            "state": m.state,
            "state_code": m.state_code,
            "patient_population": m.patient_population,
            "competitor_count": m.competitor_count,
            "dispensary_count": m.dispensary_count,
            "physician_capacity": m.physician_capacity,
            "telehealth_allowed": m.telehealth_allowed,
            "opportunity_score": m.opportunity_score,
            "avg_market_price": m.avg_market_price,
            "mmj_patient_volume": m.mmj_patient_volume if can_read_internal else "[RESTRICTED]",
            "mmj_revenue": m.mmj_revenue if can_read_internal else "[RESTRICTED]",
        }
        for m in metrics
    ]


@router.get("/opportunity-scores")
def get_governed_opportunity_scores(
    state: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = OpportunityScoringService(db)
    return svc.get_scores_by_state(state or "FL")


@router.get("/geographic-analytics")
def get_governed_geo(
    state: str = "FL",
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = GeographicOptimizationService(db)
    return svc.get_geo_grid(state)


@router.get("/regulatory-intelligence")
def get_governed_regulatory(
    state: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = RegulatoryIntelligenceService(db)
    return svc.get_regulatory_summary(state or "FL")


@router.get("/events-alerts")
def get_governed_events(
    event_type: Optional[str] = None,
    importance: Optional[str] = None,
    limit: int = 50,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = EventAlertService()
    return svc.list_events(db, event_type=event_type, importance=importance, limit=limit)


@router.get("/forecasts-scenarios")
def get_governed_forecasts(
    state: str = "FL",
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = ForecastingService(db)
    return svc.get_growth_forecast(state)


@router.get("/integration-status")
def get_governed_integration_status(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = IntegrationRegistryService()
    return svc.list_integrations(db)


# ==========================================
# 2. API KEYS & SERVICE ACCOUNTS MANAGEMENT
# ==========================================

@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key(
    req: ApiKeyCreateRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    expires_at = None
    if req.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)

    key_data = generate_secure_api_key(
        name=req.name,
        scopes=req.scopes,
        user_id=principal.user.id if principal.user else None,
        rate_limit_per_minute=req.rate_limit_per_minute,
        expires_at=expires_at,
    )

    api_key_record = ApiKey(
        name=key_data["name"],
        prefix=key_data["prefix"],
        hashed_key=key_data["hashed_key"],
        user_id=key_data["user_id"],
        scopes=json.dumps(key_data["scopes"]),
        rate_limit_per_minute=key_data["rate_limit_per_minute"],
        expires_at=key_data["expires_at"],
        is_active=True,
    )
    db.add(api_key_record)
    db.commit()
    db.refresh(api_key_record)

    return {
        "id": api_key_record.id,
        "name": api_key_record.name,
        "prefix": api_key_record.prefix,
        "full_api_key": key_data["full_api_key"],  # Displayed strictly once!
        "scopes": req.scopes,
        "rate_limit_per_minute": api_key_record.rate_limit_per_minute,
        "expires_at": api_key_record.expires_at.isoformat() if api_key_record.expires_at else None,
        "notice": "Store this API key safely now. It will NEVER be displayed again.",
    }


@router.get("/api-keys")
def list_api_keys(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    results = []
    for k in keys:
        try:
            scopes_list = json.loads(k.scopes)
        except Exception:
            scopes_list = []
        results.append({
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix,
            "scopes": scopes_list,
            "rate_limit_per_minute": k.rate_limit_per_minute,
            "requests_count": k.requests_count,
            "is_active": k.is_active,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })
    return results


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    key_record = db.get(ApiKey, key_id)
    if not key_record:
        raise HTTPException(status_code=404, detail="API key not found.")
    key_record.is_active = False
    db.commit()
    return {"id": key_id, "status": "REVOKED"}


# ==========================================
# 3. WEBHOOKS MANAGEMENT
# ==========================================

@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
def create_webhook(
    req: WebhookCreateRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    try:
        sub = svc.create_subscription(
            name=req.name,
            target_url=req.target_url,
            event_types=req.event_types,
            created_by=principal.identifier,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    return {
        "id": sub.id,
        "name": sub.name,
        "target_url": sub.target_url,
        "secret_key": sub.secret_key,
        "message": "Webhook created. Save secret_key for verifying X-MMJ-Signature-256.",
    }


@router.get("/webhooks")
def list_webhooks(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    return svc.list_subscriptions()


@router.post("/webhooks/{sub_id}/rotate-secret")
def rotate_webhook_secret(
    sub_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    return svc.rotate_secret(sub_id)


@router.delete("/webhooks/{sub_id}")
def delete_webhook(
    sub_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    success = svc.delete_subscription(sub_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook subscription not found.")
    return {"id": sub_id, "status": "DELETED"}


@router.get("/webhooks/deliveries")
def list_webhook_deliveries(
    limit: int = 50,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    return svc.list_delivery_logs(limit=limit)


@router.post("/webhooks/deliveries/{delivery_id}/replay")
def replay_webhook_delivery(
    delivery_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = WebhookService(db)
    return svc.replay_delivery(delivery_id)


# ==========================================
# 4. DATA IMPORT & EXPORT CENTERS
# ==========================================

@router.post("/imports/preview")
async def preview_import(
    file: UploadFile = File(...),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    content = await file.read()
    svc = DataImportService(db)
    fmt = "CSV" if file.filename.endswith(".csv") else "JSON"
    return svc.parse_and_preview(content, file.filename, fmt)


@router.post("/imports/execute")
async def execute_import(
    file: UploadFile = File(...),
    entity_type: str = Form("DISPENSARY"),
    column_mapping_json: str = Form("{}"),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    content = await file.read()
    svc = DataImportService(db)
    fmt = "CSV" if file.filename.endswith(".csv") else "JSON"
    try:
        mapping = json.loads(column_mapping_json)
    except Exception:
        mapping = {}
    return svc.execute_import(
        file_content=content,
        filename=file.filename,
        file_format=fmt,
        entity_type=entity_type,
        column_mapping=mapping,
        created_by=principal.identifier,
    )


@router.get("/imports")
def list_imports(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = DataImportService(db)
    return svc.list_imports()


@router.post("/exports/generate")
def generate_export(
    export_name: str = "Market Intelligence Export",
    format_type: str = "CSV",
    entity_type: str = "ALL",
    state_filter: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = DataExportService(db)
    return svc.generate_export(
        export_name=export_name,
        format_type=format_type,
        entity_type=entity_type,
        state_filter=state_filter,
        principal=principal,
    )


@router.get("/exports/jobs")
def list_export_jobs(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = DataExportService(db)
    return svc.list_export_jobs()


# ==========================================
# 5. CROSS-SYSTEM ENTITY RESOLUTION & CONFLICTS
# ==========================================

@router.post("/entity-resolution/resolve")
def resolve_entity_link(
    req: EntityResolutionRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = EntityResolutionService(db)
    return svc.resolve_external_entity(
        system_name=req.system_name,
        external_id=req.external_id,
        name=req.name,
        state=req.state,
        phone=req.phone,
        website=req.website,
        address=req.address,
        license_number=req.license_number,
    )


@router.get("/entity-resolution/pending")
def list_pending_entity_links(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = EntityResolutionService(db)
    return svc.list_pending_links()


@router.post("/entity-resolution/{link_id}/review")
def review_entity_link(
    link_id: str,
    decision: str = Query(..., pattern="^(CONFIRMED|DISMISSED)$"),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = EntityResolutionService(db)
    return svc.review_link(link_id, decision)


@router.get("/conflicts")
def list_conflicts(
    status: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = ConflictResolutionService(db)
    return svc.list_conflicts(status=status)


@router.post("/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    chosen_value: str = Query(...),
    justification: str = Query(...),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("data_quality:correct")),
    db: Session = Depends(get_db),
):
    svc = ConflictResolutionService(db)
    return svc.resolve_conflict_manually(
        conflict_id=conflict_id,
        chosen_value=chosen_value,
        justification=justification,
        resolved_by=principal.identifier,
    )


# ==========================================
# 6. COLLABORATION WORKSPACE & CASES
# ==========================================

@router.post("/collaboration/findings", status_code=status.HTTP_201_CREATED)
def create_collaboration_finding(
    req: FindingCreateRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    f = svc.create_finding(
        title=req.title,
        category=req.category,
        finding_summary=req.finding_summary,
        evidence_sources=req.evidence_sources,
        entity_id=req.entity_id,
        assigned_reviewer=req.assigned_reviewer,
        follow_up_owner=req.follow_up_owner,
        created_by=principal.identifier,
    )
    return {"id": f.id, "title": f.title, "status": f.status}


@router.get("/collaboration/findings")
def list_collaboration_findings(
    category: Optional[str] = None,
    status: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    return svc.list_findings(category=category, status=status)


@router.post("/collaboration/findings/{finding_id}/decision")
def record_finding_decision(
    finding_id: str,
    req: DecisionRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("workflows:approve")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    return svc.record_decision(finding_id, req.management_decision, req.status)


@router.post("/collaboration/findings/{finding_id}/notes")
def add_note_to_finding(
    finding_id: str,
    req: NoteCreateRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    note = svc.add_note(
        author_email=principal.identifier,
        note_content=req.note_content,
        finding_id=finding_id,
        entity_id=req.entity_id,
    )
    return {"id": note.id, "author": note.author_email, "created_at": note.created_at.isoformat()}


@router.get("/collaboration/findings/{finding_id}/notes")
def list_notes_for_finding(
    finding_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    return svc.list_notes_for_finding(finding_id)


@router.post("/cases", status_code=status.HTTP_201_CREATED)
def create_intelligence_case(
    req: CaseCreateRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CaseManagementService(db)
    c = svc.create_case(
        title=req.title,
        category=req.category,
        evidence_summary=req.evidence_summary,
        severity=req.severity,
        assigned_investigator=req.assigned_investigator,
        assigned_reviewer=req.assigned_reviewer,
    )
    return {"id": c.id, "case_number": c.case_number, "status": c.status}


@router.get("/cases")
def list_intelligence_cases(
    category: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CaseManagementService(db)
    return svc.list_cases(category=category, status=status, severity=severity)


@router.post("/cases/{case_id}/investigate")
def update_case_investigation(
    case_id: str,
    findings: str = Query(...),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CaseManagementService(db)
    return svc.update_investigation(case_id, findings)


@router.post("/cases/{case_id}/decision")
def record_case_decision(
    case_id: str,
    decision: str = Query(...),
    outcome: Optional[str] = Query(None),
    close_case: bool = Query(True),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("workflows:approve")),
    db: Session = Depends(get_db),
):
    svc = CaseManagementService(db)
    return svc.record_decision_and_outcome(
        case_id=case_id,
        management_decision=decision,
        outcome_recorded=outcome,
        close_case=close_case,
    )


# ==========================================
# 7. SHARED WATCHLISTS
# ==========================================

@router.post("/watchlists/shared", status_code=status.HTTP_201_CREATED)
def create_shared_watchlist(
    req: SharedWatchlistRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    wl = svc.create_shared_watchlist(
        name=req.name,
        category=req.category,
        description=req.description,
        sharing_scope=req.sharing_scope,
        team_name=req.team_name,
        created_by=principal.identifier,
    )
    return {"id": wl.id, "name": wl.name, "sharing_scope": wl.sharing_scope}


@router.get("/watchlists/shared")
def list_shared_watchlists(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CollaborationService(db)
    return svc.list_shared_watchlists(current_user_email=principal.identifier)


# ==========================================
# 8. MODULES & DISTRIBUTION
# ==========================================

@router.get("/modules")
def list_intelligence_modules(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
):
    svc = ModuleRegistryService()
    return svc.list_modules()


@router.get("/report-distributions")
def list_report_distributions(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = ReportDistributionService(db)
    return svc.list_distributions()


@router.post("/report-distributions", status_code=status.HTTP_201_CREATED)
def create_report_distribution(
    req: ReportDistributionRequest,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = ReportDistributionService(db)
    dist = svc.create_distribution(
        report_type=req.report_type,
        channel=req.channel,
        recipient_target=req.recipient_target,
        schedule_cron=req.schedule_cron,
    )
    return {"id": dist.id, "channel": dist.channel, "recipient_target": dist.recipient_target}


@router.post("/report-distributions/{dist_id}/trigger")
def trigger_report_distribution(
    dist_id: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("system:manage")),
    db: Session = Depends(get_db),
):
    svc = ReportDistributionService(db)
    return svc.trigger_distribution(dist_id)


# ==========================================
# 9. INTEGRATION CONNECTOR ACTIONS
# ==========================================

@router.post("/integrations/{name}/probe")
def probe_integration(
    name: str,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("sources:manage")),
    db: Session = Depends(get_db),
):
    svc = IntegrationRegistryService()
    return svc.verify_integration_health(db, name)


@router.post("/integrations/{name}/sync")
def sync_integration(
    name: str,
    incremental: bool = Query(True),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("sources:manage")),
    db: Session = Depends(get_db),
):
    svc = IntegrationRegistryService()
    res = svc.sync_integration(db, name, incremental=incremental)
    return {
        "integration_name": res.integration_name,
        "status": res.status,
        "records_processed": res.records_processed,
        "records_added": res.records_added,
        "records_updated": res.records_updated,
        "checkpoint": res.checkpoint,
        "duration_ms": res.duration_ms,
        "error_details": res.error_details,
    }


@router.post("/integrations/{name}/toggle")
def toggle_integration(
    name: str,
    is_enabled: bool = Query(...),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("sources:manage")),
    db: Session = Depends(get_db),
):
    svc = IntegrationRegistryService()
    return svc.toggle_integration(db, name, is_enabled)


# =============================================================================
# PHASE 7 GOVERNED RESEARCH & OPTIMIZATION ENDPOINTS
# =============================================================================

@router.get("/research/projects")
def governed_list_research_projects(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: List active research projects with findings and hypothesis metrics."""
    from app.services.research_workspace_service import ResearchWorkspaceService
    svc = ResearchWorkspaceService()
    return {"projects": svc.list_projects(db, status=status, limit=limit)}


@router.get("/research/geo-opportunity")
def governed_get_geographic_opportunity(
    geographic_id: str = Query("FL"),
    level: str = Query("STATE"),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Calculate multi-level geographic opportunity score and factor contributions."""
    from app.services.advanced_geographic_opportunity_service import AdvancedGeographicOpportunityService
    svc = AdvancedGeographicOpportunityService()
    return svc.calculate_opportunity_score(db, geographic_level=level, geographic_id=geographic_id, persist_snapshot=False)


@router.get("/research/competitive-patterns")
def governed_get_competitive_patterns(
    state: Optional[str] = None,
    competitor: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Retrieve validated competitive intelligence patterns and sustained trends."""
    from app.services.competitive_pattern_service import CompetitivePatternService
    svc = CompetitivePatternService()
    svc.detect_competitor_patterns(db, competitor_name=competitor, state=state)
    return {"patterns": svc.list_patterns(db, include_dismissed=False, state=state)}


@router.get("/research/pricing-spreads")
def governed_get_pricing_spreads(
    state: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Initial vs Renewal consultation price spreads and service equivalence warnings."""
    from app.services.pricing_research_service import PricingResearchService
    svc = PricingResearchService()
    return svc.analyze_initial_vs_renewal_spreads(db, state=state)


@router.post("/research/ai-assistant")
def governed_ai_research_assistant(
    payload: Dict[str, Any],
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Evidence-grounded AI copilot returning citations, facts, calculations, and estimates."""
    from app.services.evidence_grounded_ai_research_service import EvidenceGroundedAiResearchService
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    svc = EvidenceGroundedAiResearchService()
    return svc.answer_research_query(
        db, query=query, project_id=payload.get("project_id"), target_state=payload.get("target_state")
    )


# =============================================================================
# PHASE 8: GOVERNED QUALITY, EVALUATION, DRIFT & OBSERVABILITY ENDPOINTS
# =============================================================================

@router.get("/quality/health")
def governed_get_quality_health(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Platform intelligence quality health index and 7 core data indicators."""
    from app.services.intelligence_quality_service import IntelligenceQualityService
    svc = IntelligenceQualityService()
    return svc.compute_quality_metrics(db, persist_snapshots=True)


@router.get("/quality/failures")
def governed_get_quality_failures(
    limit: int = Query(10, ge=1, le=50),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Trace top consequential data quality failures, attribute conflicts, and duplicate candidates."""
    from app.services.intelligence_quality_service import IntelligenceQualityService
    svc = IntelligenceQualityService()
    return {"failures": svc.trace_consequential_failures(db, limit=limit)}


@router.get("/quality/forecast-accuracy")
def governed_get_forecast_accuracy(
    metric_name: Optional[str] = None,
    state: Optional[str] = None,
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Empirical forecast error metrics (MAE, RMSE, MAPE, Directional Accuracy) from verified actuals."""
    from app.services.outcome_tracking_service import OutcomeTrackingService
    svc = OutcomeTrackingService()
    return svc.compute_empirical_forecast_accuracy(db, metric_name=metric_name, target_state=state)


@router.get("/quality/drift-monitors")
def governed_get_drift_monitors(
    limit: int = Query(20, ge=1, le=50),
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: Statistical Population Stability Index (PSI) drift records and diagnostic classifications."""
    from app.services.model_drift_monitor_service import ModelDriftMonitorService
    svc = ModelDriftMonitorService()
    return {"drift_records": svc.list_drift_records(db, limit=limit)}


@router.get("/quality/operational-telemetry")
def governed_get_operational_telemetry(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: System operational reliability telemetry, ping responsiveness, and background queue depth."""
    from app.services.operational_quality_governance_service import OperationalQualityGovernanceService
    svc = OperationalQualityGovernanceService()
    return svc.get_system_operational_health(db)


@router.get("/quality/cost-governance")
def governed_get_cost_governance(
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    """Governed: AI token consumption, spend breakdown, monthly budget utilization %, and safe fallback status."""
    from app.services.operational_quality_governance_service import OperationalQualityGovernanceService
    svc = OperationalQualityGovernanceService()
    return svc.get_cost_governance_report(db)

