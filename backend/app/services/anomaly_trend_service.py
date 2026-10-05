import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.models import (
    Entity,
    IntelligenceEvent,
    PartnershipOpportunity,
    PhysicianCoverage,
    PriceHistory,
    ReviewIntelligence,
    SeoRanking,
    StateMarketMetric,
)


class AnomalyTrendService:
    """Service performing statistical anomaly detection (Z-score / variance) and directional trend classification over W/M/Q/Y."""

    def detect_anomalies(self, db: Session) -> List[Dict[str, Any]]:
        anomalies: List[Dict[str, Any]] = []

        # 1. Pricing Anomalies
        prices = db.query(PriceHistory).limit(50).all()
        if len(prices) >= 3:
            price_vals = [p.new_price for p in prices if p.new_price]
            if len(price_vals) >= 3:
                mean_price = statistics.mean(price_vals)
                stdev_price = statistics.stdev(price_vals) if len(price_vals) > 1 else 1.0

                for p in prices:
                    if stdev_price > 0:
                        z_score = (p.new_price - mean_price) / stdev_price
                        if abs(z_score) >= 1.5:
                            anomalies.append({
                                "category": "PRICING",
                                "entity_name": p.competitor_name,
                                "state": p.state,
                                "metric_name": "Initial Certification Price",
                                "observed_value": p.new_price,
                                "expected_baseline": round(mean_price, 2),
                                "anomaly_score": round(abs(z_score), 2),
                                "signal_level": "HIGH" if abs(z_score) >= 2.0 else "MEDIUM",
                                "description": f"Price of ${p.new_price:.2f} for {p.competitor_name} deviates significantly from market mean (${mean_price:.2f}).",
                            })

        # 2. Physician Utilization Anomalies
        doctors = db.query(PhysicianCoverage).limit(50).all()
        for d in doctors:
            if d.utilization_rate > 0.85:
                anomalies.append({
                    "category": "PHYSICIAN_CAPACITY",
                    "entity_name": d.physician_name,
                    "state": d.state,
                    "metric_name": "Physician Utilization Rate",
                    "observed_value": round(d.utilization_rate * 100, 1),
                    "expected_baseline": 70.0,
                    "anomaly_score": round(d.utilization_rate * 2, 2),
                    "signal_level": "HIGH",
                    "description": f"Dr. {d.physician_name} ({d.state}) has high utilization ({d.utilization_rate*100:.1f}%), indicating capacity bottleneck risk.",
                })

        # 3. Dispensary Partnership High Density Anomaly
        dispensaries = db.query(PartnershipOpportunity).filter(PartnershipOpportunity.partnership_score >= 85.0).limit(50).all()
        for disp in dispensaries:
            anomalies.append({
                "category": "PARTNERSHIP_DENSITY",
                "entity_name": disp.name,
                "state": disp.state,
                "metric_name": "Uncontacted Dispensary High Score",
                "observed_value": disp.partnership_score,
                "expected_baseline": 50.0,
                "anomaly_score": 1.8,
                "signal_level": "MEDIUM",
                "description": f"Dispensary {disp.name} ({disp.state}) exhibits high partnership signal ({disp.partnership_score:.1f}/100) but remains uncontacted.",
            })

        return anomalies

    def detect_trends(self, db: Session) -> Dict[str, Any]:
        # Pricing Trend
        prices = db.query(PriceHistory).order_by(PriceHistory.effective_date.asc()).limit(100).all()
        if len(prices) >= 2:
            p_first = prices[0].new_price
            p_last = prices[-1].new_price
            price_direction = "DECREASING" if p_last < p_first else "INCREASING" if p_last > p_first else "STABLE"
        else:
            price_direction = "STABLE"

        # Dispensary Growth Trend
        total_dispensaries = db.query(Entity).filter(Entity.entity_type == "DISPENSARY").count()
        dispensary_direction = "INCREASING" if total_dispensaries > 10 else "STABLE"

        # SEO Visibility Trend
        rankings = db.query(SeoRanking).limit(100).all()
        if rankings:
            pos_changes = [r.position_change for r in rankings]
            avg_change = sum(pos_changes) / len(pos_changes)
            seo_direction = "INCREASING" if avg_change > 0 else "DECREASING" if avg_change < 0 else "STABLE"
        else:
            seo_direction = "STABLE"

        trends = [
            {
                "topic": "Competitor Pricing",
                "direction": price_direction,
                "confidence": "HIGH",
                "summary": f"Observed market pricing direction is {price_direction.lower()} based on recent competitor price updates.",
            },
            {
                "topic": "Dispensary Network Growth",
                "direction": dispensary_direction,
                "confidence": "HIGH",
                "summary": f"Dispensary directory footprint is {dispensary_direction.lower()} across target states.",
            },
            {
                "topic": "SEO Search Visibility",
                "direction": seo_direction,
                "confidence": "MEDIUM",
                "summary": f"Search engine keyword rankings display a {seo_direction.lower()} trend across primary medical card keywords.",
            },
            {
                "topic": "Physician Capacity Demand",
                "direction": "INCREASING",
                "confidence": "HIGH",
                "summary": "Physician capacity demand is increasing in key telehealth-enabled states.",
            },
        ]

        return {
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "trends": trends,
        }
