"""
Phase 7 Automated Test Suite — Advanced Intelligence Research & Optimization Engine.
Validates:
1. Research Workspace & Hypotheses (project creation, hypothesis testing, methodology & limitations)
2. Research Finding 7-Stage Lifecycle & Immutable Audit Trail (DRAFT -> VALIDATED -> NEEDS_REASSESSMENT)
3. Automated Reassessment Scanner (conflict detection on new price drops and regulatory changes)
4. Evidence Grounding & Reference Tracking (real record links, sample sizes, counter-evidence flags)
5. Statistical Analysis Engine (Descriptive stats, 95% & 99% CI, Pearson/Spearman correlation, Time-series OLS, Pettitt change-point, Welch t-test, Insufficiency guards)
6. Competitive Intelligence Pattern Analysis (Sustained trend extraction, promo surge, false-positive dismissal)
7. Advanced Multi-Level Geographic Opportunity Analysis (Factor contributions, scoring versions, alternative weights, snapshot history)
8. Business Strategy & Scenario Comparison (Side-by-side, base/best/downside cases, sensitivity matrix, zero production mutations)
9. Pricing & Promotion Opportunity Research (Initial vs renewal spreads, service equivalence warnings, market gaps)
10. Evidence-Grounded AI Research Assistant (Tool execution, fact/estimate separation, audited citations)
11. Governed REST API Platform & Dossier Export (Markdown and JSON)
"""
import json
import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database.models as models
import app.database.session as session_module
import app.main as main_module
from app.main import app
from app.database.session import Base, get_db
from app.database.models import (
    User,
    Role,
    ResearchProject,
    ResearchHypothesis,
    ResearchFinding,
    EvidenceReference,
    ResearchReviewHistory,
    ScoringModelVersion,
    GeographicScoreSnapshot,
    ScenarioDefinition,
    AnalyticalRun,
    CompetitivePatternRecord,
    StateMarketMetric,
    PriceHistory,
    IntelligenceEvent,
    RegulatoryChange,
    Entity,
    EntityLocation,
    utc_now,
)
from app.services.research_workspace_service import ResearchWorkspaceService
from app.services.statistical_analysis_service import StatisticalAnalysisService
from app.services.competitive_pattern_service import CompetitivePatternService
from app.services.advanced_geographic_opportunity_service import AdvancedGeographicOpportunityService
from app.services.scenario_comparison_service import ScenarioComparisonService
from app.services.pricing_research_service import PricingResearchService
from app.services.evidence_grounded_ai_research_service import EvidenceGroundedAiResearchService

DB_FILE = "./test_p7.db"
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


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_phase7_database():
    session_module.engine = engine
    session_module.SessionLocal.configure(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[session_module.get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test metrics
        metric_fl = StateMarketMetric(
            state="Florida",
            state_code="FL",
            patient_population=120000,
            population_growth_rate=14.5,
            telehealth_allowed=True,
            avg_market_price=169.0,
            mmj_price=149.0,
            competitor_count=12,
            dispensary_count=45,
            physician_capacity=600,
            opportunity_score=84.5,
        )
        metric_pa = StateMarketMetric(
            state="Pennsylvania",
            state_code="PA",
            patient_population=85000,
            population_growth_rate=8.2,
            telehealth_allowed=True,
            avg_market_price=155.0,
            mmj_price=139.0,
            competitor_count=18,
            dispensary_count=30,
            physician_capacity=400,
            opportunity_score=72.0,
        )
        db.add_all([metric_fl, metric_pa])

        # Seed PriceHistory for competitive patterns and pricing research
        p1 = PriceHistory(
            competitor_name="Veriheal",
            state="FL",
            service_name="Initial Telehealth Consultation",
            previous_price=199.0,
            new_price=179.0,
            promotion_name="Spring Health Promo",
            effective_date=utc_now() - timedelta(days=20),
            source_name="Veriheal Official Portal",
        )
        p2 = PriceHistory(
            competitor_name="Veriheal",
            state="FL",
            service_name="Initial Telehealth Consultation",
            previous_price=179.0,
            new_price=149.0,
            promotion_name="Summer Special",
            effective_date=utc_now() - timedelta(days=5),
            source_name="Veriheal Official Portal",
        )
        p3 = PriceHistory(
            competitor_name="Veriheal",
            state="FL",
            service_name="Annual Recertification Renewal",
            previous_price=129.0,
            new_price=99.0,
            promotion_name="",
            effective_date=utc_now() - timedelta(days=10),
            source_name="Veriheal Official Portal",
        )
        p4 = PriceHistory(
            competitor_name="DocMJ",
            state="FL",
            service_name="Full Clinical In-Person Physical Exam",
            previous_price=299.0,
            new_price=275.0,
            promotion_name="",
            effective_date=utc_now() - timedelta(days=15),
            source_name="DocMJ Clinic Menu",
        )
        db.add_all([p1, p2, p3, p4])

        # Seed an entity for geographic tests
        ent = Entity(
            id="test-ent-01",
            name="Green Relief Health",
            entity_type="COMPETITOR",
            verification_status="VERIFIED",
        )
        loc = EntityLocation(
            id="test-loc-01",
            entity_id="test-ent-01",
            state="FL",
            city="Tampa",
            zip_code="33602",
        )
        db.add_all([ent, loc])
        db.commit()
    finally:
        db.close()
    yield
    TestingSessionLocal.close_all()


# =============================================================================
# 1. RESEARCH WORKSPACE, HYPOTHESES & LIFECYCLE TESTS
# =============================================================================

def test_research_workspace_and_hypotheses():
    """Verify research projects, hypotheses formulation, and evidence evaluations."""
    db = TestingSessionLocal()
    svc = ResearchWorkspaceService()

    # 1. Create Research Project
    project = svc.create_project(
        db,
        title="Southeast Regional Expansion Feasibility Q4",
        description="Empirical investigation into Florida and Georgia physician network capacity.",
        target_states=["FL", "GA"],
        created_by="lead_researcher@mmjdocs.com",
    )
    assert project.id is not None
    assert project.status == "ACTIVE"

    # 2. Formulate Hypothesis
    hyp = svc.create_hypothesis(
        db,
        project_id=project.id,
        hypothesis_statement="Lowering initial consult to $129 in Florida expands market share without impairing physician schedule utilization.",
        geographic_scope="STATE",
        geographic_target="FL",
        comparison_groups=["FL_Price_149", "FL_Price_129"],
        target_metrics=["conversion_rate", "net_margin", "utilization_pct"],
        methodology_notes="Comparative price elasticity regression calibrated against regional medians.",
        limitations_notes="Assumes competitor advertising remains static during trial period.",
        created_by="lead_researcher@mmjdocs.com",
    )
    assert hyp.id is not None
    assert hyp.status == "DRAFT"

    # 3. Evaluate Hypothesis
    evaluated_hyp = svc.evaluate_hypothesis(
        db,
        hypothesis_id=hyp.id,
        confidence_score=0.82,
        status="SUPPORTED",
        methodology_update="Empirical volume elasticity supports margin expansion with high confidence.",
    )
    assert evaluated_hyp.status == "SUPPORTED"
    assert evaluated_hyp.confidence_score == 0.82

    db.close()


def test_research_finding_lifecycle_and_audit():
    """Verify 7-stage lifecycle state machine, transitions, and immutable review audits."""
    db = TestingSessionLocal()
    svc = ResearchWorkspaceService()

    project = svc.list_projects(db)[0]
    finding = svc.create_finding(
        db,
        project_id=project["id"],
        title="Florida Competitor Price Compression Trend",
        statement="Monitored competitors in Florida decreased average initial consult prices by 12.5% over 60 days.",
        category="PRICING",
        calculation_method="TIME_SERIES_OLS",
        sample_size=15,
        data_coverage_pct=95.0,
        confidence_score=0.88,
        limitations="Surface-web observable prices; exclusions apply for unadvertised phone discounts.",
        contradictory_evidence="",
        recommended_next_step="Evaluate temporary promotional bundling.",
        created_by="analyst@mmjdocs.com",
    )
    assert finding.status == "DRAFT"

    # Permitted transition: DRAFT -> UNDER_INVESTIGATION
    f1 = svc.transition_finding_lifecycle(
        db,
        finding_id=finding.id,
        new_status="UNDER_INVESTIGATION",
        reviewer_email="analyst@mmjdocs.com",
        review_notes="Initiating cross-source corroboration against state DOH portal.",
    )
    assert f1.status == "UNDER_INVESTIGATION"

    # Permitted transition: UNDER_INVESTIGATION -> EVIDENCE_REVIEWED
    f2 = svc.transition_finding_lifecycle(
        db,
        finding_id=finding.id,
        new_status="EVIDENCE_REVIEWED",
        reviewer_email="senior_analyst@mmjdocs.com",
        review_notes="Evidence corroborated across 4 independent competitor web properties.",
    )
    assert f2.status == "EVIDENCE_REVIEWED"

    # Permitted transition: EVIDENCE_REVIEWED -> VALIDATED
    f3 = svc.transition_finding_lifecycle(
        db,
        finding_id=finding.id,
        new_status="VALIDATED",
        reviewer_email="director_intelligence@mmjdocs.com",
        review_notes="Formally validated for executive strategy briefing.",
    )
    assert f3.status == "VALIDATED"
    assert f3.reviewer_id == "director_intelligence@mmjdocs.com"

    # Attach evidence reference
    ref = svc.attach_evidence_reference(
        db,
        finding_id=finding.id,
        source_name="Veriheal Official Portal",
        source_type="PUBLIC_SURFACE_WEB",
        source_uri="https://example.com/veriheal-pricing",
        observation_date=utc_now(),
        sample_count=2,
        confidence_weight=1.0,
        is_contradictory=False,
        verification_status="VERIFIED",
    )
    assert ref.id is not None
    assert ref.finding_id == finding.id

    # Invalid transition check: VALIDATED -> DRAFT is illegal
    with pytest.raises(ValueError):
        svc.transition_finding_lifecycle(
            db,
            finding_id=finding.id,
            new_status="DRAFT",
            reviewer_email="analyst@mmjdocs.com",
        )

    # Export Dossier
    dossier = svc.export_research_dossier(db, project["id"])
    assert "MARKET INTELLIGENCE RESEARCH DOSSIER" in dossier["markdown_report"]
    assert "Florida Competitor Price Compression Trend" in dossier["markdown_report"]

    db.close()


def test_reassessment_trigger_scanner():
    """Verify automated detection of counter-evidence flags validated findings for reassessment."""
    db = TestingSessionLocal()
    svc = ResearchWorkspaceService()

    project = svc.list_projects(db)[0]
    finding = svc.create_finding(
        db,
        project_id=project["id"],
        title="Florida Price Premium Assumption",
        statement="Competitor pricing in Florida remains firm above $160.",
        category="PRICING",
        created_by="analyst@mmjdocs.com",
    )
    # Transition to VALIDATED directly through state machine
    svc.transition_finding_lifecycle(db, finding.id, "UNDER_INVESTIGATION", "a@a.com")
    svc.transition_finding_lifecycle(db, finding.id, "EVIDENCE_REVIEWED", "a@a.com")
    svc.transition_finding_lifecycle(db, finding.id, "VALIDATED", "reviewer@mmjdocs.com")

    # Run scanner - should detect p2 in setup fixture (Veriheal lowered price from 179 to 149 > 10% drop)
    scan_report = svc.scan_for_reassessment_triggers(db)
    assert scan_report["total_validated_checked"] >= 1

    # Finding should be flagged to NEEDS_REASSESSMENT
    updated_finding = db.query(ResearchFinding).filter(ResearchFinding.id == finding.id).first()
    assert updated_finding.status == "NEEDS_REASSESSMENT"
    assert "Veriheal" in updated_finding.contradictory_evidence

    db.close()


# =============================================================================
# 2. STATISTICAL ANALYSIS LAYER TESTS
# =============================================================================

def test_statistical_descriptive_and_confidence_intervals():
    """Verify descriptive statistics, 95% & 99% Student's t CI, and skewness."""
    stats = StatisticalAnalysisService()
    db = TestingSessionLocal()

    # Sample of competitor consultation prices
    prices = [149.0, 159.0, 139.0, 169.0, 149.0, 179.0, 155.0, 145.0, 165.0, 150.0]
    res = stats.calculate_descriptive_stats(db, prices, variable_name="Consultation Price")

    assert res["status"] == "COMPLETED"
    assert res["sample_size"] == 10
    assert 150.0 <= res["mean"] <= 160.0
    assert res["min"] == 139.0
    assert res["max"] == 179.0
    assert "ci_95_percent" in res["confidence_intervals"]
    assert "ci_99_percent" in res["confidence_intervals"]
    assert res["confidence_intervals"]["ci_95_percent"]["lower"] < res["mean"] < res["confidence_intervals"]["ci_95_percent"]["upper"]

    # Sample sufficiency test: n=2 fails
    insufficient = stats.calculate_descriptive_stats(db, [149.0, 159.0], variable_name="Small Sample")
    assert insufficient["status"] == "INSUFFICIENT_DATA"
    assert insufficient["minimum_required"] == 3

    db.close()


def test_statistical_correlation_and_change_point():
    """Verify Pearson & Spearman correlation with p-values, and Pettitt change-point detection."""
    stats = StatisticalAnalysisService()
    db = TestingSessionLocal()

    # Highly correlated synthetic pairs (Advertising Spend vs Lead Volume)
    spend = [1000.0, 2000.0, 3000.0, 4000.0, 5000.0, 6000.0, 7000.0, 8000.0]
    leads = [50.0, 95.0, 155.0, 198.0, 245.0, 310.0, 345.0, 395.0]

    corr = stats.calculate_correlation(db, spend, leads, x_name="Marketing Spend", y_name="Inbound Leads")
    assert corr["status"] == "COMPLETED"
    assert corr["pearson_r"] > 0.95
    assert corr["spearman_rho"] > 0.95
    assert corr["is_statistically_significant"] is True
    assert corr["pearson_p_value"] < 0.01

    # Time-series trend & change-point test
    ts_data = [
        {"date": f"2026-01-0{i}", "value": 170.0 + (i % 2)} for i in range(1, 6)
    ] + [
        {"date": f"2026-01-0{i}", "value": 130.0 + (i % 2)} for i in range(6, 10)
    ]
    change = stats.detect_change_point(db, ts_data)
    assert change["status"] == "COMPLETED"
    assert change["change_point_detected"] is True
    assert change["shift_direction"] == "DECREASE"
    assert change["pre_shift_mean"] > change["post_shift_mean"]

    db.close()


def test_statistical_welch_t_test_and_sensitivity():
    """Verify Welch's two-sample t-test and sensitivity matrix calculations."""
    stats = StatisticalAnalysisService()

    # Comparing two distinct pricing regimes (Florida vs Ohio)
    group_fl = [169.0, 175.0, 165.0, 179.0, 170.0]
    group_oh = [129.0, 135.0, 125.0, 130.0, 128.0]

    comparison = stats.compare_segments(group_fl, group_oh, "Florida", "Ohio")
    assert comparison["status"] == "COMPLETED"
    assert comparison["is_significant"] is True
    assert comparison["mean_difference"] > 35.0
    assert comparison["p_value"] < 0.01

    # Sensitivity matrix test
    base_inputs = {"price": 149.0, "marketing_spend": 5000.0}
    def mock_eval(inputs):
        # revenue = price * (inputs["marketing_spend"] / 25)
        return inputs["price"] * (inputs["marketing_spend"] / 25.0)

    sens = stats.calculate_sensitivity_matrix(base_inputs, mock_eval)
    assert sens["status"] == "COMPLETED"
    assert "price" in sens["sensitivity_matrix"]
    assert "marketing_spend" in sens["sensitivity_matrix"]


# =============================================================================
# 3. COMPETITIVE PATTERN ANALYSIS TESTS
# =============================================================================

def test_competitive_pattern_extraction_and_dismissal():
    """Verify pattern synthesis (sustained price drops, promo surges) and false-positive dismissal."""
    db = TestingSessionLocal()
    svc = CompetitivePatternService()

    patterns = svc.detect_competitor_patterns(db, state="FL")
    assert len(patterns) >= 1

    # Check sustained price drop detected for Veriheal
    veriheal_patterns = [p for p in patterns if p["competitor_name"] == "Veriheal"]
    assert len(veriheal_patterns) >= 1
    p = veriheal_patterns[0]
    assert p["is_sustained"] is True
    assert "Veriheal" in p["title"]

    # Test false-positive dismissal workflow
    stored = svc.list_patterns(db, include_dismissed=False)[0]
    dismissed = svc.dismiss_pattern(
        db, pattern_id=stored["id"], dismissed_by="analyst@mmjdocs.com", reason="Seasonal promotion; not permanent price change."
    )
    assert dismissed.is_dismissed is True
    assert dismissed.dismissal_reason == "Seasonal promotion; not permanent price change."

    # Verify excluded from active list
    active_patterns = svc.list_patterns(db, include_dismissed=False)
    assert stored["id"] not in [a["id"] for a in active_patterns]

    # Restore pattern
    restored = svc.restore_pattern(db, pattern_id=stored["id"])
    assert restored.is_dismissed is False

    db.close()


# =============================================================================
# 4. ADVANCED GEOGRAPHIC OPPORTUNITY TESTS
# =============================================================================

def test_advanced_geographic_opportunity_scoring():
    """Verify multi-level scoring, factor contributions, versioning, and alternative weights."""
    db = TestingSessionLocal()
    svc = AdvancedGeographicOpportunityService()

    # 1. Calculate Baseline State Score
    score = svc.calculate_opportunity_score(db, geographic_level="STATE", geographic_id="FL")
    assert score["total_score"] > 50.0
    assert len(score["factor_breakdown"]) == 7
    assert score["model_version_tag"] == "v1.0-standard"

    # 2. Test Alternative Weight Simulation without Mutating Production
    custom_weights = {
        "patient_pop_weight": 50.0,
        "growth_rate_weight": 10.0,
        "competitor_density_weight": 10.0,
        "dispensary_density_weight": 10.0,
        "physician_coverage_weight": 10.0,
        "telehealth_allowed_weight": 5.0,
        "pricing_opportunity_weight": 5.0,
    }
    simulated = svc.calculate_opportunity_score(
        db, geographic_level="STATE", geographic_id="FL", custom_weights=custom_weights, persist_snapshot=False
    )
    assert simulated["is_simulation"] is True

    # Active model in DB remains untouched
    active = svc.get_or_create_active_model_version(db)
    assert active.version_tag == "v1.0-standard"

    # 3. Multi-Market Side-by-Side Comparison
    comp = svc.compare_geographies(db, geographic_ids=["FL", "PA"], geographic_level="STATE")
    assert comp["comparison_count"] == 2
    assert comp["highest_opportunity"] == "FL"

    # 4. Historical Snapshot Retrieval
    history = svc.get_score_history(db, geographic_id="FL")
    assert len(history) >= 1
    assert history[0]["geographic_id"] == "FL"

    db.close()


# =============================================================================
# 5. BUSINESS SCENARIO COMPARISON TESTS
# =============================================================================

def test_scenario_comparison_and_zero_production_mutation():
    """Verify side-by-side scenario modeling, base/best/downside cases, and zero DB mutations."""
    db = TestingSessionLocal()
    svc = ScenarioComparisonService()

    # Capture pre-simulation counts
    pre_metric = db.query(StateMarketMetric).filter(StateMarketMetric.state_code == "FL").first()
    pre_mmj_price = pre_metric.mmj_price

    res = svc.compare_scenarios(
        db,
        scenario_name="Florida Growth Acceleration Promo",
        scenario_type="PRICING",
        target_state="FL",
        baseline_inputs={"price": 149.0, "physician_count": 5, "monthly_marketing_spend": 5000.0, "expected_conversion_rate": 0.035, "setup_overhead": 20000.0},
        candidate_inputs={"price": 129.0, "physician_count": 8, "monthly_marketing_spend": 7500.0, "expected_conversion_rate": 0.050, "setup_overhead": 25000.0},
        save_definition=True,
    )

    assert "comparison_summary" in res
    assert "probabilistic_projections" in res
    assert "base_case" in res["probabilistic_projections"]
    assert "best_case" in res["probabilistic_projections"]
    assert "downside_case" in res["probabilistic_projections"]
    assert len(res["sensitivity_matrix"]) > 0

    # Best-case revenue must exceed downside-case revenue
    best_rev = res["probabilistic_projections"]["best_case"]["gross_revenue"]
    downside_rev = res["probabilistic_projections"]["downside_case"]["gross_revenue"]
    assert best_rev > downside_rev

    # Verify zero production mutation
    post_metric = db.query(StateMarketMetric).filter(StateMarketMetric.state_code == "FL").first()
    assert post_metric.mmj_price == pre_mmj_price

    # List saved scenarios
    saved = svc.list_saved_scenarios(db)
    assert len(saved) >= 1
    assert saved[0]["name"] == "Florida Growth Acceleration Promo"

    db.close()


# =============================================================================
# 6. PRICING & PROMOTION RESEARCH TESTS
# =============================================================================

def test_pricing_research_and_equivalence_warnings():
    """Verify initial vs renewal spreads, non-equivalent service flags, and market pricing gaps."""
    db = TestingSessionLocal()
    svc = PricingResearchService()

    spreads = svc.analyze_initial_vs_renewal_spreads(db, state="FL")
    assert spreads["state_filter"] == "FL"
    assert spreads["market_median_initial_price"] > 0
    assert spreads["market_median_renewal_price"] > 0

    # Verify service equivalence check detected high in-person exam
    docmj_comp = next((c for c in spreads["competitor_comparisons"] if "DocMJ" in c["competitor_jurisdiction"]), None)
    assert docmj_comp is not None
    assert docmj_comp["is_equivalent_telehealth"] is False
    assert "NON_EQUIVALENT_SERVICE_WARNING" in docmj_comp["service_equivalence_warning"]

    # Pricing gaps
    gaps = svc.identify_pricing_gaps(db, target_states=["FL", "PA"])
    assert len(gaps) >= 1
    assert gaps[0]["market_avg_price"] > 0
    assert "gap_type" in gaps[0]

    db.close()


# =============================================================================
# 7. EVIDENCE-GROUNDED AI RESEARCH ASSISTANT TESTS
# =============================================================================

def test_evidence_grounded_ai_research_assistant():
    """Verify AI research assistant cites real records, separates facts from estimates, and discloses gaps."""
    db = TestingSessionLocal()
    svc = EvidenceGroundedAiResearchService()

    # Query 1: Opportunity Score explanation
    res1 = svc.answer_research_query(db, "Why is Florida opportunity score high and which evidence supports it?")
    assert res1["answer_type"] == "GEOGRAPHIC_OPPORTUNITY_EXPLANATION"
    assert len(res1["facts"]) > 0
    assert len(res1["citations"]) > 0
    assert res1["citations"][0]["citation_id"] == "CIT-GEO-FL"

    # Query 2: Competitor patterns
    res2 = svc.answer_research_query(db, "What competitor movements and price patterns changed in Florida?")
    assert res2["answer_type"] == "COMPETITIVE_PATTERN_INTELLIGENCE"
    assert len(res2["citations"]) > 0
    assert "Veriheal" in res2["executive_summary"] or any("Veriheal" in f for f in res2["facts"])

    # Query 3: Evidence gaps and uncertainty
    res3 = svc.answer_research_query(db, "Where is our market intelligence data too weak or uncertain?")
    assert res3["answer_type"] == "DATA_EVIDENCE_GAP_AUDIT"
    assert len(res3["missing_or_stale_data"]) > 0

    # Query 4: Reassessment and contradictory evidence
    res4 = svc.answer_research_query(db, "Which research findings need to be revisited or contradicted?")
    assert res4["answer_type"] == "RESEARCH_REASSESSMENT_AUDIT"

    db.close()


# =============================================================================
# 8. GOVERNED REST API ENDPOINTS TEST
# =============================================================================

def test_phase7_governed_api_endpoints():
    """Verify FastAPI endpoints under /api/research."""
    # 1. Projects API
    p_res = client.post(
        "/api/research/projects",
        json={"title": "Midwest Market Entry Assessment", "description": "Evaluating Ohio and Pennsylvania.", "target_states": ["OH", "PA"]},
    )
    assert p_res.status_code == 200
    proj_id = p_res.json()["project_id"]

    list_res = client.get("/api/research/projects")
    assert list_res.status_code == 200
    assert len(list_res.json()["projects"]) >= 1

    # 2. Descriptive Stats API
    stats_res = client.post(
        "/api/research/statistical/descriptive",
        json={"values": [149.0, 159.0, 139.0, 169.0, 149.0], "variable_name": "Price Test"},
    )
    assert stats_res.status_code == 200
    assert stats_res.json()["status"] == "COMPLETED"

    # 3. Geo Opportunity API
    geo_res = client.get("/api/research/geo/score?level=STATE&geographic_id=FL")
    assert geo_res.status_code == 200
    assert geo_res.json()["total_score"] > 50.0

    # 4. Scenarios Compare API
    scen_res = client.post(
        "/api/research/scenarios/compare",
        json={"scenario_name": "API Test Scenario", "scenario_type": "PRICING", "target_state": "FL"},
    )
    assert scen_res.status_code == 200
    assert "comparison_summary" in scen_res.json()

    # 5. AI Research Assistant API
    ai_res = client.post(
        "/api/research/ai/query",
        json={"query": "Explain Florida market opportunity score and citations"},
    )
    assert ai_res.status_code == 200
    assert len(ai_res.json()["citations"]) >= 1
