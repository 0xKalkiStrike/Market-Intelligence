import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database.models import SeoKeyword, SeoRanking

class SeoIntelligenceService:
    """Tracks organic surface-web search visibility, keyword positions, competitor ranking changes."""

    def list_keywords_and_rankings(self, db: Session, state: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(SeoKeyword)
        if state:
            query = query.filter(SeoKeyword.state.ilike(f"%{state}%"))

        keywords = query.all()
        results = []
        for kw in keywords:
            ranking = db.query(SeoRanking).filter(SeoRanking.keyword_id == kw.id).order_by(SeoRanking.checked_at.desc()).first()

            comp_positions = json.loads(ranking.competitor_positions_json) if ranking and ranking.competitor_positions_json else []

            results.append({
                "keyword_id": kw.id,
                "keyword": kw.keyword,
                "search_query": kw.search_query,
                "category": kw.category,
                "state": kw.state,
                "mmj_position": ranking.mmj_position if ranking else None,
                "prev_position": ranking.prev_position if ranking else None,
                "position_change": ranking.position_change if ranking else 0,
                "landing_page": ranking.landing_page if ranking else None,
                "competitor_positions": comp_positions,
                "checked_at": ranking.checked_at.isoformat() if ranking and ranking.checked_at else None,
            })

        return results
