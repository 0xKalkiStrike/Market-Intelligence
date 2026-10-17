"""
Continuous Improvement & Intelligence Quality Engine API Router (Phase 8).
Provides REST endpoints for:
- Quality Health Indicators & Consequential Failure Tracing
- Safe, Reversible Automated Remediation & Audit Trails
- AI Evaluation & Regression Testing Suite
- Empirical Forecast & Recommendation Outcome Tracking
- Model & Analytics Drift Monitoring (PSI & KS Distance)
- Intelligence Feedback Review Queue & Triage
- Operational Reliability Telemetry & Token/Cost Governance
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_optional_current_user, get_current_user
from app.database.models import User
from app.database.session import get_db
from app.services.intelligence_quality_service import IntelligenceQualityService
from app.services.ai_eval_regression_service import AiEvaluationRegressionService
from app.services.outcome_tracking_service import OutcomeTrackingService
from app.services.model_drift_monitor_service import ModelDriftMonitorService
from app.services.operational_quality_governance_service import OperationalQualityGovernanceService

router = APIRouter(prefix="/api/quality", tags=["Phase 8: Continuous Improvement & Quality Engine"])

# Service Singletons
quality_service = IntelligenceQualityService()
ai_eval_service = AiEvaluationRegressionService()
outcome_service = OutcomeTrackingService()
drift_service = ModelDriftMonitorService()
ops_service = OperationalQualityGovernanceService()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class RemediationRequest(BaseModel):
    incident_type: str = Field(..., description="REFRESH_STALE_RECORD, QUARANTINE_RECORD, RETRY_JOB, RESOLVE_CONFLICT_BY_RECENCY")
    target_entity_type: str = Field(default="ENTITY")
    target_entity_id: Optional[str] = None
    action_taken: Optional[str] = None


class AiEvaluateRequest(BaseModel):
    suite_name: str = Field(default=AiEvaluationRegressionService.DEFAULT_SUITE)
    model_name: str = Field(default="gpt-4o")
    prompt_version: str = Field(default="v8.0")
    dataset_version: str = Field(default="v1.0")


class ForecastPredictionRequest(BaseModel):
    metric_name: str = Field(default="APPOINTMENT_VOLUME")
    target_state: str = Field(default="FL")
    target_date: datetime
    predicted_value: float = Field(..., ge=0.0)
    forecast_id: Optional[str] = None
    verification_source: str = Field(default="STATE_DOH_REGISTRY")


class ForecastVerifyRequest(BaseModel):
    actual_value: float = Field(..., ge=0.0)
    verification_source: Optional[str] = None
    is_disputed: bool = Field(default=False)


class RecommendationCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    action_recommended: str = Field(..., min_length=5)
    target_state: str = Field(default="FL")
    recommendation_type: str = Field(default="PRICING_ADJUSTMENT")
    baseline_metric_val: float = Field(default=0.0)
    finding_id: Optional[str] = None


class RecommendationAdoptRequest(BaseModel):
    adoption_status: str = Field(..., description="ACCEPTED, REJECTED, EXECUTED")
    rejection_reason: Optional[str] = None
    execution_notes: str = Field(default="")


class RecommendationOutcomeRequest(BaseModel):
    measured_outcome_val: float


class DriftScanRequest(BaseModel):
    scan_type: str = Field(default="PRICING", description="PRICING, OPPORTUNITY_SCORE, ALL")
    state: str = Field(default="FL")
    window_days: int = Field(default=30, ge=7, le=180)


class FeedbackSubmitRequest(BaseModel):
    target_type: str = Field(default="FINDING", description="FINDING, FORECAST, OPPORTUNITY, PRICING, COMPETITOR")
    target_id: str
    feedback_type: str = Field(default="INACCURATE", description="USEFUL, INACCURATE, INCOMPLETE, OUTDATED, IRRELEVANT, INCORRECT_SOURCE, DUPLICATE_ENTITY")
    notes: str = Field(default="")


class FeedbackResolveRequest(BaseModel):
    new_status: str = Field(..., description="INVESTIGATING, RESOLVED, DISMISSED")
    resolution_notes: str = Field(..., min_length=3)


# =============================================================================
# 1. QUALITY HEALTH & CONTEXTUAL REMEDIATION ENDPOINTS
# =============================================================================

@router.get("/health")
def get_quality_health_dashboard(db: Session = Depends(get_db)):
    """Computes real-time data completeness, freshness, reliability, duplicate rate, and quality health score."""
    return quality_service.compute_quality_metrics(db, persist_snapshots=True)


@router.get("/snapshots")
def list_quality_snapshots(
    metric_name: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieves historical quality metric snapshots for trend visualization."""
    return {"snapshots": quality_service.list_quality_snapshots(db, metric_name=metric_name, limit=limit)}


@router.get("/failures")
def list_consequential_failures(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Traces and ranks top consequential quality failures (attribute conflicts, duplicate pairs, failed jobs)."""
    return {"failures": quality_service.trace_consequential_failures(db, limit=limit)}


@router.post("/remediate")
def execute_remediation(
    payload: RemediationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Executes safe, reversible automated remediation (stale refresh, quarantine, retry, recency conflict resolution)."""
    email = current_user.email if current_user else "system"
    return quality_service.execute_automated_remediation(
        db,
        incident_type=payload.incident_type,
        target_entity_type=payload.target_entity_type,
        target_entity_id=payload.target_entity_id,
        action_taken=payload.action_taken,
        triggered_by=email,
    )


# =============================================================================
# 2. AI EVALUATION & REGRESSION TESTING ENDPOINTS
# =============================================================================

@router.post("/ai/evaluate")
def run_ai_regression_evaluation(
    payload: AiEvaluateRequest,
    db: Session = Depends(get_db),
):
    """Executes version-controlled AI regression suite evaluating factual, citation, numerical, prompt injection, and PHI guard performance."""
    return ai_eval_service.run_evaluation_suite(
        db,
        suite_name=payload.suite_name,
        model_name=payload.model_name,
        prompt_version=payload.prompt_version,
        dataset_version=payload.dataset_version,
    )


@router.get("/ai/runs")
def list_ai_evaluation_runs(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Lists historical AI regression benchmark runs and regression flags."""
    return {"runs": ai_eval_service.list_evaluation_runs(db, limit=limit)}


# =============================================================================
# 3. FORECAST & RECOMMENDATION OUTCOME TRACKING ENDPOINTS
# =============================================================================

@router.post("/outcomes/forecast")
def record_forecast_prediction(
    payload: ForecastPredictionRequest,
    db: Session = Depends(get_db),
):
    """Registers a forecast prediction awaiting future empirical ground-truth verification."""
    rec = outcome_service.record_forecast_prediction(
        db,
        metric_name=payload.metric_name,
        target_state=payload.target_state,
        target_date=payload.target_date,
        predicted_value=payload.predicted_value,
        forecast_id=payload.forecast_id,
        verification_source=payload.verification_source,
    )
    return {"prediction_id": rec.id, "status": rec.status}


@router.post("/outcomes/forecast/{outcome_id}/verify")
def verify_forecast_actual(
    outcome_id: str,
    payload: ForecastVerifyRequest,
    db: Session = Depends(get_db),
):
    """Calibrates empirical ground-truth actual against recorded forecast and calculates MAE/MAPE error."""
    return outcome_service.record_verified_actual(
        db,
        outcome_id=outcome_id,
        actual_value=payload.actual_value,
        verification_source=payload.verification_source,
        is_disputed=payload.is_disputed,
    )


@router.get("/outcomes/forecast/accuracy")
def get_empirical_forecast_accuracy(
    metric_name: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Calculates empirical MAE, RMSE, MAPE, and directional accuracy exclusively from verified actuals."""
    return outcome_service.compute_empirical_forecast_accuracy(db, metric_name=metric_name, target_state=state)


@router.get("/outcomes/forecast")
def list_forecast_outcomes(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lists recorded forecast predictions and their verified empirical outcomes."""
    return {"forecast_outcomes": outcome_service.list_forecast_outcomes(db, status=status, limit=limit)}


@router.post("/outcomes/recommendations")
def create_recommendation_record(
    payload: RecommendationCreateRequest,
    db: Session = Depends(get_db),
):
    """Registers a strategic business recommendation for operational lifecycle tracking."""
    rec = outcome_service.record_recommendation(
        db,
        title=payload.title,
        action_recommended=payload.action_recommended,
        target_state=payload.target_state,
        recommendation_type=payload.recommendation_type,
        baseline_metric_val=payload.baseline_metric_val,
        finding_id=payload.finding_id,
    )
    return {"recommendation_id": rec.id, "adoption_status": rec.adoption_status}


@router.post("/outcomes/recommendations/{recommendation_id}/adopt")
def update_recommendation_adoption(
    recommendation_id: str,
    payload: RecommendationAdoptRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Audits human user decision on a strategic recommendation."""
    email = current_user.email if current_user else "executive@mmjdocs.com"
    return outcome_service.update_recommendation_adoption(
        db,
        recommendation_id=recommendation_id,
        adoption_status=payload.adoption_status,
        user_email=email,
        rejection_reason=payload.rejection_reason,
        execution_notes=payload.execution_notes,
    )


@router.post("/outcomes/recommendations/{recommendation_id}/outcome")
def record_recommendation_measured_outcome(
    recommendation_id: str,
    payload: RecommendationOutcomeRequest,
    db: Session = Depends(get_db),
):
    """Records measured business outcome following recommendation execution."""
    return outcome_service.record_recommendation_outcome(
        db,
        recommendation_id=recommendation_id,
        measured_outcome_val=payload.measured_outcome_val,
    )


@router.get("/outcomes/recommendations")
def list_recommendations(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lists strategic recommendations with adoption decisions and measured follow-through."""
    return {"recommendations": outcome_service.list_recommendation_outcomes(db, limit=limit)}


# =============================================================================
# 4. MODEL & ANALYTICS DRIFT MONITORING ENDPOINTS
# =============================================================================

@router.post("/drift/scan")
def run_drift_scan(
    payload: DriftScanRequest,
    db: Session = Depends(get_db),
):
    """Runs statistical drift detection calculating PSI and KS distance over pricing and opportunity score distributions."""
    if payload.scan_type == "PRICING":
        return drift_service.scan_pricing_distribution_drift(db, state=payload.state, window_days=payload.window_days)
    elif payload.scan_type == "OPPORTUNITY_SCORE":
        return drift_service.scan_opportunity_score_drift(db)
    else:
        p_res = drift_service.scan_pricing_distribution_drift(db, state=payload.state, window_days=payload.window_days)
        g_res = drift_service.scan_opportunity_score_drift(db)
        return {"pricing_drift": p_res, "opportunity_drift": g_res}


@router.get("/drift/records")
def list_drift_records(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Lists historical drift monitor detections with PSI scores and diagnostic classifications."""
    return {"drift_records": drift_service.list_drift_records(db, limit=limit)}


# =============================================================================
# 5. INTELLIGENCE FEEDBACK QUEUE & TRIAGE ENDPOINTS
# =============================================================================

@router.post("/feedback")
def submit_intelligence_feedback(
    payload: FeedbackSubmitRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Submits user intelligence feedback for quality triage without mutating historical analytical outputs."""
    email = current_user.email if current_user else "analyst@mmjdocs.com"
    return ops_service.submit_feedback(
        db,
        target_type=payload.target_type,
        target_id=payload.target_id,
        feedback_type=payload.feedback_type,
        notes=payload.notes,
        user_email=email,
    )


@router.get("/feedback")
def list_feedback_queue(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lists user intelligence feedback items awaiting administrative review."""
    return {"feedback_items": ops_service.list_feedback_queue(db, status=status, limit=limit)}


@router.post("/feedback/{feedback_id}/resolve")
def resolve_feedback_item(
    feedback_id: str,
    payload: FeedbackResolveRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Audits administrative resolution of user reported feedback."""
    email = current_user.email if current_user else "admin@mmjdocs.com"
    return ops_service.resolve_feedback(
        db,
        feedback_id=feedback_id,
        new_status=payload.new_status,
        resolution_notes=payload.resolution_notes,
        resolved_by=email,
    )


# =============================================================================
# 6. OPERATIONAL TELEMETRY & PERFORMANCE/COST GOVERNANCE
# =============================================================================

@router.get("/operational/telemetry")
def get_operational_telemetry(db: Session = Depends(get_db)):
    """Measures genuine database responsiveness, storage size, background job queue depth, and collector uptime."""
    return ops_service.get_system_operational_health(db)


@router.get("/operational/cost")
def get_cost_governance_report(db: Session = Depends(get_db)):
    """Generates transparent token consumption, cost breakdown, budget utilization %, and safe degraded fallback policies."""
    return ops_service.get_cost_governance_report(db)
