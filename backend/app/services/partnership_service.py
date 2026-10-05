from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import PartnershipOpportunity, Entity, EntityLocation, EntityContact, DispensaryDetail

class PartnershipService:
    """Manages Dispensary Partnership CRM Intelligence & Opportunity Scoring."""

    VALID_STATUSES = [
        "NOT_CONTACTED",
        "CONTACTED",
        "FOLLOW_UP_NEEDED",
        "INTERESTED",
        "MEETING_SCHEDULED",
        "PARTNER",
        "ACTIVE_REFERRAL",
        "INACTIVE",
        "NOT_INTERESTED",
    ]

    def list_opportunities(
        self,
        db: Session,
        status: Optional[str] = None,
        state: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = db.query(PartnershipOpportunity)

        if status and status != "ALL":
            query = query.filter(PartnershipOpportunity.partnership_status == status)

        if state:
            query = query.filter(PartnershipOpportunity.state.ilike(f"%{state}%"))

        if search:
            query = query.filter(
                (PartnershipOpportunity.name.ilike(f"%{search}%"))
                | (PartnershipOpportunity.city.ilike(f"%{search}%"))
                | (PartnershipOpportunity.parent_company.ilike(f"%{search}%"))
            )

        opps = query.order_by(PartnershipOpportunity.partnership_score.desc()).all()

        return [
            {
                "id": o.id,
                "entity_id": o.entity_id,
                "name": o.name,
                "parent_company": o.parent_company or "Independent",
                "brand": o.brand or o.name,
                "state": o.state,
                "city": o.city,
                "address": o.address,
                "zip_code": o.zip_code,
                "phone": o.phone,
                "email": o.email,
                "location_count": o.location_count,
                "partnership_status": o.partnership_status,
                "partnership_score": o.partnership_score,
                "distance_miles": o.distance_miles,
                "local_patient_volume": o.local_patient_volume,
                "competitor_presence_level": o.competitor_presence_level,
                "internal_notes": o.internal_notes,
                "last_contacted_at": o.last_contacted_at.isoformat() if o.last_contacted_at else None,
            }
            for o in opps
        ]

    def update_partnership_status(
        self,
        db: Session,
        opportunity_id: str,
        new_status: str,
        notes: Optional[str] = None,
    ) -> PartnershipOpportunity:
        opp = db.get(PartnershipOpportunity, opportunity_id)
        if not opp:
            raise ValueError("Partnership opportunity not found")

        if new_status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status: {new_status}")

        opp.partnership_status = new_status
        opp.last_contacted_at = datetime.now(timezone.utc)
        if notes:
            opp.internal_notes = f"{opp.internal_notes or ''}\n[{datetime.now().strftime('%Y-%m-%d')}]: {notes}".strip()

        db.commit()
        db.refresh(opp)
        return opp
