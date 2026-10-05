from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database.models import RegulatoryRequirement, RegulatoryChange

class RegulatoryIntelligenceService:
    """Monitors authoritative public surface-web sources for state regulatory changes."""

    def list_requirements(self, db: Session, state: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(RegulatoryRequirement)
        if state:
            query = query.filter(RegulatoryRequirement.state.ilike(f"%{state}%"))

        reqs = query.all()
        return [
            {
                "id": r.id,
                "state": r.state,
                "agency_name": r.agency_name,
                "rule_title": r.rule_title,
                "rule_category": r.rule_category,
                "requirement_text": r.requirement_text,
                "telehealth_allowed": r.telehealth_allowed,
                "physician_in_person_required": r.physician_in_person_required,
                "renewal_frequency_months": r.renewal_frequency_months,
                "registration_fee": r.registration_fee,
                "effective_date": r.effective_date.isoformat() if r.effective_date else None,
                "source_name": r.source_name,
                "source_url": r.source_url,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in reqs
        ]

    def list_changes(self, db: Session, state: Optional[str] = None, priority: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(RegulatoryChange)
        if state:
            query = query.filter(RegulatoryChange.state.ilike(f"%{state}%"))
        if priority and priority != "ALL":
            query = query.filter(RegulatoryChange.impact_priority == priority)

        changes = query.order_by(RegulatoryChange.detected_at.desc()).all()
        return [
            {
                "id": c.id,
                "requirement_id": c.requirement_id,
                "state": c.state,
                "rule_title": c.rule_title,
                "event_type": c.event_type,
                "previous_info": c.previous_info,
                "new_info": c.new_info,
                "impact_priority": c.impact_priority,
                "source_url": c.source_url,
                "effective_date": c.effective_date.isoformat() if c.effective_date else None,
                "detected_at": c.detected_at.isoformat() if c.detected_at else None,
            }
            for c in changes
        ]
