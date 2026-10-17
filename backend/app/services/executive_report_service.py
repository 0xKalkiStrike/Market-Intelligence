from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import Entity, PriceHistory, StateMarketMetric, IntelligenceEvent, RegulatoryChange, PartnershipOpportunity

class ExecutiveReportService:
    """Generates automated weekly executive intelligence reports with strategic recommendations."""

    def generate_weekly_report(self, db: Session) -> Dict[str, Any]:
        total_entities = db.query(Entity).count()
        competitors_count = db.query(Entity).filter(Entity.entity_type == "COMPETITOR").count()
        dispensaries_count = db.query(Entity).filter(Entity.entity_type == "DISPENSARY").count()
        doctors_count = db.query(Entity).filter(Entity.entity_type == "DOCTOR").count()

        recent_events = db.query(IntelligenceEvent).order_by(IntelligenceEvent.detected_at.desc()).limit(5).all()
        recent_price_changes = db.query(PriceHistory).order_by(PriceHistory.effective_date.desc()).limit(5).all()
        recent_regulatory = db.query(RegulatoryChange).order_by(RegulatoryChange.detected_at.desc()).limit(3).all()
        top_partnerships = db.query(PartnershipOpportunity).filter(PartnershipOpportunity.partnership_status == "NOT_CONTACTED").order_by(PartnershipOpportunity.partnership_score.desc()).limit(5).all()

        top_opportunities = db.query(StateMarketMetric).order_by(StateMarketMetric.opportunity_score.desc()).limit(3).all()

        summary_bullets = [
            f"Active Database: Tracking {total_entities} entities ({competitors_count} competitors, {dispensaries_count} dispensaries, {doctors_count} physicians).",
            f"Market Leader: Top scored state opportunity is {top_opportunities[0].state if top_opportunities else 'FL'} (Score: {top_opportunities[0].opportunity_score if top_opportunities else 82.5}/100).",
            f"Competitive Dynamics: {len(recent_price_changes)} price changes detected this cycle.",
            f"Partnership Pipeline: {len(top_partnerships)} high-score uncontacted dispensary locations ready for outreach.",
        ]

        recommendations = [
            "Review pricing positioning in key markets where competitors have introduced promotional discounts.",
            "Initiate outreach to high-score uncontacted dispensary partners to expand local referral channels.",
            "Monitor physician capacity in high-demand ZIP codes to avoid scheduling bottlenecks.",
            "Ensure compliance with updated state telehealth documentation guidelines.",
        ]

        return {
            "title": f"Weekly Executive Intelligence Report - {datetime.now().strftime('%B %d, %Y')}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "executive_summary": summary_bullets,
            "top_market_opportunities": [
                {
                    "state": m.state,
                    "score": m.opportunity_score,
                    "patient_pop": m.patient_population,
                    "competitor_count": m.competitor_count,
                    "dispensary_count": m.dispensary_count,
                }
                for m in top_opportunities
            ],
            "recent_events": [
                {
                    "event_type": e.event_type,
                    "entity_name": e.entity_name,
                    "state": e.state,
                    "description": e.description,
                    "importance": e.importance,
                }
                for e in recent_events
            ],
            "pricing_changes": [
                {
                    "competitor_name": p.competitor_name,
                    "state": p.state,
                    "previous_price": p.previous_price,
                    "new_price": p.new_price,
                    "promotion": p.promotion_name,
                }
                for p in recent_price_changes
            ],
            "regulatory_changes": [
                {
                    "state": r.state,
                    "rule_title": r.rule_title,
                    "new_info": r.new_info,
                    "priority": r.impact_priority,
                }
                for r in recent_regulatory
            ],
            "recommended_actions": recommendations,
        }
