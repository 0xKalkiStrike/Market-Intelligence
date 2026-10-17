import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database.models import ReviewIntelligence

class ReviewIntelligenceService:
    """Aggregates public review sentiment, theme breakdown, ratings, and competitor review changes."""

    def get_review_intelligence(self, db: Session, entity_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(ReviewIntelligence)
        if entity_id:
            query = query.filter(ReviewIntelligence.entity_id == entity_id)

        reviews = query.all()
        results = []
        for r in reviews:
            themes = [
                {
                    "theme_category": t.theme_category,
                    "sentiment": t.sentiment,
                    "mention_count": t.mention_count,
                    "summary_text": t.summary_text,
                    "sample_quotes": json.loads(t.sample_quotes_json) if t.sample_quotes_json else [],
                }
                for t in r.themes
            ]

            results.append({
                "id": r.id,
                "entity_id": r.entity_id,
                "entity_name": r.entity_name,
                "entity_type": r.entity_type,
                "overall_rating": r.overall_rating,
                "total_reviews": r.total_reviews,
                "rating_change": r.rating_change,
                "review_volume_change": r.review_volume_change,
                "source_name": r.source_name,
                "source_url": r.source_url,
                "themes": themes,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            })

        return results
