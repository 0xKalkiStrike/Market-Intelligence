import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.database.models import (
    IntelligenceEvent,
    IntelligenceKnowledgeObject,
    PriceHistory,
    RegulatoryChange,
    StateMarketMetric,
)


class KnowledgeLayerService:
    """Service building structured domain intelligence objects (MarketEvent, CompetitorChange, PriceChange, etc.) for AI context."""

    def build_knowledge_objects(self, db: Session, limit: int = 100) -> List[IntelligenceKnowledgeObject]:
        objects: List[IntelligenceKnowledgeObject] = []

        # 1. Price Changes -> PriceChange objects
        prices = db.query(PriceHistory).order_by(PriceHistory.effective_date.desc()).limit(20).all()
        for p in prices:
            obj = IntelligenceKnowledgeObject(
                object_type="PriceChange",
                entity_id=p.entity_id,
                entity_name=p.competitor_name,
                state=p.state,
                title=f"Price Update: {p.competitor_name} ({p.state})",
                summary=f"{p.competitor_name} updated initial price to ${p.new_price:.2f} (prev: ${p.previous_price or 0:.2f}). Promo: {p.promotion_name or 'None'}.",
                payload_json=json.dumps({
                    "competitor_name": p.competitor_name,
                    "state": p.state,
                    "previous_price": p.previous_price,
                    "new_price": p.new_price,
                    "promotion_name": p.promotion_name,
                    "effective_date": p.effective_date.isoformat() if p.effective_date else None,
                }),
                confidence=p.confidence or "HIGH",
                source_name=p.source_name,
                source_url=p.source_url,
            )
            objects.append(obj)

        # 2. Market Opportunities -> MarketOpportunity objects
        metrics = db.query(StateMarketMetric).order_by(StateMarketMetric.opportunity_score.desc()).all()
        for m in metrics:
            obj = IntelligenceKnowledgeObject(
                object_type="MarketOpportunity",
                state=m.state,
                title=f"Opportunity Signal: {m.state} Score {m.opportunity_score:.1f}",
                summary=f"State {m.state} score {m.opportunity_score:.1f}. Patient pop: {m.patient_population:,}, competitors: {m.competitor_count}, dispensaries: {m.dispensary_count}.",
                payload_json=json.dumps({
                    "state": m.state,
                    "opportunity_score": m.opportunity_score,
                    "patient_population": m.patient_population,
                    "competitor_count": m.competitor_count,
                    "dispensary_count": m.dispensary_count,
                    "telehealth_allowed": m.telehealth_allowed,
                }),
                confidence="HIGH",
                source_name=f"State Market Metric ({m.state})",
            )
            objects.append(obj)

        # 3. Regulatory Changes -> RegulatoryChange objects
        regs = db.query(RegulatoryChange).order_by(RegulatoryChange.detected_at.desc()).limit(15).all()
        for r in regs:
            obj = IntelligenceKnowledgeObject(
                object_type="RegulatoryChange",
                state=r.state,
                title=f"Regulatory Update: {r.state} - {r.rule_title}",
                summary=f"[{r.state}] {r.rule_title}: {r.new_info}. Priority: {r.impact_priority}.",
                payload_json=json.dumps({
                    "state": r.state,
                    "rule_title": r.rule_title,
                    "event_type": r.event_type,
                    "new_info": r.new_info,
                    "impact_priority": r.impact_priority,
                }),
                confidence="HIGH",
                source_name="State Department of Health Gazette",
                source_url=r.source_url,
            )
            objects.append(obj)

        # 4. Intelligence Events -> MarketEvent objects
        events = db.query(IntelligenceEvent).order_by(IntelligenceEvent.detected_at.desc()).limit(20).all()
        for e in events:
            obj = IntelligenceKnowledgeObject(
                object_type="MarketEvent",
                entity_id=e.entity_id,
                entity_name=e.entity_name,
                state=e.state,
                title=f"Market Event: {e.entity_name} ({e.state})",
                summary=e.description,
                payload_json=json.dumps({
                    "event_type": e.event_type,
                    "entity_name": e.entity_name,
                    "state": e.state,
                    "importance": e.importance,
                }),
                confidence="HIGH",
                source_name=e.source_name,
                source_url=e.source_url,
            )
            objects.append(obj)

        return objects

    def get_knowledge_summary(self, db: Session) -> Dict[str, Any]:
        objs = self.build_knowledge_objects(db)
        by_type: Dict[str, int] = {}
        for o in objs:
            by_type[o.object_type] = by_type.get(o.object_type, 0) + 1

        return {
            "total_objects": len(objs),
            "object_breakdown": by_type,
            "sample_objects": [
                {
                    "object_type": o.object_type,
                    "title": o.title,
                    "state": o.state,
                    "summary": o.summary,
                    "confidence": o.confidence,
                    "source_name": o.source_name,
                }
                for o in objs[:10]
            ],
        }
