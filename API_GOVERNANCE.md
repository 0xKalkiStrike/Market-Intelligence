# MMJ-DOCS Market Intelligence Platform — API Governance
# Document: API_GOVERNANCE.md | Phase 5 Production Readiness

## 1. API Architecture Principles

The MMJ-DOCS Market Intelligence Platform API follows RESTful architectural patterns implemented in FastAPI. API governance guarantees:
- **Contract Stability**: Predictable Pydantic data schemas with OpenAPI 3.1 specification generation.
- **Strict Authorization**: Every route verifies permissions at the controller layer.
- **Traceability**: Every request carries an end-to-end tracing identifier (`X-Request-ID`).
- **Consistent Error Schemas**: Structured machine-readable error responses across all failure modes.
- **Abuse Prevention**: Distributed sliding-window rate limiting (200 requests/minute per client IP).

---

## 2. Global Headers & Tracing

All inbound and outbound HTTP responses enforce standard enterprise headers injected by middleware:

| Header Name | Type | Description |
|---|---|---|
| `X-Request-ID` | Outbound | Distributed UUIDv4 tracking the transaction across all services and log entries. |
| `X-Response-Time-Ms` | Outbound | Total server processing time in milliseconds. |
| `X-RateLimit-Limit` | Outbound | Maximum allowed requests per time window (default: `200`). |
| `X-RateLimit-Remaining` | Outbound | Remaining quota within current sliding 60-second window. |
| `X-RateLimit-Reset` | Outbound | Epoch timestamp when the current window resets. |
| `Authorization` | Inbound | `Bearer <JWT_TOKEN>` carrying user claims and role. |

---

## 3. Standardized Error Response Schema

All non-2xx responses return a uniform JSON schema to eliminate client ambiguity:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit is 200 requests per minute.",
    "status_code": 429,
    "request_id": "req-98f2b3e1-4c12",
    "timestamp": "2026-10-13T12:00:00.123Z",
    "details": {
      "retry_after_seconds": 24
    }
  }
}
```

### Standard HTTP Status Codes

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks required permission.
- `404 Not Found`: Target entity does not exist.
- `422 Unprocessable Entity`: Pydantic field schema validation failure.
- `429 Too Many Requests`: Client exceeded sliding-window rate limit.
- `500 Internal Server Error`: Unhandled server exception (logged with stack trace and request ID).
- `503 Service Unavailable`: Circuit breaker open, database down, or orchestrator queue saturated.

---

## 4. Complete Phase 5 Operations API Catalog

The Phase 5 unified operations router ([`backend/app/api/operations.py`](file:///c:/hacker/Market-Intelligence/backend/app/api/operations.py)) provides administrative endpoints mounted at `/api/operations`:

### Health & Observability
- `GET /api/health`: Basic container liveness probe (`{"status": "ok"}`).
- `GET /api/health/ready`: Database connectivity and queue backpressure check.
- `GET /api/health/dependencies`: Deep audit of database, cache, AI, and connectors.
- `GET /api/metrics`: Prometheus exposition format metrics.
- `GET /api/operations/summary`: High-level operational telemetry for dashboards.

### Workload Orchestration
- `POST /api/operations/orchestrator/dispatch`: Enqueue an asynchronous background workload.
- `GET /api/operations/orchestrator/status`: Inspect active workers, queue backlog, and DLQ depth.
- `POST /api/operations/orchestrator/jobs/{job_id}/cancel`: Terminate an active or pending job.
- `POST /api/operations/orchestrator/jobs/{job_id}/retry`: Re-queue a failed or dead-letter job.

### External Connector Management
- `GET /api/operations/connectors/status`: Retrieve health status and error rates for all 8 connectors.
- `POST /api/operations/connectors/{connector_id}/probe`: Trigger an immediate live health probe.
- `POST /api/operations/connectors/reset-breaker`: Reset a tripped circuit breaker.

### Data Governance
- `GET /api/operations/governance/status`: Summary of record counts by quality status.
- `POST /api/operations/governance/scan`: Trigger the 12-factor automated data quality scanner.
- `POST /api/operations/governance/records/correct`: Submit a field correction with audit logging.
- `POST /api/operations/governance/duplicates/resolve`: Execute a duplicate entity merge or dismissal.

### AI Governance & Regression
- `POST /api/operations/ai-benchmarks/run`: Execute the 6 Executive Core business questions benchmark.
- `GET /api/operations/ai-benchmarks/history`: Retrieve historical evaluation accuracy and latency runs.

### Incident Management & SRE Runbooks
- `GET /api/operations/incidents`: List operational incidents filtered by severity and status.
- `POST /api/operations/incidents`: Open a new operational incident ticket.
- `PATCH /api/operations/incidents/{incident_id}`: Update incident status, owner, RCA, or resolution.
- `GET /api/operations/incidents/runbooks/list`: Enumerate available automated SRE runbooks.
- `POST /api/operations/incidents/runbooks/execute`: Execute a runbook action (e.g., flush cache, reindex).

### Backup & Disaster Recovery
- `GET /api/operations/backups/status`: Inspect latest snapshots, file sizes, and timestamps.
- `POST /api/operations/backups/trigger`: Trigger an immediate online database snapshot.
- `POST /api/operations/backups/test-restore`: Execute a non-destructive sandbox restoration test.
