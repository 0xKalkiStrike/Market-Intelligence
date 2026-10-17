from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import (
    Watchlist, WatchlistItem, MonitoringRule
)

class ContinuousIntelligenceService:
    def __init__(self, db: Session):
        self.db = db

    def get_watchlists(self) -> List[Dict[str, Any]]:
        lists = self.db.scalars(select(Watchlist).order_by(desc(Watchlist.created_at))).all()
        result = []
        for w in lists:
            items = self.db.scalars(select(WatchlistItem).where(WatchlistItem.watchlist_id == w.id)).all()
            result.append({
                "id": w.id,
                "name": w.name,
                "description": w.description,
                "category": w.category,
                "is_active": w.is_active,
                "created_by": w.created_by,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "items_count": len(items),
                "items": [
                    {
                        "id": item.id,
                        "item_type": item.item_type,
                        "target_identifier": item.target_identifier,
                        "notes": item.notes,
                        "added_at": item.added_at.isoformat() if item.added_at else None
                    } for item in items
                ]
            })
        return result

    def create_watchlist(self, name: str, category: str, description: Optional[str] = None, items: Optional[List[Dict[str, str]]] = None, created_by: str = "admin") -> Dict[str, Any]:
        wl = Watchlist(
            name=name,
            category=category,
            description=description,
            created_by=created_by
        )
        self.db.add(wl)
        self.db.commit()
        self.db.refresh(wl)

        if items:
            for item in items:
                w_item = WatchlistItem(
                    watchlist_id=wl.id,
                    item_type=item.get("item_type", "STATE"),
                    target_identifier=item.get("target_identifier", ""),
                    notes=item.get("notes")
                )
                self.db.add(w_item)
            self.db.commit()

        return {"status": "success", "id": wl.id, "name": wl.name}

    def add_watchlist_item(self, watchlist_id: str, item_type: str, target_identifier: str, notes: Optional[str] = None) -> Dict[str, Any]:
        item = WatchlistItem(
            watchlist_id=watchlist_id,
            item_type=item_type,
            target_identifier=target_identifier,
            notes=notes
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return {"status": "success", "item_id": item.id}

    def delete_watchlist(self, watchlist_id: str) -> Dict[str, Any]:
        wl = self.db.scalar(select(Watchlist).where(Watchlist.id == watchlist_id))
        if wl:
            self.db.delete(wl)
            self.db.commit()
            return {"status": "deleted", "id": watchlist_id}
        return {"status": "not_found", "id": watchlist_id}

    def get_monitoring_rules(self) -> List[Dict[str, Any]]:
        rules = self.db.scalars(select(MonitoringRule).order_by(desc(MonitoringRule.created_at))).all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "trigger_event": r.trigger_event,
                "condition_operator": r.condition_operator,
                "condition_value": r.condition_value,
                "action_type": r.action_type,
                "priority": r.priority,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in rules
        ]

    def create_monitoring_rule(self, name: str, trigger_event: str, condition_operator: str, condition_value: str, action_type: str = "CREATE_ALERT", priority: str = "HIGH") -> Dict[str, Any]:
        rule = MonitoringRule(
            name=name,
            trigger_event=trigger_event,
            condition_operator=condition_operator,
            condition_value=condition_value,
            action_type=action_type,
            priority=priority,
            is_active=True
        )
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return {"status": "success", "rule_id": rule.id, "name": rule.name}

    def evaluate_intelligent_alert_priority(self, magnitude_percent: float, market_relevance: str, source_confidence: str, operational_impact: str) -> Dict[str, Any]:
        score = 0.0
        # Magnitude
        if abs(magnitude_percent) >= 20.0:
            score += 35.0
        elif abs(magnitude_percent) >= 10.0:
            score += 20.0
        else:
            score += 10.0

        # Market Relevance
        if market_relevance.upper() in ["HIGH", "CRITICAL"]:
            score += 25.0
        elif market_relevance.upper() == "MEDIUM":
            score += 15.0
        else:
            score += 5.0

        # Source Confidence
        if source_confidence.upper() in ["HIGH", "VERIFIED"]:
            score += 20.0
        elif source_confidence.upper() == "MEDIUM":
            score += 10.0
        else:
            score += 5.0

        # Operational Impact
        if operational_impact.upper() in ["HIGH", "CRITICAL"]:
            score += 20.0
        elif operational_impact.upper() == "MEDIUM":
            score += 10.0
        else:
            score += 5.0

        if score >= 75.0:
            calculated_priority = "CRITICAL"
        elif score >= 55.0:
            calculated_priority = "HIGH"
        elif score >= 35.0:
            calculated_priority = "MEDIUM"
        else:
            calculated_priority = "LOW"

        explanation = f"Score {score:.1f}/100 based on magnitude ({magnitude_percent}%), market relevance ({market_relevance}), source confidence ({source_confidence}), and operational impact ({operational_impact})."

        return {
            "calculated_score": round(score, 1),
            "calculated_priority": calculated_priority,
            "explanation": explanation,
            "factors": {
                "magnitude_percent": magnitude_percent,
                "market_relevance": market_relevance,
                "source_confidence": source_confidence,
                "operational_impact": operational_impact
            }
        }
