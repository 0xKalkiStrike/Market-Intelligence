# MARKET INTELLIGENCE PLATFORM — INTELLIGENCE ENGINE ARCHITECTURE

## Overview
The Market Intelligence Engine ingests raw surface-web data, standardizes and normalizes entity information, calculates state opportunity scores, evaluates competitor price shifts, monitors dispensary partnership pipelines, tracks physician capacity, extracts review themes, and logs universal intelligence events.

```text
PUBLIC SURFACE-WEB SOURCES
          ↓
SOURCE DISCOVERY ENGINE
          ↓
SURFACE-WEB COLLECTORS
          ↓
RAW DATA STORAGE
          ↓
VALIDATION & NORMALIZATION
          ↓
ENTITY RESOLUTION & DEDUPLICATION
          ↓
HISTORICAL COMPARISON ENGINE
          ↓
CENTRAL DATABASE (CORE & HISTORY)
          ↓
UNIVERSAL INTELLIGENCE EVENTS
          ↓
OPPORTUNITY & CRM SCORING ENGINES
          ↓
ALERT NOTIFICATION ENGINE
          ↓
AI ANALYSIS & EXECUTIVE DASHBOARDS
```

---

## Intelligence Modules

### 1. Opportunity Scoring Engine
- Computes transparent 0–100 opportunity scores per state based on 9 weighted factors.
- Explains *why* the score exists by decomposing component values.

### 2. Competitor Pricing Engine
- Maintains full historical records of initial evaluation prices, renewal prices, promotions, and coupons.
- Calculates dynamic market medians, averages, lowest/highest prices, and market percentiles.

### 3. Dispensary Partnership CRM Engine
- Tracks dispensary chains and independent locations across sales pipeline stages.
- Computes partnership opportunity scores based on store counts, local patient volumes, and distance.

### 4. Physician Coverage Intelligence
- Measures active licensed capacity vs. appointment volumes.
- Highlights operational mismatches (High Demand / Low Capacity vs. Available Capacity).

### 5. Review & Sentiment Intelligence
- Extracts public review themes (`Pricing`, `Scheduling`, `Customer Service`, `Wait Time`, etc.) and tags overall sentiment.

### 6. Regulatory Intelligence Engine
- Tracks state telehealth rules, recertification intervals, and registration fees.
- Issues `CRITICAL` or `HIGH` priority alerts upon detected regulatory amendments.
