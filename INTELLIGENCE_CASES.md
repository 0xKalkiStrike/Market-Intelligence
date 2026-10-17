# Intelligence Case Management Lifecycle

**Service Layer**: `app/services/case_management_service.py`  
**Core Model**: `IntelligenceCase`  
**Objective**: Structured Investigation and Executive Decision-Making for Major Market Shifts

---

## 1. Overview

While everyday market movements are monitored continuously via watchlists and alerts, significant strategic shifts require a formal, auditable workflow. Intelligence Case Management provides an investigation lifecycle connecting an initial raw signal to a documented executive decision.

```text
    +-----------------------------------------------+
    | Intelligence Signal / Anomaly Detected        |
    +-----------------------+-----------------------+
                            |
                            v
    +-----------------------------------------------+
    | 1. CASE OPENED (OPEN)                         |
    |    - Category, severity, and hypothesis logged|
    +-----------------------+-----------------------+
                            |
                            v
    +-----------------------------------------------+
    | 2. INVESTIGATION (INVESTIGATING)              |
    |    - Lead assigned, evidence attached         |
    |    - Field pricing checks, license validation |
    +-----------------------+-----------------------+
                            |
                            v
    +-----------------------------------------------+
    | 3. EXECUTIVE REVIEW (REVIEW)                  |
    |    - Findings summarized                      |
    |    - Strategic options evaluated              |
    +-----------------------+-----------------------+
                            |
                            v
    +-----------------------------------------------+
    | 4. MANAGEMENT DECISION (DECIDED)              |
    |    - Executive decision recorded              |
    |    - Price adjustment / Expansion approved    |
    +-----------------------+-----------------------+
                            |
                            v
    +-----------------------------------------------+
    | 5. OUTCOME AUDIT (CLOSED)                     |
    |    - Measurable business outcome captured     |
    |    - Case archived for historical reference   |
    +-----------------------------------------------+
```

---

## 2. Seven Market Event Categories

Every investigation case belongs to one of seven validated categories:

| Category Code | Strategic Trigger | Typical Evidence Attached |
| :--- | :--- | :--- |
| `COMPETITOR_MOVEMENT` | Aggressive competitor expansion or acquisition | Scraped clinic locations, press releases, state filings |
| `PRICING_CHANGE` | Price war, widespread discounting, promotional surge | Historical pricing logs, screenshot captures, coupon codes |
| `REGULATORY_REVIEW` | Rule modification, telehealth expiration, petition approval | State DOH notices, legislative docket PDFs, statute changes |
| `GEOGRAPHIC_OPPORTUNITY`| Underserved county with high patient demand / low clinic density | Geospatial grid scores, demographic growth, physician capacity |
| `PARTNERSHIP_OPPORTUNITY`| Key dispensary partner agreement or MSO alliance | Location footprints, patient referral aggregates, contract terms |
| `DATA_QUALITY_INCIDENT` | Disagreeing registry records, stale connector data | Source payload diffs, audit trail entries, provider errors |
| `FORECAST_DEVIATION` | Actual monthly volume deviates >20% from model projection | Time-series metrics, variance graphs, external macro factors |

---

## 3. Case Lifecycle Management Endpoints

| Endpoint | Method | Scope | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/governed/cases` | POST | `intelligence:read` | Create a new market investigation case |
| `/api/v1/governed/cases` | GET | `intelligence:read` | Filter cases by category, status, and severity |
| `/api/v1/governed/cases/{id}` | GET | `intelligence:read` | Retrieve complete case record, evidence, and notes |
| `/api/v1/governed/cases/{id}/status` | PATCH | `intelligence:read` | Progress case status (`INVESTIGATING`, `REVIEW`) |
| `/api/v1/governed/cases/{id}/decision` | POST | `system:manage` | Record management decision and target outcome |

### Recording a Decision Example
```json
{
  "decision": "Approved $139 promotional match in Orlando market for 60 days.",
  "outcome": "Preserved 92% renewal retention rate against competitor campaign.",
  "status": "DECIDED"
}
```
All decisions permanently bind the executive user ID, timestamp, and decision rationale to the platform audit log.
