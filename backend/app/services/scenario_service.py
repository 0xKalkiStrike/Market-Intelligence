import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.database.models import ScenarioSimulation, StateMarketMetric


class ScenarioService:
    """Scenario Analysis Engine calculating 'What-If' simulations for Price Changes and State Expansion with explicit assumptions."""

    def simulate_price_change(self, db: Session, target_state: str, new_price: float, current_price: float = 149.0) -> Dict[str, Any]:
        metric = db.query(StateMarketMetric).filter(StateMarketMetric.state == target_state).first()
        patient_pop = metric.patient_population if metric else 100000
        avg_mkt_price = metric.avg_market_price if metric else 149.0

        price_diff = new_price - current_price
        pct_change = (price_diff / current_price) * 100

        # Simple price elasticity model: -1.2 elasticity factor
        volume_pct_change = -1.2 * pct_change
        projected_volume_change_pct = round(volume_pct_change, 1)

        estimated_annual_revenue = round(patient_pop * 0.05 * new_price, 2)
        revenue_delta = round((volume_pct_change / 100.0) * estimated_annual_revenue, 2)

        assumptions = [
            "Price elasticity estimated at -1.2 for MMJ certification market.",
            "Market demand assumes steady patient registration growth.",
            "Competitor pricing assumed constant during scenario projection.",
        ]

        results = {
            "scenario_type": "PRICE_CHANGE",
            "target_state": target_state,
            "current_price": current_price,
            "proposed_price": new_price,
            "market_avg_price": avg_mkt_price,
            "price_difference": round(price_diff, 2),
            "projected_volume_change_pct": f"{'+' if projected_volume_change_pct >= 0 else ''}{projected_volume_change_pct}%",
            "estimated_annual_revenue": estimated_annual_revenue,
            "estimated_revenue_delta": revenue_delta,
            "competitive_position": "Aggressive / Below Market" if new_price < avg_mkt_price else "Premium / Above Market",
            "labels": ["SCENARIO", "ASSUMPTION", "ESTIMATE"],
            "assumptions": assumptions,
        }

        # Save simulation
        sim = ScenarioSimulation(
            name=f"Price Change Scenario: ${new_price:.2f} in {target_state}",
            scenario_type="PRICE_CHANGE",
            target_state=target_state,
            inputs_json=json.dumps({"current_price": current_price, "proposed_price": new_price}),
            results_json=json.dumps(results),
            assumptions_json=json.dumps(assumptions),
        )
        db.add(sim)
        db.commit()

        return results

    def simulate_state_expansion(self, db: Session, target_state: str, estimated_setup_cost: float = 50000.0) -> Dict[str, Any]:
        metric = db.query(StateMarketMetric).filter(StateMarketMetric.state == target_state).first()
        patient_pop = metric.patient_population if metric else 120000
        growth_rate = metric.population_growth_rate if metric else 10.0
        competitor_count = metric.competitor_count if metric else 15
        telehealth_allowed = metric.telehealth_allowed if metric else True

        # TAM & Breakeven calculation
        tam_revenue = round(patient_pop * 0.08 * 149.0, 2)
        projected_year1_patients = int(patient_pop * 0.01)
        projected_year1_revenue = round(projected_year1_patients * 149.0, 2)
        payback_period_months = round((estimated_setup_cost / (projected_year1_revenue / 12.0)), 1) if projected_year1_revenue > 0 else 12.0

        assumptions = [
            f"Year 1 market penetration estimated at 1.0% of addressable patient population ({patient_pop:,}).",
            "Certification pricing fixed at $149 baseline.",
            f"Telehealth regulation status: {'Permitted' if telehealth_allowed else 'In-Person Required'}.",
            f"Initial setup cost estimated at ${estimated_setup_cost:,.2f}.",
        ]

        results = {
            "scenario_type": "MARKET_EXPANSION",
            "target_state": target_state,
            "addressable_patient_population": patient_pop,
            "population_growth_rate": growth_rate,
            "competitor_density": competitor_count,
            "telehealth_allowed": telehealth_allowed,
            "estimated_setup_cost": estimated_setup_cost,
            "total_addressable_market_tam": tam_revenue,
            "projected_year1_patients": projected_year1_patients,
            "projected_year1_revenue": projected_year1_revenue,
            "estimated_payback_period_months": payback_period_months,
            "labels": ["SCENARIO", "ASSUMPTION", "ESTIMATE"],
            "assumptions": assumptions,
        }

        sim = ScenarioSimulation(
            name=f"State Expansion Scenario: {target_state}",
            scenario_type="MARKET_EXPANSION",
            target_state=target_state,
            inputs_json=json.dumps({"estimated_setup_cost": estimated_setup_cost}),
            results_json=json.dumps(results),
            assumptions_json=json.dumps(assumptions),
        )
        db.add(sim)
        db.commit()

        return results

    def list_simulations(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        sims = db.query(ScenarioSimulation).order_by(ScenarioSimulation.created_at.desc()).limit(limit).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "scenario_type": s.scenario_type,
                "target_state": s.target_state,
                "results": json.loads(s.results_json or "{}"),
                "assumptions": json.loads(s.assumptions_json or "[]"),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sims
        ]
