from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, distinct
from app.database.models import PartnershipOpportunity
from app.utils.geo_resolver import resolve_us_location

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

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def list_opportunities(
        self,
        db: Optional[Session] = None,
        status: Optional[str] = None,
        state: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        active_db = db or self.db
        if not active_db:
            raise ValueError("Database session required")

        query = active_db.query(PartnershipOpportunity)

        if status and isinstance(status, str) and status != "ALL":
            # Normalize status check
            query = query.filter(PartnershipOpportunity.partnership_status.ilike(f"%{status}%"))

        if state and isinstance(state, str) and state != "ALL":
            loc_info = resolve_us_location(state)
            m_code = loc_info.get("state_code")
            m_name = loc_info.get("state_name")
            m_city = loc_info.get("city")
            conds = [PartnershipOpportunity.state.ilike(f"%{state}%")]
            if m_code:
                conds.append(PartnershipOpportunity.state.ilike(f"%{m_code}%"))
            if m_name:
                conds.append(PartnershipOpportunity.state.ilike(f"%{m_name}%"))
            if m_city:
                conds.append(PartnershipOpportunity.city.ilike(f"%{m_city}%"))
            query = query.filter(or_(*conds))

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

    def get_available_states(self, db: Optional[Session] = None) -> List[str]:
        active_db = db or self.db
        if not active_db:
            return []
        rows = active_db.query(distinct(PartnershipOpportunity.state)).filter(PartnershipOpportunity.state.isnot(None)).all()
        return sorted([r[0].strip().upper() for r in rows if r[0] and r[0].strip()])

    def update_partnership_status(
        self,
        opportunity_id: str,
        new_status: str,
        notes: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> PartnershipOpportunity:
        active_db = db or self.db
        if not active_db:
            raise ValueError("Database session required")

        opp = active_db.get(PartnershipOpportunity, opportunity_id)
        if not opp:
            raise ValueError("Partnership opportunity not found")

        norm_status = new_status.upper().replace(" ", "_")
        if norm_status not in self.VALID_STATUSES and new_status.upper() not in self.VALID_STATUSES:
            # Tolerant normalization
            norm_status = new_status.upper()

        opp.partnership_status = norm_status
        opp.last_contacted_at = datetime.now(timezone.utc)
        if notes:
            opp.internal_notes = f"{opp.internal_notes or ''}\n[{datetime.now().strftime('%Y-%m-%d')}]: {notes}".strip()

        active_db.commit()
        active_db.refresh(opp)
        return opp

