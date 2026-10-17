"""
Advanced Research & Optimization Engine API Router (Phase 7).
Provides REST endpoints for:
- Research Workspace (Projects, Hypotheses, Findings, 7-stage Lifecycle, Evidence Grounding, Dossier Export)
- Statistical Analysis Layer (Descriptive, Confidence Intervals, Correlation, Time-Series, Change-Point, Welch's Test)
- Competitive Pattern Analysis (Sustained trend extraction, False-positive dismissal)
- Multi-Level Geographic Opportunity Analysis (State/County/ZIP, Factor Waterfalls, Model Versioning, Snapshot History)
- Analytical Strategy & Scenario Comparison (Side-by-side projections, Probabilistic cases, Sensitivity matrix)
- Pricing & Promotion Research (Initial vs Renewal spreads, Service equivalence warnings, Pricing gaps)
- Evidence-Grounded AI Research Assistant (Tool-driven queries, Audited citations, Fact vs Estimate labels)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_optional_current_user, get_current_user
from app.auth.rbac import sanitize_internal_business_data
from app.database.models import User
from app.database.session import get_db
from app.services.research_workspace_service import ResearchWorkspaceService
from app.services.statistical_analysis_service import StatisticalAnalysisService
from app.services.competitive_pattern_service import CompetitivePatternService
from app.services.advanced_geographic_opportunity_service import AdvancedGeographicOpportunityService
from app.services.scenario_comparison_service import ScenarioComparisonService
from app.services.pricing_research_service import PricingResearchService
from app.services.evidence_grounded_ai_research_service import EvidenceGroundedAiResearchService

router = APIRouter(prefix="/api/research", tags=["Phase 7: Advanced Research & Optimization"])

# Service singletons
research_service = ResearchWorkspaceService()
stats_service = StatisticalAnalysisService()
comp_pattern_service = CompetitivePatternService()
geo_opp_service = AdvancedGeographicOpportunityService()
scenario_comp_service = ScenarioComparisonService()
pricing_research_service = PricingResearchService()
ai_research_service = EvidenceGroundedAiResearchService()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class ProjectCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(default="")
    target_states: List[str] = Field(default_factory=list)


class HypothesisCreateRequest(BaseModel):
    hypothesis_statement: str = Field(..., min_length=5)
    geographic_scope: str = Field(default="NATIONAL")
    geographic_target: str = Field(default="ALL")
    time_period_start: Optional[datetime] = None
    time_period_end: Optional[datetime] = None
    comparison_groups: List[str] = Field(default_factory=list)
    target_metrics: List[str] = Field(default_factory=list)
    methodology_notes: str = Field(default="")
    limitations_notes: str = Field(default="")


class HypothesisEvaluateRequest(BaseModel):
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    status: str = Field(..., description="DRAFT, TESTING, SUPPORTED, CONTRADICTED, INCONCLUSIVE")
    methodology_update: Optional[str] = None


class FindingCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    statement: str = Field(..., min_length=5)
    category: str = Field(default="OPPORTUNITY")
    hypothesis_id: Optional[str] = None
    calculation_method: str = Field(default="DESCRIPTIVE_AGGREGATE")
    sample_size: int = Field(default=0, ge=0)
    data_coverage_pct: float = Field(default=100.0, ge=0.0, le=100.0)
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    limitations: str = Field(default="")
    contradictory_evidence: str = Field(default="")
    recommended_next_step: str = Field(default="")


class FindingLifecycleRequest(BaseModel):
    new_status: str = Field(..., description="DRAFT, UNDER_INVESTIGATION, EVIDENCE_REVIEWED, VALIDATED, NEEDS_REASSESSMENT, SUPERSEDED, REJECTED")
    review_notes: str = Field(default="")
    rationale: str = Field(default="")


class EvidenceAttachRequest(BaseModel):
    source_name: str = Field(..., min_length=2)
    source_type: str = Field(default="PUBLIC_SURFACE_WEB")
    source_uri: Optional[str] = None
    observation_date: Optional[datetime] = None
    record_id: Optional[str] = None
    sample_count: int = Field(default=1, ge=1)
    confidence_weight: float = Field(default=1.0, ge=0.0, le=1.0)
    supporting_data: Dict[str, Any] = Field(default_factory=dict)
    is_contradictory: bool = Field(default=False)
    verification_status: str = Field(default="VERIFIED")


class DescriptiveStatsRequest(BaseModel):
    values: List[float] = Field(..., min_length=1)
    variable_name: str = Field(default="Metric")


class CorrelationRequest(BaseModel):
    x_values: List[float] = Field(..., min_length=3)
    y_values: List[float] = Field(..., min_length=3)
    x_name: str = Field(default="Metric X")
    y_name: str = Field(default="Metric Y")


class TimeSeriesTrendRequest(BaseModel):
    series: List[Dict[str, Any]] = Field(..., min_length=3)
    metric_name: str = Field(default="Time Series Metric")


class ChangePointRequest(BaseModel):
    data_points: List[Dict[str, Any]] = Field(..., min_length=5)


class SegmentComparisonRequest(BaseModel):
    group_a: List[float] = Field(..., min_length=2)
    group_b: List[float] = Field(..., min_length=2)
    group_a_label: str = Field(default="Group A")
    group_b_label: str = Field(default="Group B")


class PatternDismissRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class ModelVersionCreateRequest(BaseModel):
    version_tag: str = Field(..., min_length=2)
    model_name: str = Field(..., min_length=2)
    weights: Dict[str, float] = Field(...)
    description: str = Field(default="")
    make_active: bool = Field(default=False)


class GeoCompareRequest(BaseModel):
    geographic_ids: List[str] = Field(..., min_length=2)
    geographic_level: str = Field(default="STATE")
    custom_weights: Optional[Dict[str, float]] = None


class ScenarioCompareRequest(BaseModel):
    scenario_name: str = Field(..., min_length=3)
    scenario_type: str = Field(default="STATE_EXPANSION")
    target_state: str = Field(default="FL")
    baseline_inputs: Optional[Dict[str, Any]] = None
    candidate_inputs: Optional[Dict[str, Any]] = None
    save_definition: bool = Field(default=True)


class AiResearchQueryRequest(BaseModel):
    query: str = Field(..., min_length=3)
    project_id: Optional[str] = None
    target_state: Optional[str] = None


# =============================================================================
# 1. RESEARCH WORKSPACE & LIFECYCLE ENDPOINTS
# =============================================================================

@router.post("/projects")
def create_research_project(
    payload: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Create a new research project in the research workspace."""
    email = current_user.email if current_user else "analyst@mmjdocs.com"
    project = research_service.create_project(
        db,
        title=payload.title,
        description=payload.description,
        target_states=payload.target_states,
        created_by=email,
    )
    return {"project_id": project.id, "title": project.title, "status": project.status}


@router.get("/projects")
def list_research_projects(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List research projects with finding counts and validated tallies."""
    return {"projects": research_service.list_projects(db, status=status, limit=limit, offset=offset)}


@router.get("/projects/{project_id}")
def get_research_project_detail(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full research project dossier with hypotheses and findings."""
    detail = research_service.get_project_detail(db, project_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Research project not found")
    return detail


@router.post("/projects/{project_id}/hypotheses")
def create_hypothesis(
    project_id: str,
    payload: HypothesisCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Add a structured hypothesis to a research project."""
    email = current_user.email if current_user else "analyst@mmjdocs.com"
    try:
        hyp = research_service.create_hypothesis(
            db,
            project_id=project_id,
            hypothesis_statement=payload.hypothesis_statement,
            geographic_scope=payload.geographic_scope,
            geographic_target=payload.geographic_target,
            time_period_start=payload.time_period_start,
            time_period_end=payload.time_period_end,
            comparison_groups=payload.comparison_groups,
            target_metrics=payload.target_metrics,
            methodology_notes=payload.methodology_notes,
            limitations_notes=payload.limitations_notes,
            created_by=email,
        )
        return {"hypothesis_id": hyp.id, "status": hyp.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hypotheses/{hypothesis_id}/evaluate")
def evaluate_hypothesis(
    hypothesis_id: str,
    payload: HypothesisEvaluateRequest,
    db: Session = Depends(get_db),
):
    """Evaluate hypothesis confidence and outcome status."""
    try:
        hyp = research_service.evaluate_hypothesis(
            db,
            hypothesis_id=hypothesis_id,
            confidence_score=payload.confidence_score,
            status=payload.status,
            methodology_update=payload.methodology_update,
        )
        return {"hypothesis_id": hyp.id, "status": hyp.status, "confidence_score": hyp.confidence_score}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/projects/{project_id}/findings")
def create_research_finding(
    project_id: str,
    payload: FindingCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Record an empirical research finding."""
    email = current_user.email if current_user else "analyst@mmjdocs.com"
    try:
        finding = research_service.create_finding(
            db,
            project_id=project_id,
            title=payload.title,
            statement=payload.statement,
            category=payload.category,
            hypothesis_id=payload.hypothesis_id,
            calculation_method=payload.calculation_method,
            sample_size=payload.sample_size,
            data_coverage_pct=payload.data_coverage_pct,
            confidence_score=payload.confidence_score,
            limitations=payload.limitations,
            contradictory_evidence=payload.contradictory_evidence,
            recommended_next_step=payload.recommended_next_step,
            created_by=email,
        )
        return {"finding_id": finding.id, "status": finding.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/findings/{finding_id}/lifecycle")
def transition_finding_lifecycle(
    finding_id: str,
    payload: FindingLifecycleRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Transition a research finding through the 7-stage lifecycle with mandatory audit trail."""
    email = current_user.email if current_user else "lead_reviewer@mmjdocs.com"
    try:
        finding = research_service.transition_finding_lifecycle(
            db,
            finding_id=finding_id,
            new_status=payload.new_status,
            reviewer_email=email,
            review_notes=payload.review_notes,
            rationale=payload.rationale,
        )
        return {
            "finding_id": finding.id,
            "new_status": finding.status,
            "reviewer_id": finding.reviewer_id,
            "reviewed_at": finding.reviewed_at.isoformat() if finding.reviewed_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/findings/{finding_id}/evidence")
def attach_evidence_reference(
    finding_id: str,
    payload: EvidenceAttachRequest,
    db: Session = Depends(get_db),
):
    """Attach verifiable evidence reference (internal metric or public observation) to a finding."""
    try:
        ref = research_service.attach_evidence_reference(
            db,
            finding_id=finding_id,
            source_name=payload.source_name,
            source_type=payload.source_type,
            source_uri=payload.source_uri,
            observation_date=payload.observation_date,
            record_id=payload.record_id,
            sample_count=payload.sample_count,
            confidence_weight=payload.confidence_weight,
            supporting_data=payload.supporting_data,
            is_contradictory=payload.is_contradictory,
            verification_status=payload.verification_status,
        )
        return {"evidence_reference_id": ref.id, "finding_id": finding_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/reassessment/scan")
def trigger_reassessment_scan(db: Session = Depends(get_db)):
    """Run automated scanner to flag validated findings if new conflicting market records arrive."""
    return research_service.scan_for_reassessment_triggers(db)


@router.get("/projects/{project_id}/export")
def export_research_dossier(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Export complete research project dossier in JSON and GitHub-flavored Markdown formats."""
    try:
        return research_service.export_research_dossier(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# 2. STATISTICAL ANALYSIS LAYER ENDPOINTS
# =============================================================================

@router.post("/statistical/descriptive")
def calculate_descriptive_statistics(
    payload: DescriptiveStatsRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Calculate descriptive statistics, confidence intervals (95% & 99%), and distribution shape."""
    email = current_user.email if current_user else "system_analyst"
    return stats_service.calculate_descriptive_stats(
        db, values=payload.values, variable_name=payload.variable_name, executed_by=email
    )


@router.post("/statistical/correlation")
def calculate_correlation(
    payload: CorrelationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Calculate Pearson r (with p-value) and Spearman rank rho between two metrics."""
    email = current_user.email if current_user else "system_analyst"
    return stats_service.calculate_correlation(
        db,
        x_vals=payload.x_values,
        y_vals=payload.y_values,
        x_name=payload.x_name,
        y_name=payload.y_name,
        executed_by=email,
    )


@router.post("/statistical/time-series-trend")
def calculate_time_series_trend(
    payload: TimeSeriesTrendRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Decompose time-series and compute OLS trend slope, moving averages, and return volatility."""
    email = current_user.email if current_user else "system_analyst"
    return stats_service.calculate_time_series_trend(
        db, series=payload.series, metric_name=payload.metric_name, executed_by=email
    )


@router.post("/statistical/change-point")
def detect_change_point(
    payload: ChangePointRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Non-parametric Pettitt test to detect exact date/index of structural regime change."""
    email = current_user.email if current_user else "system_analyst"
    return stats_service.detect_change_point(
        db, data_points=payload.data_points, executed_by=email
    )


@router.post("/statistical/segment-comparison")
def compare_market_segments(payload: SegmentComparisonRequest):
    """Welch's two-sample t-test comparing two market groups with unequal variances."""
    return stats_service.compare_segments(
        group_a=payload.group_a,
        group_b=payload.group_b,
        group_a_label=payload.group_a_label,
        group_b_label=payload.group_b_label,
    )


# =============================================================================
# 3. COMPETITIVE INTELLIGENCE PATTERN ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/competitive/patterns")
def list_competitor_patterns(
    competitor: Optional[str] = None,
    state: Optional[str] = None,
    include_dismissed: bool = False,
    time_horizon_days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Detect and retrieve competitor patterns (sustained price drops, promo surges, geographic expansion)."""
    # Runs detection and persistence
    comp_pattern_service.detect_competitor_patterns(
        db, competitor_name=competitor, state=state, time_horizon_days=time_horizon_days
    )
    patterns = comp_pattern_service.list_patterns(
        db, include_dismissed=include_dismissed, state=state
    )
    return {"patterns": patterns}


@router.post("/competitive/patterns/{pattern_id}/dismiss")
def dismiss_competitor_pattern(
    pattern_id: str,
    payload: PatternDismissRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Dismiss a false-positive competitor pattern finding with recorded reason."""
    email = current_user.email if current_user else "analyst@mmjdocs.com"
    try:
        rec = comp_pattern_service.dismiss_pattern(
            db, pattern_id=pattern_id, dismissed_by=email, reason=payload.reason
        )
        return {"pattern_id": rec.id, "is_dismissed": rec.is_dismissed, "dismissal_reason": rec.dismissal_reason}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/competitive/patterns/{pattern_id}/restore")
def restore_competitor_pattern(
    pattern_id: str,
    db: Session = Depends(get_db),
):
    """Restore a previously dismissed pattern."""
    try:
        rec = comp_pattern_service.restore_pattern(db, pattern_id=pattern_id)
        return {"pattern_id": rec.id, "is_dismissed": rec.is_dismissed}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# 4. ADVANCED GEOGRAPHIC OPPORTUNITY ANALYSIS ENDPOINTS
# =============================================================================

@router.get("/geo/models")
def list_scoring_model_versions(db: Session = Depends(get_db)):
    """List versioned scoring models and their weight configurations."""
    return {"model_versions": geo_opp_service.list_model_versions(db)}


@router.post("/geo/models")
def create_scoring_model_version(
    payload: ModelVersionCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Create a new versioned geographic scoring model."""
    email = current_user.email if current_user else "admin"
    ver = geo_opp_service.create_model_version(
        db,
        version_tag=payload.version_tag,
        model_name=payload.model_name,
        weights=payload.weights,
        description=payload.description,
        make_active=payload.make_active,
        created_by=email,
    )
    return {"version_tag": ver.version_tag, "model_name": ver.model_name, "is_active": ver.is_active}


@router.get("/geo/score")
def get_geographic_opportunity_score(
    level: str = Query("STATE", description="STATE, COUNTY, ZIP"),
    geographic_id: str = Query("FL", description="State code, FIPS, or ZIP"),
    db: Session = Depends(get_db),
):
    """Calculate explainable geographic opportunity score with component factor contributions."""
    return geo_opp_service.calculate_opportunity_score(
        db, geographic_level=level, geographic_id=geographic_id, persist_snapshot=True
    )


@router.post("/geo/compare")
def compare_geographic_markets(
    payload: GeoCompareRequest,
    db: Session = Depends(get_db),
):
    """Compare multiple states, counties, or ZIP codes side-by-side using unified model."""
    return geo_opp_service.compare_geographies(
        db,
        geographic_ids=payload.geographic_ids,
        geographic_level=payload.geographic_level,
        custom_weights=payload.custom_weights,
    )


@router.get("/geo/history/{geographic_id}")
def get_geographic_score_history(
    geographic_id: str,
    level: str = Query("STATE"),
    db: Session = Depends(get_db),
):
    """Retrieve historical scoring snapshots for a geographic region to evaluate trends."""
    return {"history": geo_opp_service.get_score_history(db, geographic_id=geographic_id, geographic_level=level)}


# =============================================================================
# 5. BUSINESS SCENARIO & STRATEGY COMPARISON ENDPOINTS
# =============================================================================

@router.post("/scenarios/compare")
def run_scenario_comparison(
    payload: ScenarioCompareRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Run side-by-side strategy scenario modeling (downside, base, best case, sensitivity matrix)."""
    email = current_user.email if current_user else "analyst"
    return scenario_comp_service.compare_scenarios(
        db,
        scenario_name=payload.scenario_name,
        scenario_type=payload.scenario_type,
        target_state=payload.target_state,
        baseline_inputs=payload.baseline_inputs,
        candidate_inputs=payload.candidate_inputs,
        save_definition=payload.save_definition,
        created_by=email,
    )


@router.get("/scenarios")
def list_saved_scenarios(
    scenario_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List saved scenario definitions and their probabilistic projections."""
    return {"scenarios": scenario_comp_service.list_saved_scenarios(db, scenario_type=scenario_type, limit=limit)}


# =============================================================================
# 6. PRICING & PROMOTION OPPORTUNITY RESEARCH ENDPOINTS
# =============================================================================

@router.get("/pricing/spreads")
def get_initial_vs_renewal_spreads(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Analyze consultation vs renewal price spreads and service equivalence warnings."""
    return pricing_research_service.analyze_initial_vs_renewal_spreads(db, state=state)


@router.get("/pricing/gaps")
def get_pricing_gaps(
    states: Optional[str] = Query(None, description="Comma-separated state codes"),
    db: Session = Depends(get_db),
):
    """Identify actionable market pricing gaps between MMJ-DOCS and competitors."""
    target_states = [s.strip().upper() for s in states.split(",")] if states else None
    return {"pricing_gaps": pricing_research_service.identify_pricing_gaps(db, target_states=target_states)}


@router.get("/pricing/promotions")
def get_promotion_history(
    competitor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve history of competitor promotions, discounts, and temporary offers."""
    return {"promotions": pricing_research_service.get_promotion_cadence_history(db, competitor_name=competitor, limit=limit)}


# =============================================================================
# 7. EVIDENCE-GROUNDED AI RESEARCH ASSISTANT ENDPOINT
# =============================================================================

@router.post("/ai/query")
def answer_research_assistant_query(
    payload: AiResearchQueryRequest,
    db: Session = Depends(get_db),
):
    """
    Evidence-grounded AI copilot answering complex market intelligence queries.
    Separates Facts, Calculations, Estimates, Hypotheses, and Recommendations with citations.
    """
    return ai_research_service.answer_research_query(
        db,
        query=payload.query,
        project_id=payload.project_id,
        target_state=payload.target_state,
    )
