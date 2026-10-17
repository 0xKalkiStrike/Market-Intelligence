from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import PhysicianCoverage

class PhysicianCoverageService:
    """Tracks physician licensing, telehealth eligibility, capacity vs demand metrics."""

    def list_physician_coverage(
        self,
        db: Session,
        state: Optional[str] = None,
        telehealth_only: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query = db.query(PhysicianCoverage)

        if state:
            query = query.filter(PhysicianCoverage.state.ilike(f"%{state}%"))

        if telehealth_only is True:
            query = query.filter(PhysicianCoverage.telehealth_eligible)

        physicians = query.all()

        total_capacity = sum(p.weekly_capacity for p in physicians) if physicians else 0
        total_volume = sum(p.patient_volume for p in physicians) if physicians else 0
        overall_utilization = round((total_volume / total_capacity * 100), 1) if total_capacity > 0 else 0.0

        items = [
            {
                "id": p.id,
                "entity_id": p.entity_id,
                "physician_name": p.physician_name,
                "state": p.state,
                "license_number": p.license_number,
                "license_status": p.license_status,
                "telehealth_eligible": p.telehealth_eligible,
                "in_person_required": p.in_person_required,
                "weekly_capacity": p.weekly_capacity,
                "patient_volume": p.patient_volume,
                "appointment_volume": p.appointment_volume,
                "utilization_rate": round(p.utilization_rate, 1),
                "mismatch_signal": "HIGH_DEMAND_LOW_CAPACITY" if p.utilization_rate > 85.0 else ("AVAILABLE_CAPACITY" if p.utilization_rate < 40.0 else "BALANCED"),
            }
            for p in physicians
        ]

        return {
            "physicians": items,
            "total_physicians": len(items),
            "total_capacity_weekly": total_capacity,
            "total_patient_volume": total_volume,
            "overall_utilization_percent": overall_utilization,
        }
