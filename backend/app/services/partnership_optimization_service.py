from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import PartnershipOpportunity, ManagementReviewItem

class PartnershipOptimizationService:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_partnership_score(
        self,
        location_count: int,
        local_patient_volume: int,
        competitor_presence_level: str,
        distance_miles: float
    ) -> Dict[str, Any]:
        score = 0.0
        # Location Count
        score += min(location_count * 8.0, 30.0)
        # Patient Volume
        if local_patient_volume >= 5000:
            score += 30.0
        elif local_patient_volume >= 1000:
            score += 20.0
        else:
            score += 10.0
        # Competitor presence
        if competitor_presence_level.upper() == "LOW":
            score += 25.0
        elif competitor_presence_level.upper() == "MEDIUM":
            score += 15.0
        else:
            score += 5.0
        # Proximity
        if distance_miles <= 5.0:
            score += 15.0
        elif distance_miles <= 15.0:
            score += 10.0
        else:
            score += 5.0

        final_score = min(score, 100.0)
        return {
            "partnership_score": round(final_score, 1),
            "breakdown": {
                "location_factor": min(location_count * 8.0, 30.0),
                "volume_factor": 30.0 if local_patient_volume >= 5000 else 20.0,
                "competitor_factor": 25.0 if competitor_presence_level.upper() == "LOW" else 15.0,
                "proximity_factor": 15.0 if distance_miles <= 5.0 else 10.0
            }
        }

    def list_opportunities(self, state: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(PartnershipOpportunity)
        if state:
            stmt = stmt.where(PartnershipOpportunity.state == state)
        if status:
            stmt = stmt.where(PartnershipOpportunity.partnership_status == status)
        stmt = stmt.order_by(desc(PartnershipOpportunity.partnership_score))

        opps = self.db.scalars(stmt).all()
        return [
            {
                "id": o.id,
                "name": o.name,
                "parent_company": o.parent_company,
                "brand": o.brand,
                "state": o.state,
                "city": o.city,
                "location_count": o.location_count,
                "partnership_status": o.partnership_status,
                "partnership_score": o.partnership_score,
                "distance_miles": o.distance_miles,
                "local_patient_volume": o.local_patient_volume,
                "competitor_presence_level": o.competitor_presence_level,
                "internal_notes": o.internal_notes,
                "last_contacted_at": o.last_contacted_at.isoformat() if o.last_contacted_at else None
            } for o in opps
        ]

    def update_partnership_stage(self, opp_id: str, new_status: str, notes: Optional[str] = None) -> Dict[str, Any]:
        opp = self.db.scalar(select(PartnershipOpportunity).where(PartnershipOpportunity.id == opp_id))
        if not opp:
            return {"status": "not_found", "id": opp_id}

        opp.partnership_status = new_status
        if notes:
            opp.internal_notes = (opp.internal_notes or "") + f"\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d')}] Status changed to {new_status}: {notes}"
        if new_status in ["CONTACTED", "MEETING_SCHEDULED"]:
            opp.last_contacted_at = datetime.now(timezone.utc)

        self.db.commit()

        # If high value partnership lead, send to management review queue
        if opp.partnership_score >= 80.0 and new_status == "INTERESTED":
            m_item = ManagementReviewItem(
                item_type="PARTNERSHIP_LEAD",
                title=f"High-Value Partnership Opportunity: {opp.name}",
                state=opp.state,
                evidence=f"Dispensary {opp.name} with {opp.location_count} locations and score {opp.partnership_score} expressed interest.",
                confidence="HIGH",
                suggested_review_step="Review partnership terms and assign executive owner for introduction call.",
                status="PENDING"
            )
            self.db.add(m_item)
            self.db.commit()

        return {"status": "success", "id": opp.id, "new_status": opp.partnership_status}
