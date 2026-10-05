# MMJ-DOCS MARKET INTELLIGENCE PLATFORM — PHASE 2 DOCUMENTATION

## Executive Overview
Phase 2 transforms the MMJ-DOCS platform from a foundational data collector into a multi-dimensional **Market Intelligence Engine**. The platform analyzes public surface-web data to reveal competitor movements, state opportunity scores, dispensary partnership pipelines, physician coverage capacity, SEO search visibility, customer review sentiment, regulatory updates, and universal intelligence events.

---

## Key Achievements & Phase 2 Capabilities

### 1. Advanced Surface-Web Intelligence Collection & Source Confidence
- Multi-source discovery across official websites, government portals (e.g. NPI Registry, state DOH databases), business directories (Overpass API / OpenStreetMap), and corporate registries.
- Explicit source confidence tracking (`VERIFIED`, `LIKELY`, `UNVERIFIED`, `STALE`, `CONFLICTING`), collector/parser versions, raw record references, and verification timestamps.
- Zero Dark Web collection, zero authentication or CAPTCHA bypass—strictly compliant surface-web open data collection.

### 2. Flexible Entity Resolution & Duplicate Auditing
- Similarity scoring matching entity names, parent companies, phone numbers, addresses, and domains.
- Automated creation of `DuplicateCandidate` records for manual administrative approval instead of low-confidence automatic merging.

### 3. Competitor Price Intelligence & Historical Records
- Complete price history tracking initial evaluation fees, renewal pricing, promotional discounts, coupons, duration, and same-day/weekend availability.
- Dynamic market pricing metrics: MMJ-DOCS price vs market average, median, lowest, highest, price range, and market percentile.
- Historical trend preserving (`price_history`) with event triggering on pricing changes.

### 4. Explainable State Opportunity Scoring Engine (0–100)
- Configurable 9-factor weighted scoring model:
  1. Patient Population (15%)
  2. Market Growth Rate (10%)
  3. Competitor Density (10%)
  4. Pricing Opportunity (10%)
  5. Dispensary Density (10%)
  6. Physician Coverage (15%)
  7. Telehealth / Regulatory Ease (15%)
  8. SEO Opportunity (10%)
  9. Existing MMJ-DOCS Presence (5%)
- Transparent admin weights configurator with full component breakdown explanation per state.

### 5. Dispensary Partnership Opportunity Engine (CRM)
- Dispensary CRM pipeline tracking partnership statuses (`NOT_CONTACTED`, `CONTACTED`, `FOLLOW_UP_NEEDED`, `INTERESTED`, `MEETING_SCHEDULED`, `PARTNER`, `ACTIVE_REFERRAL`, `INACTIVE`, `NOT_INTERESTED`).
- Partnership opportunity score based on dispensary store count, local patient volume, and proximity to MMJ-DOCS target markets.

### 6. Physician Coverage Intelligence
- Operational tracking of physician licensing status, telehealth eligibility, weekly capacity, and patient volume.
- Automated mismatch signals highlighting `HIGH_DEMAND_LOW_CAPACITY` and `AVAILABLE_CAPACITY` markets.

### 7. Surface-Web SEO & Review Intelligence
- Organic search keyword position tracking comparing MMJ-DOCS rank against competitor positions.
- Public customer review theme classification (`Pricing`, `Scheduling`, `Customer Service`, `Physician Experience`, `Wait Time`, etc.) with sentiment tags.

### 8. Regulatory Intelligence & Universal Events System
- State-by-state regulatory requirement monitoring (telehealth eligibility, renewal frequencies, registration fees).
- High/Critical priority regulatory change logs and universal intelligence events (`events`) with priority alert notifications (`alerts`).

### 9. Grounded AI Market Assistant & Executive Reporting
- Factual AI Query interface (`/api/market-intelligence/ai-query`) answering executive market questions backed by database records and source citations.
- Automated Weekly Executive Intelligence Report (`/executive-report`) compiling top market opportunities, competitor shifts, regulatory updates, and strategic recommendations.

---

## Backend & API Architecture
- **Framework**: FastAPI (Async I/O, OpenAPI docs, Pydantic validation)
- **Database ORM**: SQLAlchemy 2.0 (PostgreSQL / SQLite)
- **Services**:
  - `OpportunityScoringService`
  - `CompetitorPricingService`
  - `PartnershipService`
  - `PhysicianCoverageService`
  - `SeoIntelligenceService`
  - `ReviewIntelligenceService`
  - `RegulatoryIntelligenceService`
  - `EventAlertService`
  - `AiIntelligenceService`
  - `ExecutiveReportService`

---

## Frontend UI Architecture
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Styling**: Vanilla Tailwind CSS, Dark Theme aesthetic with responsive navigation.
- **Routes**:
  - `/dashboard` — Executive Dashboard
  - `/executive-report` — Weekly Executive Intelligence Report
  - `/ai-query` — AI Market Assistant
  - `/opportunity-scoring` — Opportunity Scoring Engine & Admin Weights
  - `/competitors` — Competitive Landscape & Pricing History
  - `/partnerships` — Dispensary Partnership Opportunity CRM
  - `/physicians` — Physician Coverage Intelligence
  - `/seo` — Surface-Web SEO Intelligence
  - `/reviews` — Review Intelligence & Sentiment Themes
  - `/regulatory` — Regulatory Framework & Change Log
  - `/events` — Universal Intelligence Events Timeline
