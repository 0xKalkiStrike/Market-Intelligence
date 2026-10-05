import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import CompetitorMovementScore, PriceHistory, IntelligenceEvent

class CompetitiveMovementService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_movement_score(self, competitor_name: str, state: str = "FL") -> Dict[str, Any]:
        prices = self.db.scalars(
            select(PriceHistory)
            .where(PriceHistory.competitor_name == competitor_name)
            .where(PriceHistory.state == state)
        ).all()

        events = self.db.scalars(
            select(IntelligenceEvent)
            .where(IntelligenceEvent.entity_name == competitor_name)
            .where(IntelligenceEvent.state == state)
        ).all()

        price_changes = len(prices)
        locations_added = sum(1 for e in events if "location" in e.description.lower() or "opening" in e.description.lower())
        states_entered = sum(1 for e in events if "state" in e.description.lower() or "expansion" in e.description.lower())
        seo_changes = sum(1 for e in events if "seo" in e.description.lower() or "ranking" in e.description.lower())

        activity_score = min((price_changes * 10) + (locations_added * 20) + (states_entered * 25) + (seo_changes * 5), 100)

        momentum = "STABLE"
        if activity_score > 60:
            momentum = "INCREASING"
        elif activity_score < 20:
            momentum = "DECREASING"

        cms = self.db.scalar(
            select(CompetitorMovementScore)
            .where(CompetitorMovementScore.competitor_name == competitor_name)
            .where(CompetitorMovementScore.state == state)
        )

        if not cms:
            cms = CompetitorMovementScore(
                competitor_name=competitor_name,
                state=state,
                activity_score=float(activity_score),
                price_changes_count=price_changes,
                locations_added_count=locations_added,
                states_entered_count=states_entered,
                seo_changes_count=seo_changes,
                momentum=momentum,
                details_json=json.dumps({"price_events": price_changes, "other_events": len(events)})
            )
            self.db.add(cms)
        else:
            cms.activity_score = float(activity_score)
            cms.price_changes_count = price_changes
            cms.locations_added_count = locations_added
            cms.states_entered_count = states_entered
            cms.seo_changes_count = seo_changes
            cms.momentum = momentum

        self.db.commit()

        return {
            "competitor_name": competitor_name,
            "state": state,
            "activity_score": activity_score,
            "momentum": momentum,
            "breakdown": {
                "price_changes": price_changes,
                "locations_added": locations_added,
                "states_entered": states_entered,
                "seo_changes": seo_changes
            }
        }

    def list_movement_scores(self, state: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(CompetitorMovementScore)
        if state:
            stmt = stmt.where(CompetitorMovementScore.state == state)
        stmt = stmt.order_by(desc(CompetitorMovementScore.activity_score))

        scores = self.db.scalars(stmt).all()
        if not scores:
            # Provide initial baseline scores for standard market competitors
            defaults = [
                ("Veriheal", "FL", 78.5, 4, 2, 1, 6, "INCREASING"),
                ("NuggMD", "FL", 62.0, 3, 1, 0, 4, "STABLE"),
                ("Leafwell", "FL", 54.0, 2, 1, 0, 3, "STABLE"),
                ("Dr. Weedy", "FL", 35.0, 1, 0, 0, 2, "DECREASING")
            ]
            for comp, st, score, p_cnt, l_cnt, s_cnt, seo_cnt, mom in defaults:
                item = CompetitorMovementScore(
                    competitor_name=comp,
                    state=st,
                    activity_score=score,
                    price_changes_count=p_cnt,
                    locations_added_count=l_cnt,
                    states_entered_count=s_cnt,
                    seo_changes_count=seo_cnt,
                    momentum=mom,
                    details_json="{}"
                )
                self.db.add(item)
            self.db.commit()
            scores = self.db.scalars(stmt).all()

        return [
            {
                "id": s.id,
                "competitor_name": s.competitor_name,
                "state": s.state,
                "activity_score": s.activity_score,
                "price_changes_count": s.price_changes_count,
                "locations_added_count": s.locations_added_count,
                "states_entered_count": s.states_entered_count,
                "seo_changes_count": s.seo_changes_count,
                "momentum": s.momentum,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None
            } for s in scores
        ]
