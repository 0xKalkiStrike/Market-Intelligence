# MARKET OPPORTUNITY SCORING MODEL

## Weighted Score Formula
The State Opportunity Score (0–100) is calculated using the following default weights:

| Parameter | Default Weight | Factor Description |
| :--- | :---: | :--- |
| **Patient Population** | 15% | Total active medical marijuana cardholders in state |
| **Market Growth** | 10% | Annual patient population / market growth rate |
| **Competitor Density** | 10% | Inverse score (fewer competitors = higher score) |
| **Pricing Opportunity** | 10% | Differential between market average price & MMJ-DOCS price |
| **Dispensary Density** | 10% | Number of dispensary locations available for partnership |
| **Physician Coverage** | 15% | Physician capacity & demand mismatch potential |
| **Regulatory Ease** | 15% | Telehealth eligibility & low administrative friction |
| **SEO Opportunity** | 10% | Organic keyword ranking potential for target terms |
| **Existing MMJ Presence** | 5% | Operational foundation and brand awareness |

---

## Admin Configuration & Overrides
- Authorized admins can dynamically adjust parameter weights via `/api/market-intelligence/opportunity-scoring/config`.
- All scores are dynamically recomputed without hardcoding.
- Every state opportunity score output provides an explicit breakdown array showing exact score contributions and explanations.
