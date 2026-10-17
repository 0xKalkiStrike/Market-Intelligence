# MMJ-DOCS MARKET INTELLIGENCE PLATFORM — PHASE 7 GAP ANALYSIS
**ADVANCED INTELLIGENCE RESEARCH & OPTIMIZATION ENGINE**

**Date:** October 2026  
**Author:** Principal Software Architect, Senior Data Scientist, Market Intelligence Researcher & Optimization Engineer  
**Scope:** Systematic audit of Phases 1–6, codebase baseline verification, gap analysis, data model & analytical architecture design, and implementation roadmap.

---

## 1. Executive Summary & Audit Methodology

Before introducing new code for Phase 7, a rigorous, non-destructive audit of the complete codebase was conducted across:
- **Backend Architecture & APIs**: FastAPI application with 18 active routers, 81 database tables, and 55 domain services.
- **Frontend Architecture**: Next.js 16 with Turbopack, 51 routes, full TypeScript typechecking (`npx tsc --noEmit` cleanly exiting with code 0), and role-aware navigation.
- **Database & Active Data Assets**: SQLite WAL mode with 60s busy timeout, Alembic migrations (`0001_phase5`, `0002_phase6`), and 492,481 entity records (300,670 dispensaries, 191,494 doctors, 317 competitors, 1,076,820 service records, 492,314 verification results, and 12 state market metrics).
- **Test Suite Health**:
  - `test_phase6.py`: 8 passed in 10.01s (100%)
  - `test_phase5.py`: 7 passed in 3.59s (100%)
  - `test_phase4.py`: 11 passed in 3.30s (100%)
  - `test_phase3.py`: 1 passed in 12.13s (100%)
  - `test_market_intelligence.py`: 2 passed in 13.16s (100%)
  - `test_api.py`: 8 passed in 64.57s (100%)
- **Data Compliance Guardrails**: Zero-PHI ingestion filters, public surface-web only (no dark web, no paywall circumvention, no authentication bypass), rate limiting, and HMAC-SHA256 event webhook signing.

All proposed Phase 7 capabilities are classified using the 7 mandated statuses:
1. **Already implemented and verified**: Fully functional, tested, and meeting production requirements.
2. **Partially implemented**: Foundational components exist, but require specific Phase 7 extensions.
3. **Missing**: Not implemented in previous phases; requires new design and implementation.
4. **Requires modification**: Existing component works for previous phases, but must be adapted to integrate cleanly with Phase 7 abstractions.
5. **Requires external credentials**: Functionality depends on external commercial/third-party API keys or sandbox accounts.
6. **Requires a business decision**: Needs management/product alignment on policies, thresholds, or commercial relationships.
7. **Not currently justified**: Over-engineered or unnecessary for the current stage (e.g. distributed PySpark cluster, external paid scraping networks).

---

## 2. Comprehensive Classification of Phase 7 Capabilities

| Capability / Domain | Proposed Scope | Classification | Existing Foundation & Findings | Phase 7 Architectural Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Advanced Market Research Workspace** | Investigation projects, hypothesis testing, geographic/temporal scoping, comparison groups, methodology recording, limitations tracking | **Missing** | Basic `collaboration_findings` and `intelligence_cases` exist in Phase 6 for general team notes. Formal research projects, hypotheses, structured scope, and limitation tracking do not exist. | Create `ResearchProject`, `ResearchHypothesis`, and `ResearchFinding` models with scope definitions, target metrics, and research workspace APIs. |
| **2. Evidence Grounding & Reference Tracking** | Linking findings to internal/public observations, calculation methods, sample sizes, coverage %, confidence, and contradictory evidence | **Partially implemented** | Raw records exist in `raw_records` and `verification_results`. `EvidenceReference` linking findings to exact source records, calculation methods, sample counts, and counter-evidence is missing. | Implement `EvidenceReference` model and `EvidenceGroundingService` maintaining immutable trace links, sample sizes, observation dates, and counter-evidence flags. |
| **3. Research Finding Lifecycle** | 7-stage lifecycle (Draft, Under Investigation, Evidence Reviewed, Validated, Needs Reassessment, Superseded, Rejected), audit trail, reviewer assignment | **Partially implemented** | Case statuses in Phase 6 use `OPEN`, `INVESTIGATING`, `CLOSED`. Research findings require the 7 rigorous lifecycle stages with reviewer identity, reason logging, and automated reassessment triggers. | Implement `ResearchFinding` lifecycle state machine and `ResearchReviewHistory` audit logger. |
| **4. Statistical Analysis Service Layer** | Descriptive statistics, distribution analysis, time-series decomposition, correlation, segment comparison, change-point detection, sensitivity, confidence intervals, sample sufficiency checks | **Partially implemented** | Basic forecasting (`forecasting_service.py`) and anomaly detection (`anomaly_trend_service.py`) exist. Lacks unified statistical service with input validation, correlation matrices, change-point tests, and sample sufficiency reporting. | Build `StatisticalAnalysisService` providing rigorous descriptive stats, Pearson/Spearman correlation, Pettitt change-point detection, and confidence interval estimation with explicit insufficiency guards. |
| **5. Competitive Intelligence Pattern Analysis** | Sustained trend detection vs isolated spikes, initial vs renewal price movements, promo frequency, coverage changes, false-positive dismissal | **Partially implemented** | `competitor_intelligence_service.py` returns raw price history and events. Pattern extraction (e.g. sustained reductions, discount frequency, geographic expansion, false-positive dismissal) does not exist. | Create `CompetitivePatternService` analyzing historical price changes, promotional cadences, geographic entries, distinguishing sustained trends from one-off noise, and supporting analyst dismissal. |
| **6. Multi-Level Geographic Opportunity Engine** | State, county, and ZIP opportunity scoring, component factor attribution, customizable weights, versioned scoring configs, missing data penalties | **Partially implemented** | `opportunity_scoring_service.py` scores states with fixed weights. Multi-level geographic drilldown (county, ZIP), versioned scoring history, factor weight testing, and missing data penalty are missing. | Build `AdvancedGeographicOpportunityService` supporting state, county, and ZIP granularity, scoring version history, factor contribution waterfalls, and alternative weight simulations. |
| **7. Analytical Strategy & Scenario Comparison** | Side-by-side business scenario comparison (State A vs B, price changes, physician coverage, weight tuning), base/best/downside cases, sensitivity matrix, complete production isolation | **Partially implemented** | `scenario_service.py` provides single-point price/expansion simulations. Multi-scenario comparative matrices, best/base/downside projections, sensitivity sweeps, and historical outcome calibration are missing. | Implement `ScenarioComparisonService` allowing users to define baseline vs candidate scenarios, calculate multi-case projections, run sensitivity sweeps, and guarantee zero production mutations. |
| **8. Pricing & Promotion Opportunity Research** | Advertised price comparisons, initial consultation vs renewal price gap, promotion history, non-equivalent service warnings, market gap identification | **Partially implemented** | `PriceHistory` model exists; basic list endpoints in `market_intelligence.py`. Renewal price comparisons, non-equivalent service warnings (e.g. 15-min telehealth vs in-person physical), and pricing gap discovery are missing. | Implement `PricingResearchService` with service equivalence validation, initial vs renewal spreads, promotional cadence metrics, and market gap identification. |
| **9. Evidence-Grounded AI Research Assistant** | AI answering complex questions, querying real database tables and analytical services, citing observation dates and source records, stating uncertainty and contradictions | **Partially implemented** | `ai_intelligence_service.py` provides simple keyword heuristics. Lacks dynamic tool execution against statistical/geographic/competitor services, structured citation generation, and contradiction checks. | Build `EvidenceGroundedAiResearchService` integrating structured database tool execution, strict citation generation, fact vs estimate labeling, and explicit uncertainty detection. |
| **10. Reassessment Triggering on New Ingestion** | Flagging existing validated findings when newly ingested records materially contradict previous conclusions | **Missing** | Collection runs ingest records and update tables, but do not evaluate impact on existing validated research hypotheses or findings. | Implement automated reassessment scanner in `ResearchLifecycleService` that checks new price/competitor records against active validated findings and marks them `NEEDS_REASSESSMENT`. |
| **11. Frontend Research & Optimization Workspace** | Next.js screens for Research Projects, Hypotheses, Evidence Explorer, Pattern Analysis, Geographic Opportunity v2, Scenario Comparison, and AI Research Assistant | **Missing** | Existing frontend has `/dashboard`, `/competitors`, `/scenarios`, `/opportunity-scoring`. Dedicated Research Workspace, Hypothesis Dossier, Pattern Analysis, and Scenario Comparison screens are missing. | Build `/research` (Workspace & Findings Dossier), `/competitive-patterns`, `/geo-opportunity-v2`, `/pricing-research`, and extend `/scenarios` and `/ai-query` with rich, evidence-grounded visualizations. |
| **12. Testing & Validation Suite** | Automated tests for statistical calculations, geographic scoring reproducibility, scenario isolation, lifecycle transitions, AI citations, and data insufficiency | **Missing** | Existing tests cover Phases 1–6. Dedicated Phase 7 test suite validating all new research and optimization capabilities is required. | Build `backend/tests/test_phase7.py` covering all Phase 7 services, database operations, error boundaries, and analytical calculations. |

---

## 3. Architecture & Data Flow

```text
                               +---------------------------------------+
                               |     INTERNAL & PUBLIC DATA ASSETS     |
                               | (492k Entities, Prices, DOH, Reviews) |
                               +-------------------+-------------------+
                                                   |
                                                   v
                         +-------------------------+-------------------------+
                         |                                                   |
                         v                                                   v
           +-------------+-------------+                       +-------------+-------------+
           | Competitive Pattern Engine|                       | Statistical Analysis Layer|
           | - Sustained trend filters |                       | - Descriptive & CI metrics|
           | - Promo frequency metrics |                       | - Correlation & Trends    |
           | - False-positive dismissal|                       | - Change-point detection  |
           +-------------+-------------+                       | - Sample sufficiency guard|
                         |                                     +-------------+-------------+
                         +-------------------------+-------------------------+
                                                   |
                                                   v
                                 +-----------------+-----------------+
                                 | Advanced Geographic Opportunity   |
                                 | - State, County, ZIP Level        |
                                 | - Factor Contribution & Weights   |
                                 | - Versioned Historical Scoring    |
                                 +-----------------+-----------------+
                                                   |
                                                   v
+--------------------------------+-----------------+----------------+--------------------------------+
|                                |                                  |                                |
v                                v                                  v                                v
+----------------+  +------------+------------+     +---------------+---------------+  +--------------+---------------+
| Research       |  | Evidence Grounding     |     | Analytical Scenario Engine    |  | Evidence-Grounded AI Copilot  |
| Workspace      |  | & Provenance Store     |     | - Side-by-Side Comparisons    |  | - Tool-Driven Numeric Queries |
| - Projects     |  | - Real Record IDs      |     | - Base, Best & Downside Proj. |  | - Strict Citation Identifiers |
| - Hypotheses   |  | - Sample Sizes         |     | - Sensitivity Analysis Matrix |  | - Fact vs Estimate Separation |
| - 7 Lifecycles |  | - Counter-Evidence     |     | - 100% Production Isolation   |  | - Uncertainty & Gaps Warning  |
+----------------+  +-------------------------+     +-------------------------------+  +------------------------------+
        |                                                                                             |
        +----------------------------------------------+----------------------------------------------+
                                                       |
                                                       v
                                     +-----------------+-----------------+
                                     |   Governed REST API Platform      |
                                     | (/api/v1/governed/research, etc.) |
                                     +-----------------+-----------------+
                                                       |
                                                       v
                                     +-----------------+-----------------+
                                     | Next.js 16 Executive Console      |
                                     | (/research, /competitive-patterns,|
                                     |  /geo-opportunity-v2, /scenarios) |
                                     +-----------------------------------+
```

---

## 4. Implementation Steps & Milestones

- **Step B (Design)**: Define database models (`ResearchProject`, `ResearchHypothesis`, `ResearchFinding`, `EvidenceReference`, `ResearchReviewHistory`, `ScoringModelVersion`, `GeographicScoreSnapshot`, `ScenarioDefinition`, `AnalyticalRun`) and Alembic migration `0003_phase7_advanced_research_optimization`.
- **Step C (Foundation)**: Implement core services:
  - `ResearchWorkspaceService` (projects, hypotheses, findings, lifecycle transitions, review audits).
  - `EvidenceGroundingService` (provenance tracking, sample size calculation, counter-evidence association).
- **Step D (Analytics Engine)**: Implement:
  - `StatisticalAnalysisService` (descriptive stats, Pearson/Spearman correlations, Pettitt change-point detection, confidence intervals, sample sufficiency checks).
  - `CompetitivePatternService` (sustained trend vs spike detection, discount cadences, false-positive dismissal).
  - `AdvancedGeographicOpportunityService` (state/county/ZIP scoring, factor contribution waterfalls, model versioning, alternative weight simulations).
  - `PricingResearchService` (advertised price comps, initial vs renewal spreads, equivalence warnings, market gap identification).
- **Step E (Scenarios)**: Implement `ScenarioComparisonService` (side-by-side scenarios, base/best/downside simulations, sensitivity analysis, zero production writes).
- **Step F (Evidence-Grounded AI)**: Implement `EvidenceGroundedAiResearchService` (tool execution, structured citations, fact vs estimate labeling, explicit gap disclosure).
- **Step G (Frontend Integration)**: Build Next.js 16 screens:
  - `/research` (Workspace, Hypotheses, Evidence Dossier, Lifecycle Management).
  - `/competitive-patterns` (Sustained Movement Timeline & Dismissal Controls).
  - `/geo-opportunity-v2` (Multi-level Map/Grid, Factor Contributions, Version History).
  - `/pricing-research` (Price gaps, initial vs renewal, promo cadence).
  - `/scenarios` (Enhanced Side-by-Side Comparison & Sensitivity Matrix).
  - `/ai-query` (Enhanced with Evidence Grounding, Citations, and Fact/Estimate Badges).
- **Step H (Validation)**: Create `backend/tests/test_phase7.py` covering all services, APIs, statistical calculations, scenario isolation, lifecycle state machine, and citations. Ensure zero regressions on Phases 1–6.
- **Step I (Documentation)**: Update architectural docs, API governance, user guides, and produce final verification report.
