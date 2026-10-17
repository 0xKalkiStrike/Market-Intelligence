"""
Enterprise Operations, Scalability, Governance & Incident Management API Router (Phase 5).
Exposes:
- Observability & Metrics (/api/metrics, /api/observability/summary)
- Workload Orchestration (/api/orchestration/...)
- Data Governance & Quality Operations (/api/governance/...)
- External Integration Management (/api/integrations/...)
- AI Governance & Regression Suite (/api/ai-governance/...)
- Incident Management & SRE Runbooks (/api/incidents/...)
- Backup Operations (/api/backups/...)
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.rbac import require_permission
from app.core.circuit_breaker import circuit_breaker_registry
from app.core.observability import metrics_collector
from app.core.reliability import HealthCheckService
from app.database.models import User
from app.database.session import get_db
from app.orchestration.engine import orchestration_engine, WorkloadAdmissionError
from app.services.data_governance_service import DataGovernanceService
from app.services.integration_management_service import IntegrationManagementService
from app.services.ai_governance_service import AiGovernanceService
from app.services.incident_management_service import IncidentManagementService

router = APIRouter(tags=["Phase 5 Enterprise Operations"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class TaskEnqueueRequest(BaseModel):
    task_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    priority: int = Field(default=5, ge=1, le=10)

class RecordCorrectionRequest(BaseModel):
    updates: Dict[str, Any]
    reason: str

class DuplicateResolutionRequest(BaseModel):
    resolution: str  # "MERGE" or "DISMISS"
    survivor_id: Optional[str] = None
    reason: str = "Administrative review"

class IncidentCreateRequest(BaseModel):
    title: str
    severity: str = "MEDIUM"  # CRITICAL, HIGH, MEDIUM, LOW
    affected_component: str
    description: str
    impact: Optional[str] = None
    assigned_owner: Optional[str] = None

class IncidentUpdateRequest(BaseModel):
    status: str
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    assigned_owner: Optional[str] = None


# ==========================================
# 1. OBSERVABILITY & METRICS
# ==========================================

@router.get("/api/metrics")
def get_prometheus_metrics():
    """Prometheus-compatible plain text metrics scrape endpoint."""
    content = metrics_collector.export_prometheus_text()
    return Response(content=content, media_type="text/plain; version=0.0.4; charset=utf-8")


@router.get("/api/observability/summary")
def get_observability_summary():
    """Aggregated JSON summary of API traffic, response times, error rates, and resource utilization."""
    return metrics_collector.get_summary()


@router.get("/api/health/ready")
def readiness_probe(db: Session = Depends(get_db)):
    """Kubernetes/Container readiness probe checking database connectivity."""
    db_check = HealthCheckService.check_database(db)
    if db_check["status"] != "HEALTHY":
        raise HTTPException(status_code=503, detail="Database readiness probe failed.")
    return {"status": "READY", "database": db_check}


@router.get("/api/health/dependencies")
def dependencies_health(db: Session = Depends(get_db)):
    """Detailed health status across database, local storage, circuit breakers, and integrations."""
    return HealthCheckService.check_dependencies(db)


# ==========================================
# 2. INTERNAL WORKLOAD ORCHESTRATION
# ==========================================

@router.get("/api/orchestration/metrics")
def get_orchestration_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Queue depth, active concurrency, failure counts, and dead-letter queue metrics."""
    return orchestration_engine.get_queue_metrics(db)


@router.get("/api/orchestration/tasks")
def list_orchestration_tasks(
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists asynchronous workload tasks with status and priority filters."""
    return orchestration_engine.list_tasks(db, status=status, task_type=task_type, limit=limit)


@router.post("/api/orchestration/enqueue", status_code=status.HTTP_201_CREATED)
def enqueue_workload_task(
    req: TaskEnqueueRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("collection:run")),
):
    """Enqueues an asynchronous workload job with priority scheduling and backpressure admission control."""
    try:
        task = orchestration_engine.enqueue(
            db=db,
            task_type=req.task_type,
            payload=req.payload,
            priority=req.priority,
        )
        return {"status": "QUEUED", "task_id": task.id, "priority": task.priority}
    except WorkloadAdmissionError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/api/orchestration/execute-next")
def execute_next_workload(
    worker_id: str = "worker-pool-1",
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Manually triggers the execution of the next highest-priority queued workload."""
    task = orchestration_engine.execute_next(db, worker_id=worker_id)
    if not task:
        return {"status": "IDLE", "message": "No pending tasks in queue or concurrency limit reached."}
    return {
        "status": task.status,
        "task_id": task.id,
        "task_type": task.task_type,
        "retry_count": task.retry_count,
        "error_message": task.error_message,
    }


@router.post("/api/orchestration/tasks/{task_id}/cancel")
def cancel_workload_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Cancels a pending or active workload task."""
    ok = orchestration_engine.cancel_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found or not in cancellable state.")
    return {"status": "CANCELLED", "task_id": task_id}


@router.post("/api/orchestration/tasks/{task_id}/retry")
def retry_dead_letter_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Resurrects a dead-lettered task back into the active queue."""
    task = orchestration_engine.retry_dead_letter(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not in DEAD_LETTER status.")
    return {"status": "QUEUED", "task_id": task.id, "message": "Task resurrected for execution."}


# ==========================================
# 3. DATA GOVERNANCE & QUALITY OPERATIONS
# ==========================================

@router.get("/api/governance/overview")
def get_governance_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Overview of data quality statuses, verified records, and provenance lineage."""
    svc = DataGovernanceService(db)
    return svc.get_governance_overview()


@router.get("/api/governance/quality-issues")
def scan_quality_issues(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Scans for 12 data quality issues (duplicates, invalid prices, stale records, etc.)."""
    svc = DataGovernanceService(db)
    return svc.scan_quality_issues()


@router.put("/api/governance/entities/{entity_id}/correct")
def correct_entity_record(
    entity_id: str,
    req: RecordCorrectionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("data_quality:correct")),
):
    """Applies authorized corrections to an entity and records change history in EntityAuditTrail."""
    svc = DataGovernanceService(db)
    try:
        updated = svc.correct_entity_record(
            entity_id=entity_id,
            updates=req.updates,
            reason=req.reason,
            user_id=user.id,
            user_email=user.email,
        )
        return {"status": "UPDATED", "entity_id": updated.id, "name": updated.name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/governance/duplicates/{candidate_id}/resolve")
def resolve_duplicate_candidate(
    candidate_id: str,
    req: DuplicateResolutionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("data_quality:correct")),
):
    """Reviews and resolves duplicate candidate pair (Merge or Dismiss) with full audit logging."""
    svc = DataGovernanceService(db)
    try:
        return svc.resolve_duplicate_candidate(
            candidate_id=candidate_id,
            resolution=req.resolution,
            survivor_id=req.survivor_id,
            reason=req.reason,
            user_id=user.id,
            user_email=user.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/governance/audit-trail")
def list_governance_audit_trail(
    entity_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("audit:read")),
):
    """Returns history of manual entity corrections and duplicate resolutions."""
    svc = DataGovernanceService(db)
    return svc.list_audit_trail(entity_id=entity_id, limit=limit)


# ==========================================
# 4. EXTERNAL INTEGRATION MANAGEMENT
# ==========================================

@router.get("/api/integrations/status")
def list_integration_connectors(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Status, latency, error rates, and quotas across all 8 enterprise external connectors."""
    svc = IntegrationManagementService(db)
    return svc.list_connectors()


@router.post("/api/integrations/{connector_name}/probe")
def probe_integration_connector(
    connector_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("sources:manage")),
):
    """Actively probes connector endpoint with circuit breaker and 5-second timeout."""
    svc = IntegrationManagementService(db)
    try:
        return svc.probe_connector(connector_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/api/integrations/{connector_name}/circuit-breaker/reset")
def reset_circuit_breaker(
    connector_name: str,
    user: User = Depends(require_permission("system:manage")),
):
    """Resets the circuit breaker state for the specified connector."""
    cb = circuit_breaker_registry.get_or_create(connector_name)
    cb.reset()
    return {"connector_name": connector_name, "circuit_state": "CLOSED", "message": "Circuit breaker reset."}


# ==========================================
# 5. AI GOVERNANCE & REGRESSION BENCHMARKS
# ==========================================

@router.post("/api/ai-governance/benchmark")
def run_ai_regression_benchmark(
    prompt_version: str = "v5.0",
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ai:admin")),
):
    """Runs the 6 Core Business Questions regression test suite and computes groundedness and accuracy."""
    svc = AiGovernanceService(db)
    return svc.run_regression_benchmark_suite(prompt_version=prompt_version)


@router.get("/api/ai-governance/budgets")
def get_ai_budget_status(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ai:admin")),
):
    """Current operational LLM expenditure against configured daily and monthly budgets."""
    from app.database.models import AiCostLog
    from sqlalchemy import func
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    daily_spend = db.query(func.coalesce(func.sum(AiCostLog.calculated_cost_usd), 0.0)).filter(AiCostLog.created_at >= today_start).scalar()
    monthly_spend = db.query(func.coalesce(func.sum(AiCostLog.calculated_cost_usd), 0.0)).filter(AiCostLog.created_at >= month_start).scalar()

    return {
        "daily_spend_usd": round(daily_spend, 4),
        "daily_budget_limit_usd": AiGovernanceService.DAILY_BUDGET_USD,
        "daily_budget_remaining_usd": round(max(0.0, AiGovernanceService.DAILY_BUDGET_USD - daily_spend), 4),
        "monthly_spend_usd": round(monthly_spend, 4),
        "monthly_budget_limit_usd": AiGovernanceService.MONTHLY_BUDGET_USD,
        "monthly_budget_remaining_usd": round(max(0.0, AiGovernanceService.MONTHLY_BUDGET_USD - monthly_spend), 4),
    }


# ==========================================
# 6. INCIDENT MANAGEMENT & RUNBOOKS
# ==========================================

@router.get("/api/incidents")
def list_incidents(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists operational incidents with severity and status filters."""
    svc = IncidentManagementService(db)
    return svc.list_incidents(status=status, severity=severity, limit=limit)


@router.post("/api/incidents", status_code=status.HTTP_201_CREATED)
def create_incident(
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Creates a new operational incident record."""
    svc = IncidentManagementService(db)
    incident = svc.create_incident(
        title=req.title,
        severity=req.severity,
        affected_component=req.affected_component,
        description=req.description,
        impact=req.impact,
        assigned_owner=req.assigned_owner or user.email,
    )
    return {"status": "CREATED", "incident_id": incident.id, "title": incident.title}


@router.patch("/api/incidents/{incident_id}")
def update_incident(
    incident_id: str,
    req: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("system:manage")),
):
    """Updates incident status, RCA root cause, corrective action, or owner."""
    svc = IncidentManagementService(db)
    try:
        updated = svc.update_incident_status(
            incident_id=incident_id,
            status=req.status,
            root_cause=req.root_cause,
            corrective_action=req.corrective_action,
            assigned_owner=req.assigned_owner,
        )
        return {"status": updated.status, "incident_id": updated.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/incidents/runbooks")
def get_incident_runbooks(user: User = Depends(get_current_user)):
    """SRE Incident Runbooks for standard failure modes."""
    svc = IncidentManagementService(None)
    return svc.get_runbooks()


# ==========================================
# 7. BACKUP OPERATIONS
# ==========================================

@router.post("/api/backups/create")
def trigger_backup(
    label: str = Query("on_demand"),
    user: User = Depends(require_permission("backup:manage")),
):
    """Triggers an online database snapshot with cryptographic SHA256 checksum."""
    from scripts.backup_manager import BackupManager
    bm = BackupManager()
    return bm.create_backup(label=label)


@router.post("/api/backups/test-restore")
def test_restore_harness(user: User = Depends(require_permission("backup:manage"))):
    """Executes a non-destructive restoration validation test in an isolated temporary sandbox."""
    from scripts.backup_manager import BackupManager
    bm = BackupManager()
    return bm.test_restore_harness()
