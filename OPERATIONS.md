# MMJ-DOCS Market Intelligence Platform — Operations Manual
# Document: OPERATIONS.md | Phase 5 Production Readiness

## 1. Operational Overview

The MMJ-DOCS Market Intelligence Platform is an enterprise-grade competitive and regulatory intelligence system. Phase 5 establishes complete operational visibility, resilience, workload orchestration, and reliability controls across all data pipelines and AI workloads.

```text
                               +---------------------------------------+
                               |     FastAPI Edge & Rate Limiting      |
                               |  (Sliding Window 200 req/min/client)  |
                               +-------------------+-------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             | Operational Services |                              | Workload Orchestrator|
             | - Health Probes      |                              | - Priority Queue     |
             | - Circuit Breakers   |                              | - Worker Pool (N=10) |
             | - Prometheus Exporter|                              | - DLQ & Backpressure |
             +----------------------+                              +----------------------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             | Database Engine (WAL)|                              | 8 External Connectors|
             | 70 Enterprise Tables |                              | Rate-limited Probes  |
             +----------------------+                              +----------------------+
```

---

## 2. Health Monitoring & Endpoints

The platform provides multi-tier health endpoints to decouple infrastructure liveness from deep dependency readiness:

| Endpoint | Purpose | Validation Scope | Typical Latency | HTTP Response |
|---|---|---|---|---|
| `GET /api/health` | Kubernetes / Container Liveness | Process uptime and basic API responsiveness | < 2 ms | `200 {"status": "ok"}` |
| `GET /api/health/ready` | Traffic Readiness | Database read connectivity, queue backpressure, worker pool | < 15 ms | `200` (Ready) / `503` (Degraded/Down) |
| `GET /api/health/dependencies` | Deep Dependency Audit | Database, Cache/Queue, AI Provider, 8 External Connectors | < 50 ms | `200` (All healthy) / `207` (Partial failure) |

### Health Check Verification
```bash
# Verify process liveness
curl -s http://localhost:8000/api/health

# Verify container readiness before traffic routing
curl -s http://localhost:8000/api/health/ready

# Inspect full dependency telemetry
curl -s http://localhost:8000/api/health/dependencies | jq .
```

---

## 3. Workload Orchestrator & Worker Pools

The internal workload orchestration engine ([`backend/app/orchestration/engine.py`](file:///c:/hacker/Market-Intelligence/backend/app/orchestration/engine.py)) manages all background asynchronous tasks without relying on external orchestration daemons.

### Operational Parameters
- **Concurrency Limit**: 10 active concurrent background workers.
- **Queue Backpressure Admission Control**: Maximum queue depth is 500 jobs. Submissions beyond 500 return HTTP 429 / rejection.
- **Priority Bands**:
  - `P1 - P3`: High-priority operational tasks (Alerts, Emergency Scraping, Live AI requests).
  - `P4 - P6`: Standard pipelines (Data Normalization, Entity Resolution, Executive Reports).
  - `P7 - P10`: Background maintenance (Vector Embedding, Historical Comparisons, Archival).
- **Execution Isolation**: ThreadPoolExecutor with exception capture and runtime timeouts.
- **Dead-Letter Queue (DLQ)**: Maximum retry count is 3. Repeatedly failing jobs transition to `DEAD_LETTER` status with complete stack traces preserved.

### Supported Workload Categories
1. `SURFACE_WEB_COLLECTION`
2. `DATA_NORMALIZATION`
3. `ENTITY_RESOLUTION`
4. `HISTORICAL_COMPARISON`
5. `AI_ANALYSIS`
6. `FORECASTING`
7. `REPORT_GENERATION`
8. `EMBEDDING_INDEXING`
9. `ALERTS_NOTIFICATION`
10. `SCHEDULED_WORKFLOW`

### Orchestrator Management Commands
```bash
# Submit an operational job via API
curl -X POST http://localhost:8000/api/operations/orchestrator/dispatch \
  -H "Content-Type: application/json" \
  -d '{"category": "DATA_NORMALIZATION", "payload": {"state": "FL"}, "priority": 3}'

# Inspect orchestrator queue status & worker load
curl -s http://localhost:8000/api/operations/orchestrator/status | jq .

# Cancel a stuck or running job
curl -X POST http://localhost:8000/api/operations/orchestrator/jobs/{job_id}/cancel

# Re-queue / resurrect a failed or dead-letter job
curl -X POST http://localhost:8000/api/operations/orchestrator/jobs/{job_id}/retry
```

---

## 4. Observability & Prometheus Metrics

Observability middleware ([`backend/app/core/observability.py`](file:///c:/hacker/Market-Intelligence/backend/app/core/observability.py)) automatically instruments every inbound HTTP request, injecting:
- `X-Request-ID`: Distributed tracing UUID.
- `X-Response-Time-Ms`: End-to-end processing latency.

### Prometheus Metrics Endpoint (`GET /api/metrics`)
Standard OpenMetrics-compliant exposition format scraping:
- `http_requests_total{method="...", status="..."}`: Total request counts.
- `http_request_duration_seconds{endpoint="..."}`: Latency histograms (p50, p95, p99).
- `orchestrator_queue_depth`: Current pending job backlog.
- `orchestrator_active_workers`: Busy worker thread count.
- `orchestrator_dlq_count`: Total dead-letter queue count.
- `database_connections_active`: Live connection pool allocation.
- `circuit_breaker_state{provider="..."}`: Circuit breaker state (0=Closed, 1=Half-Open, 2=Open).

### Operational Telemetry Snapshot (`GET /api/observability/summary`)
Returns aggregated metrics for the Operations Center dashboard, including uptime, memory usage, request throughput, and failure rates.

---

## 5. Circuit Breaker Operations

External API calls are protected by the thread-safe Circuit Breaker pattern ([`backend/app/core/circuit_breaker.py`](file:///c:/hacker/Market-Intelligence/backend/app/core/circuit_breaker.py)).

- **Failure Threshold**: 5 consecutive errors trigger transition from `CLOSED` to `OPEN`.
- **Reset Timeout**: 30 seconds cooldown period before entering `HALF_OPEN`.
- **Half-Open Probe**: 1 single probe request allowed. If successful, transitions to `CLOSED`; if failed, resets to `OPEN` for another 30 seconds.
- **Fail-Fast Behavior**: Requests rejected during `OPEN` state fail immediately with `CircuitBreakerOpenException` without exhausting socket pools or blocking worker threads.

### Administrative Reset
Administrators can manually reset a tripped circuit breaker via the Operations Center UI or API:
```bash
curl -X POST http://localhost:8000/api/operations/connectors/reset-breaker \
  -H "Content-Type: application/json" \
  -d '{"connector_id": "google_places"}'
```

---

## 6. Logging Standards & Structured Output

The platform enforces JSON-formatted structured logging for all application, worker, and security events.

### Standard Log Schema
```json
{
  "timestamp": "2026-10-13T12:00:00.123Z",
  "level": "INFO",
  "logger": "market_intelligence.orchestrator",
  "request_id": "req-98f2b3e1-4c12",
  "user_id": "admin@mmjdocs.com",
  "event": "JOB_COMPLETED",
  "details": {
    "job_id": "job-8721a",
    "category": "DATA_NORMALIZATION",
    "duration_ms": 342,
    "records_processed": 150
  }
}
```

---

## 7. Operational Runbook Summary

For operational emergencies, refer to the runbooks detailed in [INCIDENT_RESPONSE.md](file:///c:/hacker/Market-Intelligence/INCIDENT_RESPONSE.md):
1. **RB-001**: Database Connection Pool Saturation or Lock Timeout.
2. **RB-002**: Workload Queue Backlog Exceeding 500 Limit.
3. **RB-003**: Third-Party Scraper IP Block or Rate Limiting.
4. **RB-004**: LLM Provider Outage or Budget Threshold Breach.
5. **RB-005**: High Dead-Letter Queue (DLQ) Accumulation.
