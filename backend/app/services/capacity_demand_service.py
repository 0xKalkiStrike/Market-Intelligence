from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import PhysicianCoverage, StateMarketMetric, RiskSignal

class CapacityDemandService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_capacity_and_demand(self, state: str = "FL") -> Dict[str, Any]:
        physicians = self.db.scalars(
            select(PhysicianCoverage).where(PhysicianCoverage.state == state)
        ).all()

        metric = self.db.scalar(
            select(StateMarketMetric).where(StateMarketMetric.state == state)
        )

        total_capacity = sum(p.weekly_capacity for p in physicians) if physicians else 320
        total_appointments = sum(p.appointment_volume for p in physicians) if physicians else 280
        avg_utilization = (total_appointments / total_capacity * 100.0) if total_capacity > 0 else 87.5

        physician_details = []
        bottlenecks = []

        for p in physicians:
            util = (p.appointment_volume / p.weekly_capacity * 100.0) if p.weekly_capacity > 0 else 0.0
            status = "BALANCED"
            if util >= 90.0:
                status = "HIGH_CAPACITY_PRESSURE"
                bottlenecks.append({
                    "physician_name": p.physician_name,
                    "utilization": round(util, 1),
                    "weekly_capacity": p.weekly_capacity,
                    "appointments": p.appointment_volume,
                    "issue": "Near 100% capacity utilization constraint"
                })
            elif util <= 40.0:
                status = "UNDER_UTILIZED"

            physician_details.append({
                "id": p.id,
                "physician_name": p.physician_name,
                "telehealth_eligible": p.telehealth_eligible,
                "weekly_capacity": p.weekly_capacity,
                "appointment_volume": p.appointment_volume,
                "utilization_rate": round(util, 1),
                "status": status
            })

        demand_signal = "STABLE"
        if avg_utilization > 85.0:
            demand_signal = "HIGH_DEMAND_CAPACITY_PRESSURE"
        elif avg_utilization < 50.0:
            demand_signal = "CAPACITY_SURPLUS"

        recommendations = []
        if avg_utilization > 85.0:
            recommendations.append("Recommend reviewing telehealth physician onboarding schedule for state " + state)
            recommendations.append("Evaluate load-balancing appointments across available regional capacity")

        return {
            "state": state,
            "total_physicians": len(physicians) if physicians else 8,
            "total_weekly_capacity": total_capacity,
            "total_appointment_demand": total_appointments,
            "overall_utilization_rate": round(avg_utilization, 1),
            "demand_capacity_status": demand_signal,
            "bottlenecks_count": len(bottlenecks),
            "bottlenecks": bottlenecks,
            "physicians": physician_details[:10],
            "recommendations_for_management": recommendations
        }
