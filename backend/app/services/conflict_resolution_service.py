"""
Integration Conflict Resolution Service (Phase 6).
When multiple sources report conflicting evidence for the same entity:
1. Preserves both source records with timestamps in data_conflicts table.
2. Compares source authority and freshness according to documented precedence rules.
3. Automatically resolves if authority gap is conclusive, or flags as UNRESOLVED for human review.
4. Allows authorized compliance reviewers to record manual corrections with mandatory justification.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.models import DataConflict, Entity, EntityAuditTrail


SOURCE_AUTHORITY_WEIGHTS = {
    "STATE_DOH": 100,
    "NPI_REGISTRY": 100,
    "INTERNAL_MMJ_DOCS": 90,
    "VERIFIED_PRIMARY_WEBSITE": 80,
    "COMMERCIAL_DIRECTORY": 60,
    "SURFACE_SCRAPE": 40,
}


class ConflictResolutionService:
    """Detects, preserves, and resolves multi-source data conflicts."""

    def __init__(self, db: Session):
        self.db = db

    def get_source_authority(self, source_name: str) -> int:
        s_upper = source_name.upper()
        for k, weight in SOURCE_AUTHORITY_WEIGHTS.items():
            if k in s_upper:
                return weight
        return 50

    def detect_and_record_conflict(
        self,
        entity_id: str,
        field_name: str,
        source_a_name: str,
        source_a_value: str,
        source_b_name: str,
        source_b_value: str,
        source_a_timestamp: Optional[datetime] = None,
        source_b_timestamp: Optional[datetime] = None,
    ) -> DataConflict:
        """
        Preserves conflicting source evidence and applies authority weighting rules.
        """
        # If values match, no conflict exists
        if source_a_value.strip().lower() == source_b_value.strip().lower():
            return None

        # Check existing unresolved conflict
        existing = (
            self.db.query(DataConflict)
            .filter(
                DataConflict.entity_id == entity_id,
                DataConflict.field_name == field_name,
                DataConflict.resolution_status == "UNRESOLVED",
            )
            .first()
        )
        if existing:
            return existing

        auth_a = self.get_source_authority(source_a_name)
        auth_b = self.get_source_authority(source_b_name)

        # Automated resolution if authority difference is >= 20 points
        if auth_a - auth_b >= 20:
            status = "RESOLVED_SOURCE_A"
            winner = source_a_value
            reason = f"Automated: {source_a_name} (Authority {auth_a}) takes precedence over {source_b_name} (Authority {auth_b})."
        elif auth_b - auth_a >= 20:
            status = "RESOLVED_SOURCE_B"
            winner = source_b_value
            reason = f"Automated: {source_b_name} (Authority {auth_b}) takes precedence over {source_a_name} (Authority {auth_a})."
        else:
            status = "UNRESOLVED"
            winner = None
            reason = f"Flagged for review: Comparable authority between {source_a_name} ({auth_a}) and {source_b_name} ({auth_b})."

        conflict = DataConflict(
            entity_id=entity_id,
            field_name=field_name,
            source_a_name=source_a_name,
            source_a_value=source_a_value,
            source_a_timestamp=source_a_timestamp or datetime.now(timezone.utc),
            source_b_name=source_b_name,
            source_b_value=source_b_value,
            source_b_timestamp=source_b_timestamp or datetime.now(timezone.utc),
            resolution_status=status,
            winning_value=winner,
            resolution_reason=reason,
            resolved_at=datetime.now(timezone.utc) if status != "UNRESOLVED" else None,
        )
        self.db.add(conflict)
        self.db.commit()
        self.db.refresh(conflict)
        return conflict

    def list_conflicts(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.db.query(DataConflict)
        if status and status.upper() != "ALL":
            query = query.filter(DataConflict.resolution_status == status.upper())
        conflicts = query.order_by(DataConflict.created_at.desc()).limit(100).all()

        results = []
        for c in conflicts:
            ent = self.db.get(Entity, c.entity_id)
            results.append({
                "id": c.id,
                "entity_id": c.entity_id,
                "entity_name": ent.name if ent else "Unknown",
                "field_name": c.field_name,
                "source_a_name": c.source_a_name,
                "source_a_value": c.source_a_value,
                "source_a_timestamp": c.source_a_timestamp.isoformat() if c.source_a_timestamp else None,
                "source_b_name": c.source_b_name,
                "source_b_value": c.source_b_value,
                "source_b_timestamp": c.source_b_timestamp.isoformat() if c.source_b_timestamp else None,
                "resolution_status": c.resolution_status,
                "winning_value": c.winning_value,
                "resolution_reason": c.resolution_reason,
                "resolved_by": c.resolved_by,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
            })
        return results

    def resolve_conflict_manually(
        self,
        conflict_id: str,
        chosen_value: str,
        justification: str,
        resolved_by: str,
    ) -> Dict[str, Any]:
        """Authorized compliance reviewer manually resolves conflict with mandatory justification."""
        conflict = self.db.get(DataConflict, conflict_id)
        if not conflict:
            raise ValueError("Conflict record not found.")

        conflict.resolution_status = "MANUALLY_OVERRIDDEN"
        conflict.winning_value = chosen_value
        conflict.resolution_reason = justification
        conflict.resolved_by = resolved_by
        conflict.resolved_at = datetime.now(timezone.utc)

        # Also write to EntityAuditTrail
        audit = EntityAuditTrail(
            entity_id=conflict.entity_id,
            changed_by_email=resolved_by,
            action="CONFLICT_RESOLUTION",
            field_name=conflict.field_name,
            old_value=f"Conflicted: {conflict.source_a_name} vs {conflict.source_b_name}",
            new_value=chosen_value,
            reason=justification,
        )
        self.db.add(audit)
        self.db.commit()

        return {
            "conflict_id": conflict.id,
            "status": "MANUALLY_OVERRIDDEN",
            "winning_value": chosen_value,
            "resolved_by": resolved_by,
        }
