from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import PriceHistory, IntelligenceEvent

class CompetitorPricingService:
    """Manages competitor pricing intelligence, historical trends, promotions, and market averages."""

    def record_price_change(
        self,
        db: Session,
        competitor_name: str,
        state: str,
        new_price: float,
        previous_price: Optional[float] = None,
        service_name: str = "Initial Consultation",
        promotion_name: Optional[str] = None,
        source_name: str = "Official Website",
        source_url: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> PriceHistory:
        history_entry = PriceHistory(
            entity_id=entity_id,
            competitor_name=competitor_name,
            state=state,
            service_name=service_name,
            previous_price=previous_price,
            new_price=new_price,
            promotion_name=promotion_name,
            confidence="HIGH",
            source_name=source_name,
            source_url=source_url,
            effective_date=datetime.now(timezone.utc),
        )
        db.add(history_entry)

        # Log Intelligence Event if price changed noticeably
        if previous_price and abs(new_price - previous_price) > 0.01:
            diff = new_price - previous_price
            direction = "reduced" if diff < 0 else "increased"
            event_desc = f"{competitor_name} {direction} initial price in {state} from ${previous_price:.2f} to ${new_price:.2f}."
            event = IntelligenceEvent(
                event_type="COMPETITOR_PRICE_CHANGE",
                entity_id=entity_id,
                entity_name=competitor_name,
                entity_type="COMPETITOR",
                state=state,
                description=event_desc,
                previous_value=f"${previous_price:.2f}",
                new_value=f"${new_price:.2f}",
                importance="HIGH" if abs(diff) >= 20 else "MEDIUM",
                source_name=source_name,
                source_url=source_url,
            )
            db.add(event)

        db.commit()
        db.refresh(history_entry)
        return history_entry

    def get_market_pricing_summary(self, db: Session, state: Optional[str] = None) -> Dict[str, Any]:
        query = db.query(PriceHistory)
        if state:
            query = query.filter(PriceHistory.state.ilike(f"%{state}%"))

        history_items = query.order_by(PriceHistory.effective_date.desc()).all()
        prices = [item.new_price for item in history_items]

        mmj_docs_price = 149.0
        if prices:
            prices_sorted = sorted(prices)
            n = len(prices_sorted)
            market_avg = sum(prices_sorted) / n
            market_median = prices_sorted[n // 2] if n % 2 == 1 else (prices_sorted[n // 2 - 1] + prices_sorted[n // 2]) / 2.0
            lowest = prices_sorted[0]
            highest = prices_sorted[-1]
        else:
            market_avg = 139.0
            market_median = 139.0
            lowest = 99.0
            highest = 199.0

        positioning = "Higher than median" if mmj_docs_price > market_median else ("Lower than median" if mmj_docs_price < market_median else "Equal to median")

        history_records = [
            {
                "id": h.id,
                "competitor_name": h.competitor_name,
                "state": h.state,
                "service_name": h.service_name,
                "previous_price": h.previous_price,
                "new_price": h.new_price,
                "promotion_name": h.promotion_name,
                "confidence": h.confidence,
                "source_name": h.source_name,
                "source_url": h.source_url,
                "date": h.effective_date.isoformat() if h.effective_date else None,
            }
            for h in history_items[:30]
        ]

        return {
            "mmj_docs_price": mmj_docs_price,
            "market_avg": round(market_avg, 2),
            "market_median": round(market_median, 2),
            "lowest": round(lowest, 2),
            "highest": round(highest, 2),
            "price_range": f"${lowest:.0f} - ${highest:.0f}",
            "market_position": positioning,
            "pricing_history": history_records,
        }
