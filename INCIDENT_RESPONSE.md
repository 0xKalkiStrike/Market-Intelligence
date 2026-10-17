# MMJ-DOCS Market Intelligence Platform — Incident Response & SRE Runbooks
# Document: INCIDENT_RESPONSE.md | Phase 5 Production Readiness

## 1. Incident Lifecycle & Severity Matrix

The incident management framework ([`backend/app/services/incident_management_service.py`](file:///c:/hacker/Market-Intelligence/backend/app/services/incident_management_service.py)) provides structured lifecycle tracking from automated anomaly detection through post-mortem closure.

```text
       [ Anomaly Detected (Alert / Metric / User Report) ]
                                |
                                v
                     +--------------------+
                     |      1. OPEN       | ---> Assign Severity & Component Owner
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |  2. INVESTIGATING  | ---> Execute Diagnostic Runbook
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |    3. MITIGATED    | ---> Service Restored, Monitoring Stability
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |    4. RESOLVED     | ---> Root Cause Analysis (RCA) Documented
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |     5. CLOSED      | ---> Corrective Actions Tracked in Backlog
                     +--------------------+
```

### Severity Levels & SLA Targets

| Severity | Definition | Response SLA | Target Resolution SLA | Escalation Path |
|---|---|---|---|---|
| **CRITICAL** | Total API outage, database corruption, or suspected security breach | **< 15 minutes** | < 2 hours | Page On-Call SRE & Lead Architect |
| **HIGH** | Major subsystem failure (all scrapers offline, AI down, DLQ queue spiking) | **< 1 hour** | < 6 hours | Platform Admin & Backend Lead |
| **MEDIUM** | Single external connector down, transient latency, or minor data sync delay | **< 4 hours** | < 24 hours | Data Operations Engineer |
| **LOW** | Minor non-blocking defect, scheduled task delayed, or cosmetic UI anomaly | Next Business Day | Next Sprint | Team Backlog |

---

## 2. Interactive SRE Runbooks

The platform provides 5 automated, reproducible runbooks accessible via the Operations Center UI and API (`POST /api/operations/incidents/runbooks/execute`):

### RB-001: Database Lock Contention or Connection Saturation
- **Symptoms**: API latency $> 2,000$ ms, HTTP 500 errors mentioning `sqlite3.OperationalError: database is locked`, or connection pool exhaustion.
- **Diagnostic Command**:
  ```bash
  curl -s http://localhost:8000/api/health/ready | jq .database
  ```
- **Remediation Procedure**:
  1. Inspect active transactions holding locks.
  2. Execute WAL truncation checkpoint:
     ```bash
     python -c "import sqlite3; c=sqlite3.connect('backend/market_intelligence.db'); c.execute('PRAGMA wal_checkpoint(TRUNCATE)'); c.close()"
     ```
  3. Verify lock clearance with `PRAGMA quick_check`.

---

### RB-002: Workload Orchestrator Backpressure Saturation (> 500 Depth)
- **Symptoms**: Orchestrator returns HTTP 429 (`QUEUE_SATURATED`), pending jobs $\ge 500$.
- **Diagnostic Command**:
  ```bash
  curl -s http://localhost:8000/api/operations/orchestrator/status | jq .
  ```
- **Remediation Procedure**:
  1. Temporarily pause low-priority background queues (`EMBEDDING_INDEXING`, `HISTORICAL_COMPARISON`):
     ```bash
     curl -X POST http://localhost:8000/api/operations/orchestrator/pause-low-priority
     ```
  2. Scale worker pool from 10 to 15 if CPU utilization is $< 70\%$.
  3. Resume standard queue ingestion once queue depth falls below 100.

---

### RB-003: Public Surface-Web Scraper Rate Limiting (HTTP 429 / 403)
- **Symptoms**: Connector reports `DEGRADED` or `DOWN`, scraper jobs failing with HTTP 429/403.
- **Remediation Procedure**:
  1. Confirm target source is still permissible public Surface Web.
  2. Trigger exponential backoff cooldown with jitter (multiplier: 2.5, min delay: 10s).
  3. Lower per-domain scraping concurrency limit to 1 concurrent request.
  4. Ensure `User-Agent` string identifies the crawler ethically with contact metadata:
     `MMJDocs-MarketIntelligence-Bot/5.0 (+https://mmjdocs.com/bot-policy)`.

---

### RB-004: LLM Provider Outage or Budget Cap Breach
- **Symptoms**: Natural language queries returning `CIRCUIT_OPEN` or `BUDGET_CAP_EXCEEDED`.
- **Diagnostic Command**:
  ```bash
  curl -s http://localhost:8000/api/operations/connectors/status | jq .openai_api
  ```
- **Remediation Procedure**:
  1. If budget is breached, review spend in Operations Center. If legitimate, expand daily threshold via `POST /api/operations/budgets`.
  2. If provider has an outage, activate secondary fallback to Anthropic Claude or structured database view:
     ```bash
     curl -X POST http://localhost:8000/api/operations/connectors/route-fallback \
       -d '{"primary": "openai_api", "fallback": "anthropic_api"}'
     ```

---

### RB-005: Dead-Letter Queue (DLQ) Accumulation
- **Symptoms**: `orchestrator_dlq_count > 10` on Prometheus dashboard.
- **Remediation Procedure**:
  1. Fetch failed jobs and inspect trapped stack traces:
     ```bash
     curl -s http://localhost:8000/api/operations/orchestrator/dlq | jq .
     ```
  2. Fix upstream data or schema defect causing deserialization failure.
  3. Resurrect and re-queue jobs in batch:
     ```bash
     curl -X POST http://localhost:8000/api/operations/orchestrator/dlq/retry-all
     ```

---

## 3. Incident Documentation & Post-Mortem Template

Every resolved `CRITICAL` or `HIGH` incident requires a formal post-mortem entry in `IncidentRecord` documenting:
- **Incident Summary & Timeline**: Exact timestamps of detection, escalation, mitigation, and resolution.
- **Root Cause Analysis (5 Whys)**: Deep technical breakdown of failure mechanism.
- **Customer / Analyst Impact**: Duration and scope of degraded intelligence data.
- **Preventative Action Items**: Specific Jira/GitHub issues created to prevent recurrence.
