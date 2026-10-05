# MMJ-DOCS MARKET INTELLIGENCE PLATFORM — PHASE 3
## AI INTELLIGENCE, PREDICTIVE ANALYTICS & DECISION-SUPPORT ENGINE

---

### STEP 1 & 2: INSPECTION OF PHASE 1 & PHASE 2 FOUNDATIONS
- **Phase 1 Foundation**: Central database schema (`User`, `Role`, `Permission`, `Project`, `DataSource`, `CollectionRun`, `RawRecord`, `Entity`, `EntityLocation`, `EntityContact`, `EntityService`, `DoctorDetail`, `DispensaryDetail`, `CompetitorDetail`, `EntitySourceLink`, `VerificationResult`, `DuplicateCandidate`, `CollectionError`), deduplication service, cleaning service, base collectors (`ProviderDirectoryCollector`, `BusinessDirectoryCollector`, `WebsiteCollector`, `GovernmentRegistryCollector`, `GenericSurfaceWebCollector`), and live scraping engine (`leads.py`).
- **Phase 2 Intelligence**: `PriceHistory`, `OpportunityScoreConfig`, `StateMarketMetric`, `PartnershipOpportunity`, `PhysicianCoverage`, `SeoKeyword`, `SeoRanking`, `ReviewIntelligence`, `ReviewTheme`, `RegulatoryRequirement`, `RegulatoryChange`, `IntelligenceEvent`, `AlertConfig`, `AlertNotification`, `SourceDiscovery`, and specialized services (`CompetitorPricingService`, `OpportunityScoringService`, `PartnershipService`, `PhysicianCoverageService`, `SeoIntelligenceService`, `ReviewIntelligenceService`, `RegulatoryIntelligenceService`, `EventAlertService`).

---

### STEP 3: PHASE 3 GAP ANALYSIS

| Feature / Module | Status | Required Change | Target Layer |
|---|---|---|---|
| **AI Market Assistant** | Needs Extension | Convert natural language to query, grounding, confidence scoring, limitation notes | Service / API / UI |
| **Natural Language Query Engine** | Needs New Module | Intent parser, safe NL->SQL planner, allowlisted execution, entity/date extraction | Service / Core |
| **Automated Market Analysis Engine** | Needs New Module | Comprehensive automated state & market health narrative generation | Service |
| **Competitive Intelligence & Movement** | Needs Extension | Expansion, pricing, service, promotion, SEO, review movement detection timeline | Service / API |
| **Advanced Opportunity Engine** | Needs Extension | Score breakdown explanation, multi-signal cross-scanning | Service |
| **Anomaly Detection Engine** | Needs New Module | Statistical variance detection on pricing, volume, utilization, ratings | Service / Worker |
| **Trend Detection Engine** | Needs New Module | Directional classification (`Increasing`, `Decreasing`, `Stable`, `Volatile`) over W/M/Q/Y | Service / Worker |
| **"What Changed?" Universal Engine** | Needs New Module | Period-over-period comparison engine (`Today`, `Week`, `Month`, `Quarter`, `Year`) | Service / API |
| **Executive Intelligence Reports** | Needs Extension | Full multi-section executive reports in Markdown + JSON with factual separation | Service / API / UI |
| **Automated Briefings** | Needs New Module | Daily Intelligence Briefing & Weekly Executive Brief generation | Service / Worker |
| **Cross-Source Intelligence Fusion** | Needs New Module | Combine website, government, map, reviews, SEO signals into `CONFIRMED`/`LIKELY`/`POSSIBLE` | Service |
| **Historical Intelligence & Timeline** | Needs New Module | Point-in-time snapshots (`MarketSnapshot`) and historical state comparisons | Database / Service |
| **Scenario Analysis Framework** | Needs New Module | Simulation engine for Price Changes and State Expansion with explicit assumptions | Service / API / UI |
| **Explainable AI & Grounding** | Needs New Module | Grounding validator, line-by-line evidence mapping, confidence framework | Service / Core |
| **AI Alert Summaries** | Needs Extension | Contextual alerts with historical trend background and priority | Service |
| **Management Question Engine** | Needs New Module | Predefined strategic queries across 7 business domains | Service / API / UI |
| **Intelligence Knowledge Layer** | Needs New Module | Structured intelligence objects (`MarketEvent`, `CompetitorChange`, `PriceChange`, etc.) | Database / Service |
| **Advanced Geographic Analytics & Heatmap** | Needs Extension | GIS density calculations and multi-layer interactive opportunity heatmap | Service / Frontend |
| **AI Admin & Observability Panel** | Needs New Module | Multi-LLM provider config, prompt templates, cost logging, quality benchmark evaluator | DB / Service / API / UI |
| **Internal Workload Orchestration** | Needs Extension | Async AI worker queue (`WorkloadTask`), priority scheduling, retry & concurrency limits | Core / Worker |

---

### STEP 4: PHASE 3 ARCHITECTURE

```text
                                  USER INTERFACE (Next.js 15 App Router)
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
       AI MARKET ASSISTANT              NATURAL LANGUAGE QUERY            EXECUTIVE REPORTS & BRIEFINGS
       (Interactive Chat +             (NL->Query Planner,                (Daily Briefs, Weekly Reports,
        Source Grounding)              Visualization Selection)            Markdown Export, Snapshots)
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                                       FASTAPI API ROUTER LAYER
                                                  │
                                                  ▼
                                      INTELLIGENCE SERVICE LAYER
    ┌──────────────────────┬──────────────────────┼──────────────────────┬──────────────────────┐
    │                      │                      │                      │                      │
    ▼                      ▼                      ▼                      ▼                      ▼
NL QUERY PLANNER    ANOMALY & TREND         WHAT-CHANGED           SCENARIO ENGINE        CROSS-SOURCE FUSION
& EXECUTION         DETECTION ENGINE        COMPARISON             (Price / Expansion)    (Signal Aggregator)
    │                      │                      │                      │                      │
    └──────────────────────┴──────────────────────┼──────────────────────┴──────────────────────┘
                                                  │
                                                  ▼
                                     INTELLIGENCE KNOWLEDGE LAYER
                             (Structured Intelligence Objects & Context)
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 │                                                                 │
                 ▼                                                                 ▼
      AI PROVIDER ABSTRACTION                                            INTERNAL WORKLOAD ORCHESTRATOR
(OpenAI / Anthropic / Gemini / Local / Mock)                             (Task Queue, Worker Pool, Priority, Retry)
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  │
                                                  ▼
                                       CENTRAL DATABASE (SQLite / Postgres)
                     (Entities, History, Events, Metrics, Snapshots, Scenarios, Audit)
```

---

### STEP 5: DATABASE MIGRATION PLAN
New Tables Added to `app.database.models`:
1. `ai_provider_configs`: Manage LLM providers, model selection, token limits, and costs.
2. `ai_audit_logs`: Audit trail for questions, generated queries, latency, tokens, and confidence.
3. `intelligence_knowledge_objects`: Intermediate structured intelligence objects for LLM context.
4. `market_snapshots`: Historical point-in-time state snapshots for comparison.
5. `scenario_simulations`: Saved what-if scenario simulations with inputs and assumptions.
6. `ai_evaluation_items`: Benchmark evaluation dataset measuring groundedness and hallucination rate.
7. `workload_tasks`: Internal workload orchestration queue for async AI jobs.

---

### STEP 6: AI ARCHITECTURE
1. **Model Abstraction (`AiProviderAdapter`)**: Abstract interface supporting OpenAI, Anthropic, Gemini, Local models, and a deterministic fall-back Mock Engine when no external LLM API key is set.
2. **NL Query Engine (`NlQueryEngine`)**: Natural language parser using safe AST/pattern-matching SQL planner with strict table/column allowlisting.
3. **Grounding Validator (`GroundingValidator`)**: Inspects generated response text to guarantee every numerical figure or event claim is explicitly present in retrieved data records.
4. **Knowledge Layer (`KnowledgeLayerService`)**: Transforms raw database rows into rich `IntelligenceObject` representations before injecting into context.
5. **Quality Evaluation (`AiQualityEvaluator`)**: Automated evaluation suite verifying accuracy, groundedness, latency, and hallucination rate against benchmark ground-truth queries.

---

### STEP 7: IMPLEMENTATION PLAN & ORDER
- **Phase 3.1**: Database Schema Extension & Models (`models.py`)
- **Phase 3.2**: AI Provider Abstraction & Config Engine (`ai_provider_service.py`)
- **Phase 3.3**: Intelligence Knowledge Layer Service (`knowledge_layer_service.py`)
- **Phase 3.4**: Natural Language Query Engine (`nl_query_engine.py`)
- **Phase 3.5**: Grounded AI Assistant Service (`ai_assistant_service.py`)
- **Phase 3.6**: What-Changed & Market Comparison Engine (`what_changed_service.py`)
- **Phase 3.7**: Anomaly & Trend Detection Engine (`anomaly_trend_service.py`)
- **Phase 3.8**: Cross-Source Intelligence Fusion Service (`cross_source_service.py`)
- **Phase 3.9**: Advanced Opportunity & Score Explanation Service (`advanced_opportunity_service.py`)
- **Phase 3.10**: Competitor Intelligence & Movement Timeline (`competitor_intelligence_service.py`)
- **Phase 3.11**: Scenario Analysis Engine (`scenario_service.py`)
- **Phase 3.12**: Executive Report & Automated Briefings Service (`executive_report_v3_service.py`)
- **Phase 3.13**: Internal Workload Orchestrator for AI Jobs (`ai_workload_orchestrator.py`)
- **Phase 3.14**: AI Evaluation Framework & Quality Benchmark (`ai_eval_service.py`)
- **Phase 3.15**: FastAPI API Endpoints ([`api/market_intelligence.py`](file:///c:/hacker/Market-Intelligence/backend/app/api/market_intelligence.py))
- **Phase 3.16**: Frontend UI Components & Pages (AI Assistant, What-Changed, Scenarios, Heatmap, Admin Control Panel, Reports)
- **Phase 3.17**: Automated Unit & End-to-End Tests (`tests/test_phase3.py`)
- **Phase 3.18**: Verification & Demonstration
