from typing import Dict, Any, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.continuous_intelligence_service import ContinuousIntelligenceService
from app.services.forecasting_service import ForecastingService
from app.services.capacity_demand_service import CapacityDemandService
from app.services.geographic_optimization_service import GeographicOptimizationService
from app.services.partnership_optimization_service import PartnershipOptimizationService
from app.services.competitive_movement_service import CompetitiveMovementService
from app.services.early_warning_risk_service import EarlyWarningRiskService
from app.services.workflow_automation_service import WorkflowAutomationService
from app.services.ai_cost_management_service import AiCostManagementService
from app.services.executive_command_center_service import ExecutiveCommandCenterService

router = APIRouter(prefix="/api/phase4", tags=["Phase 4 Intelligence & Automation"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class WatchlistCreateRequest(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    items: Optional[List[Dict[str, str]]] = None

class WatchlistItemCreateRequest(BaseModel):
    watchlist_id: str
    item_type: str
    target_identifier: str
    notes: Optional[str] = None

class MonitoringRuleCreateRequest(BaseModel):
    name: str
    trigger_event: str
    condition_operator: str
    condition_value: str
    action_type: str = "CREATE_ALERT"
    priority: str = "HIGH"

class AlertPriorityRequest(BaseModel):
    magnitude_percent: float
    market_relevance: str
    source_confidence: str
    operational_impact: str

class ForecastGenerateRequest(BaseModel):
    metric_name: str = "APPOINTMENT_VOLUME"
    state: str = "FL"
    horizon_days: Union[int, str] = 30
    model_type: str = "SEASONAL"

class GeoClusterCreateRequest(BaseModel):
    cluster_name: str
    cluster_type: str
    state: str
    zip_codes: List[str]
    opportunity_score: float = 75.0
    recommendation: Optional[str] = None

class PartnershipStatusUpdateRequest(BaseModel):
    opp_id: str
    new_status: str
    notes: Optional[str] = None

class CompetitorScoreRequest(BaseModel):
    competitor_name: str
    state: str = "FL"

class WorkflowTriggerRequest(BaseModel):
    workflow_id: str
    payload: Dict[str, Any]

class ApprovalReviewRequest(BaseModel):
    approval_id: str
    action: str  # APPROVE or REJECT
    reviewer: str = "Manager"
    notes: Optional[str] = None

class FeedbackRecordRequest(BaseModel):
    target_type: str
    target_id: str
    feedback: str
    notes: Optional[str] = None

class ModelRouteRequest(BaseModel):
    task_type: str


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/command-center")
def get_executive_command_center(state: str = "FL", db: Session = Depends(get_db)):
    svc = ExecutiveCommandCenterService(db)
    return svc.get_command_center_summary(state=state)

@router.get("/watchlists")
def get_watchlists(db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.get_watchlists()

@router.post("/watchlists")
def create_watchlist(req: WatchlistCreateRequest, db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.create_watchlist(name=req.name, category=req.category, description=req.description, items=req.items)

@router.post("/watchlists/items")
def add_watchlist_item(req: WatchlistItemCreateRequest, db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.add_watchlist_item(watchlist_id=req.watchlist_id, item_type=req.item_type, target_identifier=req.target_identifier, notes=req.notes)

@router.delete("/watchlists/{watchlist_id}")
def delete_watchlist(watchlist_id: str, db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.delete_watchlist(watchlist_id)

@router.get("/monitoring-rules")
def get_monitoring_rules(db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.get_monitoring_rules()

@router.post("/monitoring-rules")
def create_monitoring_rule(req: MonitoringRuleCreateRequest, db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.create_monitoring_rule(
        name=req.name,
        trigger_event=req.trigger_event,
        condition_operator=req.condition_operator,
        condition_value=req.condition_value,
        action_type=req.action_type,
        priority=req.priority
    )

@router.post("/intelligent-alert-priority")
def evaluate_alert_priority(req: AlertPriorityRequest, db: Session = Depends(get_db)):
    svc = ContinuousIntelligenceService(db)
    return svc.evaluate_intelligent_alert_priority(
        magnitude_percent=req.magnitude_percent,
        market_relevance=req.market_relevance,
        source_confidence=req.source_confidence,
        operational_impact=req.operational_impact
    )

@router.get("/forecasts")
def list_forecasts(limit: int = 20, db: Session = Depends(get_db)):
    svc = ForecastingService(db)
    return svc.list_forecasts(limit=limit)

@router.post("/forecasts")
def generate_forecast(req: ForecastGenerateRequest, db: Session = Depends(get_db)):
    svc = ForecastingService(db)
    return svc.generate_forecast(
        metric_name=req.metric_name,
        state=req.state,
        horizon_days=req.horizon_days,
        model_type=req.model_type
    )

@router.get("/forecasts/evaluations")
def list_evaluations(db: Session = Depends(get_db)):
    svc = ForecastingService(db)
    return svc.list_evaluations()

@router.post("/forecasts/evaluations")
def evaluate_model(metric_name: str = "APPOINTMENT_VOLUME", db: Session = Depends(get_db)):
    svc = ForecastingService(db)
    return svc.evaluate_model(metric_name=metric_name)

@router.get("/capacity-demand")
def get_capacity_demand(state: str = "FL", db: Session = Depends(get_db)):
    svc = CapacityDemandService(db)
    return svc.analyze_capacity_and_demand(state=state)

@router.get("/geo-optimization")
def get_geo_optimization(state: str = "FL", db: Session = Depends(get_db)):
    svc = GeographicOptimizationService(db)
    return svc.get_geo_grid(state=state)

@router.post("/geo-optimization/clusters")
def create_geo_cluster(req: GeoClusterCreateRequest, db: Session = Depends(get_db)):
    svc = GeographicOptimizationService(db)
    return svc.create_cluster(
        cluster_name=req.cluster_name,
        cluster_type=req.cluster_type,
        state=req.state,
        zip_codes=req.zip_codes,
        opportunity_score=req.opportunity_score,
        recommendation=req.recommendation
    )

@router.get("/partnerships")
def list_partnerships(state: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    svc = PartnershipOptimizationService(db)
    return svc.list_opportunities(state=state, status=status)

@router.patch("/partnerships/status")
def update_partnership_status(req: PartnershipStatusUpdateRequest, db: Session = Depends(get_db)):
    svc = PartnershipOptimizationService(db)
    return svc.update_partnership_stage(opp_id=req.opp_id, new_status=req.new_status, notes=req.notes)

@router.get("/competitor-movements")
def list_competitor_movements(state: Optional[str] = None, db: Session = Depends(get_db)):
    svc = CompetitiveMovementService(db)
    return svc.list_movement_scores(state=state)

@router.post("/competitor-movements/calculate")
def calculate_competitor_score(req: CompetitorScoreRequest, db: Session = Depends(get_db)):
    svc = CompetitiveMovementService(db)
    return svc.calculate_movement_score(competitor_name=req.competitor_name, state=req.state)

@router.get("/risk-signals")
def list_risk_signals(severity: Optional[str] = None, db: Session = Depends(get_db)):
    svc = EarlyWarningRiskService(db)
    return svc.list_risk_signals(severity=severity)

@router.get("/early-warnings")
def list_early_warnings(state: str = "FL", db: Session = Depends(get_db)):
    svc = EarlyWarningRiskService(db)
    return svc.correlate_early_warnings(state=state)

@router.get("/workflows")
def list_workflows(db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.list_workflows()

@router.post("/workflows/trigger")
def trigger_workflow(req: WorkflowTriggerRequest, db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.trigger_workflow(workflow_id=req.workflow_id, trigger_payload=req.payload)

@router.get("/approvals")
def list_approvals(status: Optional[str] = None, db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.list_approvals(status=status)

@router.post("/approvals/review")
def review_approval(req: ApprovalReviewRequest, db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.review_approval(approval_id=req.approval_id, action=req.action, reviewer=req.reviewer, notes=req.notes)

@router.get("/management-queue")
def list_management_queue(status: Optional[str] = None, db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.list_management_queue(status=status)

@router.post("/feedback")
def record_feedback(req: FeedbackRecordRequest, db: Session = Depends(get_db)):
    svc = WorkflowAutomationService(db)
    return svc.record_feedback(target_type=req.target_type, target_id=req.target_id, feedback=req.feedback, notes=req.notes)

@router.get("/ai-costs")
def get_ai_cost_dashboard(db: Session = Depends(get_db)):
    svc = AiCostManagementService(db)
    return svc.get_cost_dashboard()

@router.post("/ai-costs/route")
def route_ai_model(req: ModelRouteRequest, db: Session = Depends(get_db)):
    svc = AiCostManagementService(db)
    return svc.route_ai_model(task_type=req.task_type)
