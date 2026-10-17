# MMJ-DOCS Market Intelligence Platform — Testing Strategy & Quality Assurance
# Document: TESTING_STRATEGY.md | Phase 5 Production Readiness

## 1. Quality Assurance Philosophy & Test Pyramid

The platform maintains an enterprise testing pyramid to ensure software reliability, data integrity, and security across all pipelines:

```text
                                  / \
                                 /   \
                                / E2E \       <-- Full System & Sandbox Restore Tests
                               /-------\
                              / Integr- \     <-- Multi-Component, DB Migrations & API Routes
                             /   ation   \
                            /-------------\
                           /   Unit Tests  \  <-- Circuit Breakers, SSRF, Rate Limiting, RBAC
                          /-----------------\
```

---

## 2. Test Suites & Coverage Breakdown

### Verified Pytest Suites (27 Total Passing Tests)

| Test Module | Scope & Objectives | Test Count | Status |
|---|---|---|---|
| [`tests/test_api.py`](file:///c:/hacker/Market-Intelligence/backend/tests/test_api.py) | Core FastAPI routes, authentication, basic health endpoints | 5 Tests | **100% PASSED** |
| [`tests/test_phase3.py`](file:///c:/hacker/Market-Intelligence/backend/tests/test_phase3.py) | AI intelligence queries, report generation, prompt grounding | 8 Tests | **100% PASSED** |
| [`tests/test_phase4.py`](file:///c:/hacker/Market-Intelligence/backend/tests/test_phase4.py) | Watchlists, forecasting, scenarios, continuous monitoring | 7 Tests | **100% PASSED** |
| [`tests/test_phase5.py`](file:///c:/hacker/Market-Intelligence/backend/tests/test_phase5.py) | Phase 5 enterprise reliability, orchestrator, governance, connectors, AI benchmarks, incidents, SSRF | 7 Tests | **100% PASSED** |

### TypeScript Type-Checking
- **Command**: `cd frontend && npx tsc --noEmit`
- **Result**: **0 type errors** across all Next.js pages, layouts, and components.

---

## 3. Failure Mode & Negative Scenario Testing

Enterprise readiness requires thorough verification of failure conditions:

| Negative Scenario | Trigger Mechanism | Expected System Response | Verified |
|---|---|---|---|
| **Upstream API 500 Outage** | 5 consecutive HTTP 500 mock errors | Circuit breaker trips to `OPEN`; fast-fails next call | **Yes** |
| **SSRF Attack Attempt** | Pass `http://169.254.169.254/latest/meta-data` | `validate_safe_url()` raises `ValueError`; request blocked | **Yes** |
| **Queue Backlog Overflow** | Submit 501st job to orchestrator | Orchestrator rejects with queue saturated error | **Yes** |
| **Rate Limit Breach** | Send > 200 requests within 60s window | Returns HTTP 429 with retry header; drops traffic | **Yes** |
| **Unprivileged Business Metric Query** | Analyst queries internal physician revenue | Sanitizer strips internal metrics; returns public data only | **Yes** |
| **Clinical PHI Ingestion** | Query containing "patient medical cannabis card" | AI safety filter rejects with HTTP 400 | **Yes** |
| **Job Execution Exception** | Background task throws unhandled error | Retried up to 3 times, then quarantined to DLQ | **Yes** |
| **Database Restore Failure** | Restore corrupted database archive | Sandbox harness fails quick_check; aborts without mounting | **Yes** |

---

## 4. Test Execution Instructions

### Running the Complete Pytest Suite
```bash
cd backend
# Run all verified tests across Phase 1 through 5
.venv/Scripts/python.exe -m pytest tests/test_api.py tests/test_phase3.py tests/test_phase4.py tests/test_phase5.py -v
```

### Running the Phase 5 Enterprise Test Suite Individually
```bash
cd backend
.venv/Scripts/python.exe -m pytest tests/test_phase5.py -v -s
```

### Running Frontend Type-Check & Linting
```bash
cd frontend
npx tsc --noEmit
npm run lint
```

### Running Non-Destructive Database Restore Verification Test
```bash
python backend/scripts/backup_manager.py --action test-restore --backup-file storage/backups/latest.db
```
