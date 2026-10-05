from typing import Dict, Any
from sqlalchemy.orm import Session

from app.services.continuous_intelligence_service import ContinuousIntelligenceService
from app.services.forecasting_service import ForecastingService
from app.services.capacity_demand_service import CapacityDemandService
from app.services.geographic_optimization_service import GeographicOptimizationService
from app.services.partnership_optimization_service import PartnershipOptimizationService
from app.services.competitive_movement_service import CompetitiveMovementService
from app.services.early_warning_risk_service import EarlyWarningRiskService
from app.services.workflow_automation_service import WorkflowAutomationService
from app.services.ai_cost_management_service import AiCostManagementService

class ExecutiveCommandCenterService:
    def __init__(self, db: Session):
        self.db = db

    def get_command_center_summary(self, state: str = "FL") -> Dict[str, Any]:
        ci_svc = ContinuousIntelligenceService(self.db)
        fc_svc = ForecastingService(self.db)
        cd_svc = CapacityDemandService(self.db)
        geo_svc = GeographicOptimizationService(self.db)
        part_svc = PartnershipOptimizationService(self.db)
        comp_svc = CompetitiveMovementService(self.db)
        risk_svc = EarlyWarningRiskService(self.db)
        wf_svc = WorkflowAutomationService(self.db)
        cost_svc = AiCostManagementService(self.db)

        watchlists = ci_svc.get_watchlists()
        monitoring_rules = ci_svc.get_monitoring_rules()
        forecasts = fc_svc.list_forecasts(limit=5)
        evaluations = fc_svc.list_evaluations()
        capacity_analysis = cd_svc.analyze_capacity_and_demand(state=state)
        geo_grid = geo_svc.get_geo_grid(state=state)
        partnerships = part_svc.list_opportunities(state=state)
        competitor_movements = comp_svc.list_movement_scores(state=state)
        risk_signals = risk_svc.list_risk_signals()
        early_warnings = risk_svc.correlate_early_warnings(state=state)
        pending_approvals = wf_svc.list_approvals(status="PENDING")
        management_queue = wf_svc.list_management_queue(status="PENDING")
        ai_cost_data = cost_svc.get_cost_dashboard()

        executive_takeaway = (
            f"Executive Command Center Active for {state} Market. "
            f"Observed {len(risk_signals)} risk signals, {len(early_warnings)} correlated early warnings, "
            f"and {len(management_queue)} pending management review items. "
            f"Physician capacity status is '{capacity_analysis.get('demand_capacity_status')}' "
            f"with an overall utilization rate of {capacity_analysis.get('overall_utilization_rate')}%. "
            f"All recommendations remain grounded in surface-web data and require explicit human management approval."
        )

        return {
            "state": state,
            "executive_takeaway": executive_takeaway,
            "market_status": {
                "active_watchlists_count": len(watchlists),
                "active_rules_count": len(monitoring_rules),
                "pending_management_reviews_count": len(management_queue),
                "pending_approvals_count": len(pending_approvals)
            },
            "recent_forecasts": forecasts,
            "forecast_evaluations": evaluations,
            "capacity_and_demand": capacity_analysis,
            "geographic_opportunity_clusters": geo_grid.get("geographic_clusters", []),
            "top_partnership_opportunities": partnerships[:5],
            "competitor_movements": competitor_movements,
            "risk_signals": risk_signals[:5],
            "early_warning_signals": early_warnings,
            "pending_approvals": pending_approvals,
            "management_review_queue": management_queue,
            "ai_cost_summary": {
                "total_cost_usd": ai_cost_data.get("total_cost_usd"),
                "total_tokens": ai_cost_data.get("total_tokens")
            }
        }
