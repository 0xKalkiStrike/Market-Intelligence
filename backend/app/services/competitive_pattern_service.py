"""
Competitive Intelligence Pattern Analysis Service (Phase 7).
Analyzes competitor patterns from historical records:
- Sustained price changes vs isolated spikes (initial vs renewal)
- Promotion frequency & discount depth
- Geographic expansion and new market entries
- Distinguishes observed facts from inferred strategic explanations
- False-positive dismissal workflow with audit logging
- Explicit warnings: Advertised prices do not equal realized transaction prices.
"""
import json
from datetime import timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import (
    CompetitivePatternRecord,
    PriceHistory,
    IntelligenceEvent,
    utc_now,
)


class CompetitivePatternService:
    """Detects, categorizes, and validates competitive market patterns across historical observations."""

    # =========================================================================
    # 1. DETECT PATTERNS ACROSS HISTORICAL RECORDS
    # =========================================================================

    def detect_competitor_patterns(
        self,
        db: Session,
        competitor_name: Optional[str] = None,
        state: Optional[str] = None,
        time_horizon_days: int = 90,
    ) -> List[Dict[str, Any]]:
        """
        Analyzes historical PriceHistory and IntelligenceEvent records to synthesize
        evidence-backed competitive patterns, distinguishing sustained movements from isolated noise.
        """
        patterns: List[Dict[str, Any]] = []
        utc_now() - timedelta(days=time_horizon_days)

        # 1. Price Movement Pattern Analysis
        price_query = db.query(PriceHistory)
        if competitor_name:
            price_query = price_query.filter(PriceHistory.competitor_name.ilike(f"%{competitor_name}%"))
        if state:
            price_query = price_query.filter(PriceHistory.state == state)

        price_records = price_query.order_by(PriceHistory.competitor_name, desc(PriceHistory.effective_date)).all()

        # Group prices by (competitor, state, service_name)
        comp_price_groups: Dict[tuple, List[PriceHistory]] = {}
        for p in price_records:
            key = (p.competitor_name, p.state, p.service_name or "Initial Consultation")
            comp_price_groups.setdefault(key, []).append(p)

        for (comp, st, srv), records in comp_price_groups.items():
            if len(records) >= 2:
                latest = records[0]
                earliest = records[-1]
                if latest.new_price and earliest.new_price and latest.new_price != earliest.new_price:
                    pct_change = ((latest.new_price - earliest.new_price) / earliest.new_price) * 100.0
                    is_sustained = len(records) >= 3 or abs(pct_change) > 15.0

                    if pct_change < -5.0:
                        pattern_type = "SUSTAINED_PRICE_DROP" if is_sustained else "ISOLATED_PRICE_PROMO"
                        title = f"{comp}: {'Sustained' if is_sustained else 'Temporary'} Price Reduction in {st}"
                        description = (
                            f"Advertised price for {srv} decreased by {abs(pct_change):.1f}% from "
                            f"${earliest.new_price:.2f} to ${latest.new_price:.2f}. "
                            f"Supported by {len(records)} consecutive historical price snapshots."
                        )
                    else:
                        pattern_type = "PRICE_INCREASE"
                        title = f"{comp}: Price Increase for {srv} in {st}"
                        description = (
                            f"Advertised price increased by {pct_change:.1f}% from "
                            f"${earliest.new_price:.2f} to ${latest.new_price:.2f}."
                        )

                    supporting_ids = [r.id for r in records if r.id]

                    patterns.append({
                        "pattern_type": pattern_type,
                        "competitor_name": comp,
                        "state": st,
                        "title": title,
                        "description": description,
                        "observation_count": len(records),
                        "time_horizon_days": time_horizon_days,
                        "confidence_score": 0.90 if is_sustained else 0.65,
                        "is_sustained": is_sustained,
                        "service_name": srv,
                        "price_change_pct": round(pct_change, 1),
                        "latest_price": latest.new_price,
                        "earliest_price": earliest.new_price,
                        "supporting_record_ids": supporting_ids,
                        "why_it_matters": (
                            "Impacts price competitiveness against MMJ-DOCS standard pricing. "
                            "Note: Advertised public price may differ from realized transaction price."
                        ),
                    })

        # 2. Promotion Surge Pattern Analysis
        promo_records = [p for p in price_records if p.promotion_name and p.promotion_name.strip()]
        promo_by_comp: Dict[str, List[PriceHistory]] = {}
        for pr in promo_records:
            promo_by_comp.setdefault(pr.competitor_name, []).append(pr)

        for comp, promos in promo_by_comp.items():
            if len(promos) >= 2:
                st = promos[0].state or "Multiple"
                patterns.append({
                    "pattern_type": "PROMOTION_SURGE",
                    "competitor_name": comp,
                    "state": st,
                    "title": f"{comp}: Aggressive Promotional Cadence Detected",
                    "description": (
                        f"Detected {len(promos)} distinct promotional offers across monitored dates. "
                        f"Active promotions include: {', '.join(set([p.promotion_name for p in promos[:3]]))}"
                    ),
                    "observation_count": len(promos),
                    "time_horizon_days": time_horizon_days,
                    "confidence_score": 0.85,
                    "is_sustained": len(promos) >= 4,
                    "supporting_record_ids": [p.id for p in promos],
                    "why_it_matters": "Frequent discounting signals competitor focus on customer acquisition or market share defense.",
                })

        # 3. Geographic Expansion Patterns from IntelligenceEvents
        event_query = db.query(IntelligenceEvent).filter(
            IntelligenceEvent.event_type.in_(["COMPETITOR_EXPANSION", "LOCATION_OPENED", "SERVICE_ADDED"])
        )
        if competitor_name:
            event_query = event_query.filter(IntelligenceEvent.entity_name.ilike(f"%{competitor_name}%"))
        if state:
            event_query = event_query.filter(IntelligenceEvent.state == state)

        events = event_query.all()
        for ev in events:
            patterns.append({
                "pattern_type": "GEOGRAPHIC_EXPANSION",
                "competitor_name": ev.entity_name or "Competitor",
                "state": ev.state or "National",
                "title": f"{ev.entity_name}: Geographic Market Entry in {ev.state}",
                "description": ev.description or "New clinic or physical location footprint publicly identified.",
                "observation_count": 1,
                "time_horizon_days": time_horizon_days,
                "confidence_score": 0.88,
                "is_sustained": True,
                "supporting_record_ids": [ev.id],
                "why_it_matters": "Direct physical footprint entry increases local patient convenience and brand visibility.",
            })

        # Sync detected patterns into CompetitivePatternRecord table if not already persisted
        self._sync_persisted_patterns(db, patterns)

        return patterns

    # =========================================================================
    # 2. LIST & FILTER STORED PATTERNS
    # =========================================================================

    def list_patterns(
        self,
        db: Session,
        include_dismissed: bool = False,
        state: Optional[str] = None,
        pattern_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query = db.query(CompetitivePatternRecord)
        if not include_dismissed:
            query = query.filter(not CompetitivePatternRecord.is_dismissed)
        if state:
            query = query.filter(CompetitivePatternRecord.state == state)
        if pattern_type:
            query = query.filter(CompetitivePatternRecord.pattern_type == pattern_type)

        records = query.order_by(desc(CompetitivePatternRecord.detected_at)).limit(limit).all()

        return [
            {
                "id": r.id,
                "pattern_type": r.pattern_type,
                "competitor_name": r.competitor_name,
                "state": r.state,
                "title": r.title,
                "description": r.description,
                "observation_count": r.observation_count,
                "time_horizon_days": r.time_horizon_days,
                "confidence_score": r.confidence_score,
                "is_sustained": r.is_sustained,
                "supporting_records": json.loads(r.supporting_records_json or "[]"),
                "is_dismissed": r.is_dismissed,
                "dismissal_reason": r.dismissal_reason,
                "dismissed_by": r.dismissed_by,
                "dismissed_at": r.dismissed_at.isoformat() if r.dismissed_at else None,
                "detected_at": r.detected_at.isoformat() if r.detected_at else None,
            }
            for r in records
        ]

    # =========================================================================
    # 3. FALSE-POSITIVE DISMISSAL WORKFLOW
    # =========================================================================

    def dismiss_pattern(
        self,
        db: Session,
        pattern_id: str,
        dismissed_by: str,
        reason: str,
    ) -> CompetitivePatternRecord:
        record = db.query(CompetitivePatternRecord).filter(CompetitivePatternRecord.id == pattern_id).first()
        if not record:
            raise ValueError(f"Pattern {pattern_id} not found")

        record.is_dismissed = True
        record.dismissed_by = dismissed_by
        record.dismissal_reason = reason
        record.dismissed_at = utc_now()

        db.commit()
        db.refresh(record)
        return record

    def restore_pattern(self, db: Session, pattern_id: str) -> CompetitivePatternRecord:
        record = db.query(CompetitivePatternRecord).filter(CompetitivePatternRecord.id == pattern_id).first()
        if not record:
            raise ValueError(f"Pattern {pattern_id} not found")

        record.is_dismissed = False
        record.dismissal_reason = None
        record.dismissed_by = None
        record.dismissed_at = None

        db.commit()
        db.refresh(record)
        return record

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _sync_persisted_patterns(self, db: Session, detected: List[Dict[str, Any]]):
        for p in detected:
            existing = db.query(CompetitivePatternRecord).filter(
                CompetitivePatternRecord.competitor_name == p["competitor_name"],
                CompetitivePatternRecord.state == p["state"],
                CompetitivePatternRecord.pattern_type == p["pattern_type"],
                CompetitivePatternRecord.title == p["title"],
            ).first()

            if not existing:
                new_rec = CompetitivePatternRecord(
                    pattern_type=p["pattern_type"],
                    competitor_name=p["competitor_name"],
                    state=p["state"],
                    title=p["title"],
                    description=p["description"],
                    observation_count=p.get("observation_count", 1),
                    time_horizon_days=p.get("time_horizon_days", 30),
                    confidence_score=p.get("confidence_score", 0.8),
                    is_sustained=p.get("is_sustained", True),
                    supporting_records_json=json.dumps(p.get("supporting_record_ids", [])),
                    is_dismissed=False,
                )
                db.add(new_rec)
        db.commit()
