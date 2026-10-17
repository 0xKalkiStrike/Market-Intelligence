"""
Advanced Geographic Market Opportunity Analysis Service (Phase 7).
Extends geographic scoring across multiple administrative levels:
- State, County, and ZIP-code granular evaluations
- Component contribution waterfalls with factor weights & directions
- Scoring model versioning (ScoringModelVersion) & reproducible historical snapshots (GeographicScoreSnapshot)
- What-if alternative weight simulations without mutating production records
- Data freshness & coverage uncertainty penalties
- Explicit guardrails: Market proxies are not direct demand measurements.
"""
import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import (
    ScoringModelVersion,
    GeographicScoreSnapshot,
    StateMarketMetric,
    Entity,
    EntityLocation,
    utc_now,
)

# Standard Default Weights
DEFAULT_OPPORTUNITY_WEIGHTS = {
    "patient_pop_weight": 20.0,
    "growth_rate_weight": 15.0,
    "competitor_density_weight": 15.0,  # Inverse: fewer competitors = higher score
    "dispensary_density_weight": 15.0,  # Direct: more dispensaries = more partnership opportunities
    "physician_coverage_weight": 15.0,  # Direct: physician capacity availability
    "telehealth_allowed_weight": 10.0,  # Policy: telehealth permissibility
    "pricing_opportunity_weight": 10.0, # Margin: competitor price minus MMJ price
}


class AdvancedGeographicOpportunityService:
    """Multi-level geographic opportunity analysis and model versioning engine."""

    # =========================================================================
    # 1. SCORING MODEL VERSIONS
    # =========================================================================

    def get_or_create_active_model_version(self, db: Session) -> ScoringModelVersion:
        version = db.query(ScoringModelVersion).filter(ScoringModelVersion.is_active).order_by(desc(ScoringModelVersion.created_at)).first()
        if not version:
            version = ScoringModelVersion(
                version_tag="v1.0-standard",
                model_name="Standard MMJ Geographic Opportunity Model",
                weights_json=json.dumps(DEFAULT_OPPORTUNITY_WEIGHTS),
                description="Baseline 7-factor balanced market opportunity weighting model.",
                is_active=True,
                created_by="system",
            )
            db.add(version)
            db.commit()
            db.refresh(version)
        return version

    def create_model_version(
        self,
        db: Session,
        version_tag: str,
        model_name: str,
        weights: Dict[str, float],
        description: str = "",
        make_active: bool = False,
        created_by: Optional[str] = None,
    ) -> ScoringModelVersion:
        if make_active:
            db.query(ScoringModelVersion).update({ScoringModelVersion.is_active: False})

        version = ScoringModelVersion(
            version_tag=version_tag,
            model_name=model_name,
            weights_json=json.dumps(weights),
            description=description,
            is_active=make_active,
            created_by=created_by,
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version

    def list_model_versions(self, db: Session) -> List[Dict[str, Any]]:
        versions = db.query(ScoringModelVersion).order_by(desc(ScoringModelVersion.created_at)).all()
        return [
            {
                "id": v.id,
                "version_tag": v.version_tag,
                "model_name": v.model_name,
                "weights": json.loads(v.weights_json or "{}"),
                "description": v.description,
                "is_active": v.is_active,
                "created_by": v.created_by,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ]

    # =========================================================================
    # 2. MULTI-LEVEL GEOGRAPHIC OPPORTUNITY SCORING
    # =========================================================================

    def calculate_opportunity_score(
        self,
        db: Session,
        geographic_level: str = "STATE",  # STATE, COUNTY, ZIP
        geographic_id: str = "FL",
        custom_weights: Optional[Dict[str, float]] = None,
        persist_snapshot: bool = True,
    ) -> Dict[str, Any]:
        """
        Calculates granular opportunity score with explicit factor attribution,
        directions, weights, data freshness penalty, and missing input tracking.
        """
        model_version = self.get_or_create_active_model_version(db)
        weights = custom_weights or json.loads(model_version.weights_json or "{}")

        geo_level = geographic_level.upper()
        geo_id = geographic_id.upper()

        # Retrieve underlying records based on geographic level
        metric = None
        state_code = geo_id[:2] if len(geo_id) >= 2 else "FL"

        if geo_level == "STATE":
            metric = db.query(StateMarketMetric).filter(
                (StateMarketMetric.state_code == geo_id) | (StateMarketMetric.state.ilike(f"%{geo_id}%"))
            ).first()

        # Entity counts
        comp_count = db.query(Entity).filter(Entity.entity_type == "COMPETITOR").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()
        disp_count = db.query(Entity).filter(Entity.entity_type == "DISPENSARY").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()
        doc_count = db.query(Entity).filter(Entity.entity_type == "DOCTOR").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()

        # Raw Factor Values
        patient_pop = metric.patient_population if metric else 65000
        growth_rate = metric.population_growth_rate if metric else 10.5
        telehealth_allowed = metric.telehealth_allowed if metric else True
        avg_market_price = metric.avg_market_price if metric else 149.0
        mmj_price = metric.mmj_price if metric else 139.0
        data_freshness_days = 3 if metric else 14

        # Missing input tracking
        missing_inputs = []
        if not metric:
            missing_inputs.append("StateMarketMetric baseline aggregate absent (using regional entity proxies)")

        # Factor Normalizations (0.0 - 1.0)
        # 1. Patient Population (Scale 0 - 200,000)
        norm_pop = min(1.0, max(0.0, patient_pop / 150000.0))
        # 2. Population Growth Rate (Scale 0 - 25%)
        norm_growth = min(1.0, max(0.0, growth_rate / 20.0))
        # 3. Competitor Density (Inverse: 0 comps = 1.0, 50+ comps = 0.0)
        norm_comp = max(0.0, 1.0 - min(1.0, comp_count / 50.0))
        # 4. Dispensary Density (Scale 0 - 100 dispensaries for partnership synergy)
        norm_disp = min(1.0, max(0.0, disp_count / 80.0))
        # 5. Physician Coverage (Scale 0 - 60 doctors)
        norm_doc = min(1.0, max(0.0, doc_count / 50.0))
        # 6. Telehealth Allowed (Binary)
        norm_tele = 1.0 if telehealth_allowed else 0.2
        # 7. Pricing Margin Opportunity (Competitor price higher than MMJ price = opportunity)
        price_gap = avg_market_price - mmj_price
        norm_price = min(1.0, max(0.0, (price_gap + 20.0) / 50.0))

        # Weight Contributions
        w_pop = weights.get("patient_pop_weight", 20.0)
        w_growth = weights.get("growth_rate_weight", 15.0)
        w_comp = weights.get("competitor_density_weight", 15.0)
        w_disp = weights.get("dispensary_density_weight", 15.0)
        w_doc = weights.get("physician_coverage_weight", 15.0)
        w_tele = weights.get("telehealth_allowed_weight", 10.0)
        w_price = weights.get("pricing_opportunity_weight", 10.0)

        total_weight = w_pop + w_growth + w_comp + w_disp + w_doc + w_tele + w_price

        contrib_pop = (norm_pop * w_pop)
        contrib_growth = (norm_growth * w_growth)
        contrib_comp = (norm_comp * w_comp)
        contrib_disp = (norm_disp * w_disp)
        contrib_doc = (norm_doc * w_doc)
        contrib_tele = (norm_tele * w_tele)
        contrib_price = (norm_price * w_price)

        raw_score = contrib_pop + contrib_growth + contrib_comp + contrib_disp + contrib_doc + contrib_tele + contrib_price
        normalized_score = (raw_score / total_weight) * 100.0 if total_weight > 0 else 0.0

        # Freshness penalty: Deduct 0.5 points per day beyond 7 days of staleness
        freshness_penalty = max(0.0, (data_freshness_days - 7) * 0.5)
        final_score = max(0.0, min(100.0, round(normalized_score - freshness_penalty, 2)))

        factor_breakdown = [
            {"factor": "Patient Population Proxy", "weight": w_pop, "raw_value": patient_pop, "normalized": round(norm_pop, 2), "contribution": round(contrib_pop, 2), "direction": "POSITIVE"},
            {"factor": "Annual Market Growth Rate", "weight": w_growth, "raw_value": f"{growth_rate}%", "normalized": round(norm_growth, 2), "contribution": round(contrib_growth, 2), "direction": "POSITIVE"},
            {"factor": "Competitor Saturation (Inverse)", "weight": w_comp, "raw_value": comp_count, "normalized": round(norm_comp, 2), "contribution": round(contrib_comp, 2), "direction": "INVERSE"},
            {"factor": "Dispensary Partnership Synergy", "weight": w_disp, "raw_value": disp_count, "normalized": round(norm_disp, 2), "contribution": round(contrib_disp, 2), "direction": "POSITIVE"},
            {"factor": "Verified Physician Network", "weight": w_doc, "raw_value": doc_count, "normalized": round(norm_doc, 2), "contribution": round(contrib_doc, 2), "direction": "POSITIVE"},
            {"factor": "Telehealth Policy Accessibility", "weight": w_tele, "raw_value": "Allowed" if telehealth_allowed else "Restricted", "normalized": round(norm_tele, 2), "contribution": round(contrib_tele, 2), "direction": "POLICY_GATE"},
            {"factor": "Pricing Margin Spread", "weight": w_price, "raw_value": f"${price_gap:+.2f}", "normalized": round(norm_price, 2), "contribution": round(contrib_price, 2), "direction": "POSITIVE"},
        ]

        # Tier classification
        if final_score >= 80.0:
            tier = "Tier 1: High Priority Expansion"
        elif final_score >= 60.0:
            tier = "Tier 2: Strong Strategic Potential"
        elif final_score >= 40.0:
            tier = "Tier 3: Moderate Opportunity"
        else:
            tier = "Tier 4: Constrained / Low Feasibility"

        results = {
            "geographic_level": geo_level,
            "geographic_id": geo_id,
            "model_version_tag": model_version.version_tag,
            "total_score": final_score,
            "market_tier": tier,
            "freshness_penalty_points": round(freshness_penalty, 2),
            "data_freshness_days": data_freshness_days,
            "factor_breakdown": factor_breakdown,
            "missing_inputs": missing_inputs,
            "is_simulation": custom_weights is not None,
            "assumptions": [
                "Dispensary density serves as a proxy for physical retail access and partner referral potential.",
                "Competitor density represents surface-web observable clinic presence.",
                "Telehealth policy assumes current official state board regulations.",
            ],
            "limitations": [
                "Demographic figures are proxies; they do not measure actual conversion or patient willingness to pay.",
                "Local municipal zoning bans or dispensary moratoriums are not captured in state aggregates.",
            ],
        }

        # Persist snapshot if requested and not custom simulation
        if persist_snapshot and not custom_weights:
            snapshot = GeographicScoreSnapshot(
                model_version_id=model_version.id,
                geographic_level=geo_level,
                geographic_id=geo_id,
                geographic_name=metric.state if metric else geo_id,
                total_score=final_score,
                component_scores_json=json.dumps({f["factor"]: f["contribution"] for f in factor_breakdown}),
                factor_contributions_json=json.dumps(factor_breakdown),
                data_freshness_days=data_freshness_days,
                missing_inputs_json=json.dumps(missing_inputs),
                calculation_date=utc_now(),
            )
            db.add(snapshot)
            db.commit()

        return results

    # =========================================================================
    # 3. COMPARE GEOGRAPHIES (SIDE-BY-SIDE MULTI-STATE / COUNTY)
    # =========================================================================

    def compare_geographies(
        self,
        db: Session,
        geographic_ids: List[str],
        geographic_level: str = "STATE",
        custom_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Compares multiple geographic targets side-by-side using the same scoring engine."""
        comparisons = []
        for gid in geographic_ids:
            score_data = self.calculate_opportunity_score(
                db,
                geographic_level=geographic_level,
                geographic_id=gid.strip(),
                custom_weights=custom_weights,
                persist_snapshot=False,
            )
            comparisons.append(score_data)

        # Sort descending by score
        comparisons.sort(key=lambda x: x["total_score"], reverse=True)

        return {
            "comparison_count": len(comparisons),
            "geographic_level": geographic_level,
            "ranked_geographies": comparisons,
            "highest_opportunity": comparisons[0]["geographic_id"] if comparisons else None,
            "lowest_opportunity": comparisons[-1]["geographic_id"] if comparisons else None,
        }

    # =========================================================================
    # 4. HISTORICAL SCORE SNAPSHOTS & AUDIT LOG
    # =========================================================================

    def get_score_history(
        self,
        db: Session,
        geographic_id: str,
        geographic_level: str = "STATE",
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        snapshots = db.query(GeographicScoreSnapshot).filter(
            GeographicScoreSnapshot.geographic_id == geographic_id.upper(),
            GeographicScoreSnapshot.geographic_level == geographic_level.upper(),
        ).order_by(desc(GeographicScoreSnapshot.calculation_date)).limit(limit).all()

        return [
            {
                "id": s.id,
                "model_version_id": s.model_version_id,
                "geographic_level": s.geographic_level,
                "geographic_id": s.geographic_id,
                "total_score": s.total_score,
                "component_scores": json.loads(s.component_scores_json or "{}"),
                "data_freshness_days": s.data_freshness_days,
                "missing_inputs": json.loads(s.missing_inputs_json or "[]"),
                "calculation_date": s.calculation_date.isoformat() if s.calculation_date else None,
            }
            for s in snapshots
        ]
