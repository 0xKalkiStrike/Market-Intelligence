# MMJ-DOCS MARKET INTELLIGENCE PLATFORM — PHASE 6 GAP ANALYSIS
**ENTERPRISE INTEGRATIONS, PLATFORM EXTENSIBILITY & INTELLIGENCE COLLABORATION**

**Date:** October 2026  
**Auditor:** Principal Enterprise Integration Architect & Full-Stack Systems Lead  
**Scope:** In-depth audit of codebase (Phases 1–5), verification of existing capabilities, classification of proposed Phase 6 features, and implementation roadmap.

---

## 1. Executive Summary & Audit Methodology

Before introducing new code for Phase 6, a rigorous, non-destructive audit of the complete codebase was conducted across:
- **Backend Architecture & APIs**: FastAPI application with 17 active routers, 70 database models, and 44 domain services.
- **Frontend Architecture**: Next.js 16 with Turbopack, 50 pre-rendered/dynamic routes, TypeScript validation, and role-aware navigation.
- **Database & Migrations**: SQLite WAL mode with 60s busy timeout, Alembic migration state (`0001_phase5_enterprise_schema`), and dynamic startup migrations.
- **Authentication & RBAC**: OAuth2 JWT authentication, 7 enterprise roles, 19 granular permissions, least-privilege backend enforcement, and internal data sanitization.
- **External Connectors & Ingestion**: 8 registered enterprise connectors (`npi_registry`, `openstreetmap_overpass`, `state_doh_portals`, `openai_llm`, `anthropic_llm`, `gemini_llm`, `surface_business_directory`, `internal_mmj_docs_core`).
- **Data Governance & Reliability**: Thread-safe circuit breaker registry, application-level priority queue orchestrator, dead-letter queue, 12-factor data quality scanner, manual audit trail, and backup recovery harness.

All proposed Phase 6 capabilities are classified using the 7 mandated statuses:
1. **Already implemented and verified**: Fully functional, tested, and meeting production requirements.
2. **Partially implemented**: Foundational components exist, but require specific Phase 6 extensions.
3. **Missing**: Not implemented in previous phases; requires new design and implementation.
4. **Requires modification**: Existing component works for previous phases, but must be adapted to integrate cleanly with Phase 6 abstractions.
5. **Requires external credentials**: Functionality depends on external commercial/third-party API keys or sandbox accounts.
6. **Requires a business decision**: Needs management/product alignment on policies, thresholds, or commercial relationships.
7. **Not currently justified**: Over-engineered or unnecessary for the current stage (e.g. public app marketplace, Kafka cluster).

---

## 2. Comprehensive Classification of Phase 6 Features

| Feature / Domain | Proposed Scope | Classification | Existing Foundation & Findings | Phase 6 Architectural Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Enterprise Integration Framework** | Reusable adapter interface, auth checks, input validation, normalization, entity resolution, business rules, central DB, events | **Partially implemented** | Surface-web collectors exist in `collection_service.py`; circuit breakers exist in `circuit_breaker.py`. Universal adapter interface and lifecycle contract are missing. | Create `app/integrations/adapter.py` defining `BaseIntegrationAdapter` with uniform hooks for auth, validation, normalization, entity resolution, and event dispatch. |
| **2. Integration Registry** | Central metadata registry recording name, provider, type, sync frequency, permissions, rate limits, connection health | **Partially implemented** | `IntegrationConnectorStatus` table exists in DB with 8 connectors and probe capability. Lacks sync schedules, data entities, enabled toggle, and adapter linking. | Extend `integration_connector_statuses` and `IntegrationManagementService` with configurable sync frequency, supported entities, enabled/disabled state, and live sync verification. |
| **3. MMJ-DOCS Internal System Integration** | Secure ingestion of appointment aggregates, revenue aggregates, physician capacity, referral sources without PHI | **Partially implemented** | Model exists in `integration_connector_statuses` (`internal_mmj_docs_core`); `sanitize_internal_business_data` protects internal fields. Incremental sync engine and checkpointing missing. | Build `InternalMmjDocsAdapter` with aggregate validation, checkpoint tracking, idempotency, and strict PHI exclusion filters. |
| **4. Governed API Platform** | Documented, permission-aware API endpoints for intelligence, competitors, pricing, dispensaries, geo, regulatory, etc. | **Partially implemented** | Comprehensive endpoints exist in `market_intelligence.py` and `phase4.py`. Lacks unified `/api/v1/governed` prefix, OpenAPI grouping, and standardized pagination/filtering contracts. | Build unified Governed API router (`app/api/governed.py`) enforcing RBAC scopes, standard pagination (`page`, `page_size`), filtering, and audit logging. |
| **5. API Keys & Service Accounts** | Programmatic access for external systems, hashed storage, scopes, expiration, rotation, rate limits | **Missing** | User authentication currently uses JWT tokens (`OAuth2PasswordBearer`). No programmatic service accounts or API keys table exists. | Create `ApiKey` / `ServiceAccount` database model, key generation with SHA256 hashed secret storage, prefix display (`mmj_live_...`), scope enforcement, and usage counters. |
| **6. Webhook Framework** | Outbound webhooks for platform events (`competitor.price_changed`, `market.opportunity_detected`, etc.), HMAC signing, retries | **Missing** | Inbound events are stored in `intelligence_events`, but outbound webhook dispatch, subscription registry, HMAC-SHA256 signature, and delivery logging do not exist. | Create `WebhookSubscription` and `WebhookDeliveryLog` models, signature generator (`X-MMJ-Signature-256`), SSRF URL validation, retry worker, and redelivery controls. |
| **7. Event-Driven Integration** | Decoupled event-dispatch layer connecting pricing, alerts, AI summaries, and webhooks | **Partially implemented** | `IntelligenceEvent` exists; `EventAlertService` logs events and generates notifications. Needs decoupled pub/sub event dispatcher to notify adapters, webhooks, and audit logs. | Implement `EventDispatcher` service that coordinates synchronous and background subscriber dispatch with idempotency. |
| **8. Data Import Center** | Controlled multi-format (CSV, XLSX, JSON) import with validation, preview, column mapping, duplicate detection | **Partially implemented** | Simple Excel product upload exists in `products/router.py`. Lacks multi-entity mapping, preview, validation report, and duplicate pre-screening. | Build universal `DataImportService` and `/api/import` endpoints supporting preview, mapping, batch validation, error reporting, and entity insertion. |
| **9. Data Export Center** | Controlled, permission-checked export (CSV, Excel, JSON) with entity/field/state filters, saved configs, export history | **Partially implemented** | Basic export endpoints (`/api/market-intelligence/export?format=csv`) exist. Lacks field selection, saved templates, export job history, and internal data redaction. | Create `ExportConfiguration` / `ExportJob` models and `DataExportService` with granular column filtering, permission-aware redaction, and background processing. |
| **10. Cross-System Entity Resolution** | Multi-signal matching (domain, public license, address, phone, name similarity), canonical IDs, confidence score, human review | **Partially implemented** | `DeduplicationService` computes name/phone/website similarity and stores in `duplicate_candidates`. Lacks license number matching, canonical cross-system links, and confidence reasons. | Enhance `DeduplicationService` and add `CrossSystemEntityResolver` with weighted multi-signal matching, canonical mapping, and review queue integration. |
| **11. Data Synchronization & Conflict Resolution** | Incremental sync, checkpoints, conflict detection, source authority weighting, evidence preservation | **Partially implemented** | Raw records and verifications are stored. Explicit multi-source conflict resolution rules, authority weighting, and manual resolution queue are missing. | Create `DataConflict` model and `ConflictResolutionService` implementing source precedence rules, side-by-side evidence preservation, and analyst resolution workflow. |
| **12. Collaboration Workspace** | Saved findings, internal notes, reviewer assignment, follow-up ownership, management decisions, audit history | **Partially implemented** | `ManagementReviewItem` and `HumanApproval` exist for workflows. Dedicated collaboration notes and team finding assignments are missing. | Create `CollaborationFinding` and `IntelligenceNote` models with reviewer assignment, status tracking, and strict separation between private notes and public data. |
| **13. Shared Watchlists** | Personal, team, competitor, state, and regulatory watchlists with role-aware sharing and audit logging | **Partially implemented** | `Watchlist` and `WatchlistItem` exist with categories. Lacks sharing flags (`is_shared`, `team_id`), permissions, and activity audit logging. | Update `Watchlist` model with sharing scopes (`PERSONAL`, `TEAM`, `PUBLIC`), access checks, and collaboration endpoints. |
| **14. Intelligence Case Management** | End-to-end case lifecycle from signal to investigation, reviewer assignment, management decision, and outcome | **Partially implemented** | `ManagementReviewItem` handles workflow gates. Complete investigative case management with evidence attachment and post-decision outcome tracking is missing. | Implement `IntelligenceCase` model and `CaseManagementService` covering the 7 business categories with evidence dossiers and audit trails. |
| **15. Report Distribution** | Multi-channel distribution (in-app, email stub, webhooks, scheduled exports) with recipient authorization | **Partially implemented** | In-app executive reports exist in `executive_report_v3_service.py`. Distribution lists, delivery tracking, and scheduled broadcast engine are missing. | Implement `ReportDistributionService` with recipient permission validation, scheduled distribution records, and delivery history. |
| **16. Intelligence Module Extensibility** | Standard module registry declaring metadata, inputs, outputs, permissions, health, and routes | **Missing** | Services exist independently without a formal module registration contract. | Build `ModuleRegistry` declaring module manifests (name, version, permissions, dependencies, health check) and dynamic status querying. |
| **17. Reusable Intelligence Service Layer** | Clean decoupling of business logic from individual routes and UI screens | **Already implemented and verified** | 44 modular domain services exist in `backend/app/services/` (e.g. `CompetitorIntelligenceService`, `ForecastingService`, `AnalyticsService`). | Verify all new Phase 6 endpoints consume services uniformly without duplicating logic. |
| **18. AI Integration Boundaries** | Guarded AI tool execution, read-only defaults, token/cost limits, input/output validation, prompt safety | **Already implemented and verified** | `AiGovernanceService`, `AiCostManagementService`, and Executive Core 6 benchmark suite are active and tested. | Expose read-only integration tools to AI assistant while enforcing human approval gates for external mutations. |
| **19. Integration Security (SSRF & Auth)** | Safe URL validator, private IP blocking, token protection, rate limiting | **Already implemented and verified** | `validate_safe_url`, `RateLimitMiddleware`, and RBAC `require_permission` are active and tested in Phase 5. | Re-use `validate_safe_url` for webhook destinations and connector endpoints. |
| **20. Observability & Monitoring** | Detailed job metrics, Prometheus metrics, circuit breaker states, health probes | **Already implemented and verified** | `/api/health`, `/api/health/ready`, `/api/metrics`, `/api/observability/summary` are fully operational. | Add Phase 6 metrics (webhook delivery count, integration sync count, conflict count) to the observability collector. |
| **21. External Production Credentials** | Live API keys for commercial providers (e.g., live CRM, paid scraper APIs) | **Requires external credentials** | Public CMS NPI and OpenStreetMap Overpass work without auth. Live internal EHR/CRM or third-party paid aggregators require real keys. | Provide robust mock adapters and sandbox configurations for automated testing; support production key injection via environment variables. |
| **22. External Broker (Kafka / RabbitMQ)** | Distributed streaming message broker | **Not currently justified** | Current priority queue and in-process async tasks easily handle current volume (<500 msgs/min) with zero operational overhead. | Maintain lightweight internal event and priority queue system; avoid unnecessary distributed infrastructure complexity. |
| **23. Public App Marketplace** | Third-party open plugin marketplace | **Not currently justified** | Platform is an internal enterprise intelligence tool for MMJ-DOCS; a public store has zero business justification. | Build governed, internal module registry instead. |

---

## 3. High-Priority Implementation Plan (Phased Increments)

Based on the audit, Phase 6 will be developed in small, verified, testable increments:

1. **Phase 6.1 — Core Data Models & Migration (`0002_phase6_enterprise_integrations`)**:
   - `api_keys` (programmatic service accounts with hashed secrets and scopes)
   - `webhook_subscriptions` & `webhook_delivery_logs` (outbound webhooks with HMAC-SHA256)
   - `data_imports` & `export_jobs` (audit trails for import/export operations)
   - `data_conflicts` (multi-source evidence preservation and resolution)
   - `collaboration_findings` & `intelligence_notes` (team collaboration dossiers)
   - `intelligence_cases` (investigative workflow and decisions)
   - Extensions to `watchlists` (sharing scopes) and `integration_connector_statuses` (sync schedules)

2. **Phase 6.2 — Enterprise Integration Framework & Registry**:
   - `BaseIntegrationAdapter` abstract contract
   - `IntegrationRegistry` linking adapters to monitored connector records
   - `InternalMmjDocsAdapter` for internal aggregates (strictly no PHI)
   - Verified connectivity and sync checkpoint tracking

3. **Phase 6.3 — Governed API Platform & API Key Authentication**:
   - Unified `/api/v1/governed` endpoints with RBAC enforcement
   - API key authentication dependency (`verify_api_key_or_jwt`)
   - Scoped rate limiting and audit logging

4. **Phase 6.4 — Webhook Framework & Event Dispatcher**:
   - Outbound webhook worker with HMAC-SHA256 signature headers
   - SSRF protection via `validate_safe_url`
   - Dead-letter handling and redelivery replay endpoints

5. **Phase 6.5 — Controlled Data Import & Export Centers**:
   - File upload validation (CSV, JSON, XLSX) with preview and duplicate check
   - Controlled export engine with column masking and permission-based redaction

6. **Phase 6.6 — Cross-System Entity Resolution & Conflict Resolution**:
   - Multi-signal weighted entity matching (names, websites, licenses, phones, cities)
   - Conflict resolution service preserving source records and authority weighting

7. **Phase 6.7 — Collaboration Workspace, Shared Watchlists & Case Management**:
   - Finding collaboration with internal notes
   - Personal vs. team shared watchlists
   - End-to-end intelligence case management lifecycle

8. **Phase 6.8 — Module Registry & Report Distribution**:
   - Declarative `ModuleRegistry` with health status
   - Scheduled report distribution engine

9. **Phase 6.9 — Frontend Integration & Collaboration UI**:
   - Integration Management & Health dashboard
   - API Keys & Webhooks management UI
   - Data Import / Export Center UI
   - Collaboration & Case Management UI

10. **Phase 6.10 — Verification & Comprehensive Testing**:
    - Automated unit and integration test suite (`tests/test_phase6.py`)
    - TypeScript compilation verification (`npm run build`)
    - Complete Phase 6 documentation suite
