# MMJ-DOCS Market Intelligence Platform — AI Governance & Quality Assurance
# Document: AI_GOVERNANCE.md | Phase 5 Production Readiness

## 1. AI Governance Architecture

The AI Intelligence layer enables natural-language querying, competitive synthesis, and executive briefing across complex datasets. AI governance ([`backend/app/services/ai_governance_service.py`](file:///c:/hacker/Market-Intelligence/backend/app/services/ai_governance_service.py)) enforces:
- **Strict Evidence Grounding**: The AI cannot invent facts or extrapolate beyond verified database records.
- **Access Control & Data Segregation**: Grounding queries respect user RBAC permissions; proprietary internal business metrics are redacted.
- **Zero PHI Enforcement**: Automated sanitization rejects inbound queries or records containing clinical indicators.
- **Token & Cost Caps**: Enforces configurable daily budget ceilings ($50.00/day) with circuit breakers.
- **Continuous Regression Testing**: Fixed benchmark suite evaluating accuracy, source preservation, and uncertainty communication.

```text
       +---------------------------------------------+
       |           User Natural Language Query       |
       +----------------------+----------------------+
                              |
               +--------------v--------------+
               |  Inbound Query Safety Guard |
               |  - Scan for Clinical PHI    | ----> [ Rejection HTTP 400 ]
               |  - Scan for Internal Bypass |
               +--------------+--------------+
                              |
               +--------------v--------------+
               | Context Grounding Engine    |
               | - Filter by User RBAC       |
               | - Retrieve Provenance URLs  |
               +--------------+--------------+
                              |
               +--------------v--------------+
               | Daily Cost & Token Governor |
               | - Check $50.00 Daily Budget | ----> [ Throttle / Circuit Open ]
               +--------------+--------------+
                              |
               +--------------v--------------+
               | LLM Inference (GPT-4o)      |
               | - Strict System Prompt      |
               | - Temperature: 0.1          |
               +--------------+--------------+
                              |
               +--------------v--------------+
               | Outbound Response Validator |
               | - Verify Citations & IDs    |
               | - Detect Hallucinations     |
               +-----------------------------+
```

---

## 2. Inbound Query Safety & Anti-PHI Guardrails

The AI platform enforces clinical data minimization. Inbound prompts are parsed prior to embedding or LLM dispatch:
1. **Clinical PHI Markers**: Keywords or regex patterns matching patient medical record numbers, prescription dosage notes, patient diagnoses, or clinical certifications trigger immediate rejection:
   ```json
   {
     "error": {
       "code": "QUERY_REJECTED_PHI_DETECTED",
       "message": "Query contains clinical or patient health indicators. The platform processes public market intelligence only."
     }
   }
   ```
2. **Proprietary Business Metric Redaction**: Unless the user possesses the `view_internal_metrics` permission, prompts asking for internal clinician payout rates, profit margins, or appointment conversion figures receive sanitized public competitor datasets only.

---

## 3. Cost Governance & Budget Thresholds

AI operations track per-request token usage and estimated USD spend:

| Metric | Staging Threshold | Production Threshold | Action on Breach |
|---|---|---|---|
| **Daily Spend Limit** | $25.00 USD / day | $50.00 USD / day | Throttles non-essential queries; alerts admin |
| **Max Context Window** | 16,000 tokens | 32,000 tokens | Truncates low-relevance background context |
| **Max Output Tokens** | 2,000 tokens | 4,000 tokens | Enforces concise executive synthesis |
| **Request Timeout** | 15.0 seconds | 25.0 seconds | Triggers circuit breaker fallback |

### Real-Time Budget Inspection
```bash
curl -s http://localhost:8000/api/operations/summary | jq .ai_governance
```

---

## 4. The Executive Core 6 Regression Benchmark Suite

To prevent model drift and prompt regressions, the platform maintains a fixed suite of six business-critical queries:

1. **Q1 — Competitor Pricing Shifts**:
   > *"Which competitors changed pricing this month?"*
   - Validates that historical price change records are correctly filtered by date and competitor ID.
2. **Q2 — Florida Weekly Regulatory & Market Updates**:
   > *"What changed in Florida this week?"*
   - Validates multi-source synthesis between OMMU weekly updates and dispensary license additions.
3. **Q3 — Multi-State Opportunity Prioritization**:
   > *"Which states have the strongest opportunity signals?"*
   - Validates scoring algorithm explanation and numeric consistency with backend opportunity rankings.
4. **Q4 — Dispensary Partnership Outreach Gaps**:
   > *"Which dispensaries have never been contacted?"*
   - Validates CRM relationship queries and prevents confusion between public dispensaries and CRM partners.
5. **Q5 — Pending Regulatory Reviews**:
   > *"Which regulatory changes require review?"*
   - Validates filtering of `UNVERIFIED` regulatory rules and compliance tags.
6. **Q6 — Opportunity Score Attribution**:
   > *"Why did a state opportunity score change?"*
   - Validates explanatory attribution without inventing nonexistent market events.

### Benchmark Evaluation Criteria (0–100% Score)
Each benchmark response is programmatically validated against 7 criteria:
- **Record Accuracy**: Did the answer use verified records from the database?
- **Permission Boundary**: Were restricted fields withheld from unprivileged contexts?
- **Source Preservation**: Did the response cite source URLs and timestamps?
- **Numeric Precision**: Were calculated price averages and counts mathematically exact?
- **Staleness Flagging**: Were records older than 90 days explicitly identified as stale?
- **Uncertainty Communication**: Did the model state "no verified data available" instead of guessing?
- **Zero Hallucination**: Were all mentioned entities confirmed to exist in the database?

### Executing Benchmark Regression Runs
```bash
# Execute full benchmark suite via API
curl -X POST http://localhost:8000/api/operations/ai-benchmarks/run \
  -H "Content-Type: application/json"

# Retrieve historical benchmark performance records
curl -s http://localhost:8000/api/operations/ai-benchmarks/history | jq .
```
- **Promotion Gate**: No new prompt version or LLM model upgrade may be deployed to production if the overall benchmark score falls below **85%**.
