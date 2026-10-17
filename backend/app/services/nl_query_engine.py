from typing import Any, Dict
from sqlalchemy.orm import Session

from app.database.models import (
    Entity,
    EntityLocation,
    IntelligenceEvent,
    PartnershipOpportunity,
    PriceHistory,
    RegulatoryChange,
    StateMarketMetric,
)


class NlQueryEngine:
    """Natural Language -> Query Planner. Parses natural language questions, extracts intent/entities/state/date, builds allowlisted queries, and formats results safely."""

    US_STATES_MAP = {
        "florida": "FL", "fl": "FL",
        "texas": "TX", "tx": "TX",
        "ohio": "OH", "oh": "OH",
        "california": "CA", "ca": "CA",
        "arizona": "AZ", "az": "AZ",
        "new york": "NY", "ny": "NY",
        "pennsylvania": "PA", "pa": "PA",
        "illinois": "IL", "il": "IL",
    }

    ALLOWED_TABLES = {
        "price_history": PriceHistory,
        "state_market_metrics": StateMarketMetric,
        "partnership_opportunities": PartnershipOpportunity,
        "regulatory_changes": RegulatoryChange,
        "intelligence_events": IntelligenceEvent,
        "entities": Entity,
    }

    def parse_and_execute(self, db: Session, question: str) -> Dict[str, Any]:
        q_lower = question.lower()

        # Extract State
        target_state = None
        for name, code in self.US_STATES_MAP.items():
            if f" {name} " in f" {q_lower} " or f" {code.lower()} " in f" {q_lower} ":
                target_state = code
                break

        # 1. Price changes intent
        if any(w in q_lower for w in ["price", "pricing", "cost", "cheaper", "reduction", "discount"]):
            intent = "COMPETITOR_PRICING"
            query = db.query(PriceHistory)
            if target_state:
                query = query.filter(PriceHistory.state == target_state)
            if "reduced" in q_lower or "decrease" in q_lower or "drop" in q_lower:
                query = query.filter(PriceHistory.new_price < PriceHistory.previous_price)

            results = query.order_by(PriceHistory.effective_date.desc()).limit(20).all()
            data = [
                {
                    "competitor_name": p.competitor_name,
                    "state": p.state,
                    "service_name": p.service_name,
                    "previous_price": p.previous_price,
                    "new_price": p.new_price,
                    "promotion": p.promotion_name,
                    "effective_date": p.effective_date.isoformat() if p.effective_date else None,
                    "source": p.source_name,
                }
                for p in results
            ]

            return {
                "intent": intent,
                "state_filter": target_state,
                "table_used": "price_history",
                "generated_query_summary": f"SELECT * FROM price_history WHERE state = '{target_state or 'ALL'}' ORDER BY effective_date DESC LIMIT 20",
                "records_retrieved": len(data),
                "data": data,
                "recommended_visualization": "line_chart" if target_state else "table",
            }

        # 2. Opportunity / Expansion intent
        if any(w in q_lower for w in ["opportunity", "expand", "best state", "score", "growth"]):
            intent = "MARKET_OPPORTUNITY"
            query = db.query(StateMarketMetric)
            if target_state:
                query = query.filter(StateMarketMetric.state == target_state)

            results = query.order_by(StateMarketMetric.opportunity_score.desc()).all()
            data = [
                {
                    "state": m.state,
                    "opportunity_score": m.opportunity_score,
                    "patient_population": m.patient_population,
                    "competitor_count": m.competitor_count,
                    "dispensary_count": m.dispensary_count,
                    "telehealth_allowed": m.telehealth_allowed,
                    "avg_market_price": m.avg_market_price,
                }
                for m in results
            ]

            return {
                "intent": intent,
                "state_filter": target_state,
                "table_used": "state_market_metrics",
                "generated_query_summary": "SELECT * FROM state_market_metrics ORDER BY opportunity_score DESC",
                "records_retrieved": len(data),
                "data": data,
                "recommended_visualization": "bar_chart",
            }

        # 3. Partnership / Dispensary intent
        if any(w in q_lower for w in ["dispensary", "partnership", "contacted", "uncontacted", "clinic"]):
            intent = "DISPENSARY_PARTNERSHIP"
            query = db.query(PartnershipOpportunity)
            if target_state:
                query = query.filter(PartnershipOpportunity.state == target_state)
            if "not contacted" in q_lower or "uncontacted" in q_lower:
                query = query.filter(PartnershipOpportunity.partnership_status == "NOT_CONTACTED")

            results = query.order_by(PartnershipOpportunity.partnership_score.desc()).limit(20).all()
            data = [
                {
                    "name": p.name,
                    "state": p.state,
                    "city": p.city,
                    "partnership_status": p.partnership_status,
                    "partnership_score": p.partnership_score,
                    "location_count": p.location_count,
                }
                for p in results
            ]

            return {
                "intent": intent,
                "state_filter": target_state,
                "table_used": "partnership_opportunities",
                "generated_query_summary": f"SELECT * FROM partnership_opportunities WHERE state = '{target_state or 'ALL'}' ORDER BY partnership_score DESC LIMIT 20",
                "records_retrieved": len(data),
                "data": data,
                "recommended_visualization": "table",
            }

        # 4. Regulatory intent
        if any(w in q_lower for w in ["regulatory", "rule", "law", "change", "telehealth", "policy"]):
            intent = "REGULATORY_INTELLIGENCE"
            query = db.query(RegulatoryChange)
            if target_state:
                query = query.filter(RegulatoryChange.state == target_state)

            results = query.order_by(RegulatoryChange.detected_at.desc()).limit(15).all()
            data = [
                {
                    "state": r.state,
                    "rule_title": r.rule_title,
                    "event_type": r.event_type,
                    "new_info": r.new_info,
                    "impact_priority": r.impact_priority,
                    "detected_at": r.detected_at.isoformat() if r.detected_at else None,
                }
                for r in results
            ]

            return {
                "intent": intent,
                "state_filter": target_state,
                "table_used": "regulatory_changes",
                "generated_query_summary": f"SELECT * FROM regulatory_changes WHERE state = '{target_state or 'ALL'}' ORDER BY detected_at DESC LIMIT 15",
                "records_retrieved": len(data),
                "data": data,
                "recommended_visualization": "timeline",
            }

        # Generic / Entity Search Fallback
        intent = "ENTITY_SEARCH"
        query = db.query(Entity)
        if target_state:
            query = query.join(EntityLocation).filter(EntityLocation.state == target_state)

        results = query.order_by(Entity.created_at.desc()).limit(20).all()
        data = [
            {
                "id": e.id,
                "name": e.name,
                "entity_type": e.entity_type,
                "verification_status": e.verification_status,
                "freshness_status": getattr(e, "freshness_status", "FRESH"),
                "data_quality_score": round(e.data_quality_score * 100, 1),
            }
            for e in results
        ]

        return {
            "intent": intent,
            "state_filter": target_state,
            "table_used": "entities",
            "generated_query_summary": "SELECT * FROM entities ORDER BY created_at DESC LIMIT 20",
            "records_retrieved": len(data),
            "data": data,
            "recommended_visualization": "table",
        }
