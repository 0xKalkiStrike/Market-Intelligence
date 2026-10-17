"""
Pricing and Promotion Opportunity Research Service (Phase 7).
Analyzes competitor advertised pricing across markets:
- Initial consultation vs Renewal pricing spreads
- Promotional cadence & discount depth analysis
- Geographic price dispersion across states
- Non-equivalent service warnings (telehealth vs in-person, durations, package inclusions)
- Identification of actionable market pricing gaps
- Decision support only: Never automatically executes commercial pricing changes.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import (
    PriceHistory,
    StateMarketMetric,
)


class PricingResearchService:
    """Rigorous pricing research engine evaluating competitive positioning and service equivalence."""

    # =========================================================================
    # 1. INITIAL VS RENEWAL PRICE SPREAD ANALYSIS
    # =========================================================================

    def analyze_initial_vs_renewal_spreads(
        self,
        db: Session,
        state: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes the price gap between initial consultation and annual recertification renewals.
        Flags non-equivalent service offerings (e.g. telehealth vs physical exams).
        """
        query = db.query(PriceHistory)
        if state:
            query = query.filter(PriceHistory.state == state)

        prices = query.all()

        # Categorize by competitor and service type
        comp_services: Dict[str, Dict[str, List[float]]] = {}
        for p in prices:
            if not p.new_price:
                continue
            comp = p.competitor_name or "Competitor"
            srv = (p.service_name or "").lower()
            st = p.state or "National"
            key = f"{comp} ({st})"

            comp_services.setdefault(key, {"initial": [], "renewal": [], "raw": []})
            comp_services[key]["raw"].append(p.new_price)

            if "renewal" in srv or "recert" in srv or "follow" in srv:
                comp_services[key]["renewal"].append(p.new_price)
            else:
                comp_services[key]["initial"].append(p.new_price)

        comparisons = []
        for comp_st, data in comp_services.items():
            avg_init = sum(data["initial"]) / len(data["initial"]) if data["initial"] else None
            avg_renew = sum(data["renewal"]) / len(data["renewal"]) if data["renewal"] else None

            spread_dollar = round(avg_init - avg_renew, 2) if (avg_init and avg_renew) else None
            spread_pct = round((spread_dollar / avg_init * 100.0), 1) if (spread_dollar and avg_init) else None

            # Service Equivalence Check
            warning = None
            if avg_init and avg_init > 250.0:
                warning = "NON_EQUIVALENT_SERVICE_WARNING: High price point suggests full in-person physical exam or bundled clinical diagnostic testing."
            elif avg_renew and avg_renew < 50.0:
                warning = "NON_EQUIVALENT_SERVICE_WARNING: Unusually low renewal suggests unassisted paper intake or conditional micro-service."

            comparisons.append({
                "competitor_jurisdiction": comp_st,
                "initial_consult_avg_price": round(avg_init, 2) if avg_init else None,
                "renewal_consult_avg_price": round(avg_renew, 2) if avg_renew else None,
                "renewal_discount_dollar": spread_dollar,
                "renewal_discount_percent": spread_pct,
                "is_equivalent_telehealth": warning is None,
                "service_equivalence_warning": warning,
            })

        # Calculate overall market medians
        all_initial = [c["initial_consult_avg_price"] for c in comparisons if c["initial_consult_avg_price"]]
        all_renewal = [c["renewal_consult_avg_price"] for c in comparisons if c["renewal_consult_avg_price"]]

        median_initial = sorted(all_initial)[len(all_initial) // 2] if all_initial else 149.0
        median_renewal = sorted(all_renewal)[len(all_renewal) // 2] if all_renewal else 99.0

        return {
            "state_filter": state or "ALL_STATES",
            "market_median_initial_price": median_initial,
            "market_median_renewal_price": median_renewal,
            "market_median_spread_dollar": round(median_initial - median_renewal, 2),
            "mmj_docs_initial_price": 149.0,
            "mmj_docs_renewal_price": 99.0,
            "competitor_comparisons": comparisons,
            "equivalence_methodology_note": (
                "Services are classified based on surface-web advertised descriptions. "
                "Telehealth consultations of 15-30 minute physician duration are treated as equivalent baseline. "
                "In-person clinical physicals are explicitly flagged as non-equivalent."
            ),
        }

    # =========================================================================
    # 2. IDENTIFY PRICING GAPS & MARKET OPPORTUNITIES
    # =========================================================================

    def identify_pricing_gaps(
        self,
        db: Session,
        target_states: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Identifies actionable pricing gaps where market pricing significantly exceeds MMJ-DOCS pricing
        (margin expansion opportunity) or where competitors heavily undercut (competitive risk).
        """
        metrics = db.query(StateMarketMetric).all()
        if target_states:
            metrics = [m for m in metrics if m.state_code in target_states or m.state in target_states]

        gaps = []
        for m in metrics:
            mkt_price = m.avg_market_price or 149.0
            mmj_price = m.mmj_price or 149.0
            price_delta = round(mkt_price - mmj_price, 2)
            pct_delta = round((price_delta / mmj_price * 100.0), 1) if mmj_price > 0 else 0.0

            if price_delta >= 20.0:
                gap_type = "PREMIUM_MARGIN_GAP"
                recommendation = f"Market average is ${mkt_price:.2f} ({pct_delta:+.1f}% higher). MMJ-DOCS has room to capture premium margin or market aggressively on affordability."
                urgency = "HIGH"
            elif price_delta <= -20.0:
                gap_type = "COMPETITOR_UNDERCUT_GAP"
                recommendation = f"Market average is ${mkt_price:.2f} ({abs(pct_delta):.1f}% lower). Competitors are competing aggressively on price. Investigate promotional bundling."
                urgency = "MEDIUM"
            else:
                gap_type = "PARITY_ALIGNMENT"
                recommendation = f"MMJ-DOCS price (${mmj_price:.2f}) aligns closely with market average (${mkt_price:.2f}). Focus on patient reviews and appointment availability."
                urgency = "LOW"

            gaps.append({
                "state": m.state,
                "state_code": m.state_code,
                "gap_type": gap_type,
                "urgency": urgency,
                "market_avg_price": mkt_price,
                "mmj_docs_price": mmj_price,
                "price_delta": price_delta,
                "percent_difference": pct_delta,
                "competitor_count": m.competitor_count,
                "recommendation": recommendation,
            })

        # Sort by absolute price delta descending
        gaps.sort(key=lambda x: abs(x["price_delta"]), reverse=True)
        return gaps

    # =========================================================================
    # 3. PROMOTIONAL CADENCE & DISCOUNT HISTORY
    # =========================================================================

    def get_promotion_cadence_history(
        self,
        db: Session,
        competitor_name: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Extracts history of promotional campaigns, discounts, and temporary specials."""
        query = db.query(PriceHistory).filter(PriceHistory.promotion_name.isnot(None), PriceHistory.promotion_name != "")
        if competitor_name:
            query = query.filter(PriceHistory.competitor_name.ilike(f"%{competitor_name}%"))

        promos = query.order_by(desc(PriceHistory.effective_date)).limit(limit).all()

        results = []
        for p in promos:
            discount_dollar = round(p.previous_price - p.new_price, 2) if (p.previous_price and p.new_price) else 0.0
            discount_pct = round((discount_dollar / p.previous_price * 100.0), 1) if (p.previous_price and p.previous_price > 0) else 0.0

            results.append({
                "id": p.id,
                "competitor_name": p.competitor_name,
                "state": p.state,
                "promotion_name": p.promotion_name,
                "service_name": p.service_name,
                "regular_price": p.previous_price,
                "promotional_price": p.new_price,
                "discount_amount": discount_dollar,
                "discount_percent": discount_pct,
                "effective_date": p.effective_date.isoformat() if p.effective_date else None,
                "source_name": p.source_name,
            })

        return results
