import json
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.database.models import OpportunityScoreConfig, StateMarketMetric, Entity, EntityLocation

class OpportunityScoringService:
    """Computes transparent, explainable State Opportunity Scores (0-100) using configurable admin weights."""

    DEFAULT_WEIGHTS = {
        "patient_pop_weight": 15.0,
        "market_growth_weight": 10.0,
        "competitor_density_weight": 10.0,
        "pricing_opp_weight": 10.0,
        "dispensary_density_weight": 10.0,
        "physician_coverage_weight": 15.0,
        "regulatory_ease_weight": 15.0,
        "seo_opp_weight": 10.0,
        "mmj_presence_weight": 5.0,
    }

    def get_or_create_config(self, db: Session) -> OpportunityScoreConfig:
        config = db.query(OpportunityScoreConfig).first()
        if not config:
            config = OpportunityScoreConfig(**self.DEFAULT_WEIGHTS)
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    def update_config(self, db: Session, updates: Dict[str, float], updated_by: str = "Admin") -> OpportunityScoreConfig:
        config = self.get_or_create_config(db)
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, float(value))
        config.updated_by = updated_by
        db.commit()
        db.refresh(config)
        return config

    def calculate_state_score(self, db: Session, state_code: str) -> Dict[str, Any]:
        config = self.get_or_create_config(db)
        metric = db.query(StateMarketMetric).filter(StateMarketMetric.state_code == state_code).first()

        if metric:
            comp_count = metric.competitor_count
            disp_count = metric.dispensary_count
            doc_count = max(1, metric.physician_capacity // 40)
        else:
            comp_count = db.query(Entity).filter(Entity.entity_type == "COMPETITOR").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()
            disp_count = db.query(Entity).filter(Entity.entity_type == "DISPENSARY").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()
            doc_count = db.query(Entity).filter(Entity.entity_type == "DOCTOR").join(EntityLocation).filter(EntityLocation.state.ilike(f"%{state_code}%")).count()

        patient_pop = metric.patient_population if metric else 50000
        growth_rate = metric.population_growth_rate if metric else 12.0
        telehealth_allowed = metric.telehealth_allowed if metric else True
        mmj_price = metric.mmj_price if metric else 149.0
        market_price = metric.avg_market_price if metric else 139.0

        # Sub-score calculations (normalized 0 to max weight)
        # 1. Patient Pop (15%)
        pop_score = min(config.patient_pop_weight, (patient_pop / 100000.0) * config.patient_pop_weight)
        
        # 2. Growth Rate (10%)
        growth_score = min(config.market_growth_weight, (growth_rate / 20.0) * config.market_growth_weight)

        # 3. Competitor Density (Lower density = higher opportunity) (10%)
        comp_density_factor = max(0.1, 1.0 - (comp_count / 30.0))
        comp_score = round(comp_density_factor * config.competitor_density_weight, 2)

        # 4. Pricing Opportunity (Higher market avg price vs MMJ price = room for premium margin) (10%)
        price_diff = max(0, market_price - mmj_price + 20)
        pricing_score = round(min(config.pricing_opp_weight, (price_diff / 40.0) * config.pricing_opp_weight), 2)

        # 5. Dispensary Density (Higher dispensary density = more referral partner potential) (10%)
        disp_score = round(min(config.dispensary_density_weight, (disp_count / 25.0) * config.dispensary_density_weight), 2)

        # 6. Physician Coverage / Demand Mismatch (15%)
        physician_score = round(min(config.physician_coverage_weight, (doc_count / 20.0) * config.physician_coverage_weight), 2)

        # 7. Regulatory Ease (15%)
        reg_score = config.regulatory_ease_weight if telehealth_allowed else (config.regulatory_ease_weight * 0.4)

        # 8. SEO Opportunity (10%)
        seo_score = round(config.seo_opp_weight * 0.75, 2)

        # 9. MMJ Existing Presence (5%)
        presence_score = round(config.mmj_presence_weight * 0.8, 2)

        total_score = round(pop_score + growth_score + comp_score + pricing_score + disp_score + physician_score + reg_score + seo_score + presence_score, 1)

        breakdown = {
            "patient_population": {"score": round(pop_score, 1), "max": config.patient_pop_weight, "explanation": f"Patient Population: {patient_pop:,}"},
            "market_growth": {"score": round(growth_score, 1), "max": config.market_growth_weight, "explanation": f"Annual Growth Rate: {growth_rate}%"},
            "competitor_density": {"score": comp_score, "max": config.competitor_density_weight, "explanation": f"Active Competitors: {comp_count}"},
            "pricing_opportunity": {"score": pricing_score, "max": config.pricing_opp_weight, "explanation": f"Market Avg: ${market_price} vs MMJ: ${mmj_price}"},
            "dispensary_density": {"score": disp_score, "max": config.dispensary_density_weight, "explanation": f"Dispensary Locations: {disp_count}"},
            "physician_coverage": {"score": physician_score, "max": config.physician_coverage_weight, "explanation": f"Active Physicians: {doc_count}"},
            "regulatory_ease": {"score": reg_score, "max": config.regulatory_ease_weight, "explanation": f"Telehealth Allowed: {'Yes' if telehealth_allowed else 'No'}"},
            "seo_opportunity": {"score": seo_score, "max": config.seo_opp_weight, "explanation": "Target Keyword Ranking Potential"},
            "mmj_presence": {"score": presence_score, "max": config.mmj_presence_weight, "explanation": "Established Operations & Brand Recall"},
        }

        # Save/Update StateMarketMetric
        if not metric:
            metric = StateMarketMetric(
                state=state_code,
                state_code=state_code,
                patient_population=patient_pop,
                population_growth_rate=growth_rate,
                competitor_count=comp_count,
                dispensary_count=disp_count,
                physician_capacity=doc_count * 40,
                opportunity_score=total_score,
                component_scores_json=json.dumps(breakdown),
            )
            db.add(metric)
        else:
            metric.competitor_count = comp_count
            metric.dispensary_count = disp_count
            metric.opportunity_score = total_score
            metric.component_scores_json = json.dumps(breakdown)

        db.commit()

        return {
            "state_code": state_code,
            "opportunity_score": total_score,
            "config_used": {
                "patient_pop_weight": config.patient_pop_weight,
                "market_growth_weight": config.market_growth_weight,
                "competitor_density_weight": config.competitor_density_weight,
                "pricing_opp_weight": config.pricing_opp_weight,
                "dispensary_density_weight": config.dispensary_density_weight,
                "physician_coverage_weight": config.physician_coverage_weight,
                "regulatory_ease_weight": config.regulatory_ease_weight,
                "seo_opp_weight": config.seo_opp_weight,
                "mmj_presence_weight": config.mmj_presence_weight,
            },
            "breakdown": breakdown,
        }
