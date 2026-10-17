# MMJ-DOCS Market Intelligence Platform — External Integration Management
# Document: INTEGRATION_MONITORING.md | Phase 5 Production Readiness

## 1. Integration Layer Objectives

The MMJ-DOCS Market Intelligence Platform relies on external data sources, government portals, mapping APIs, and AI models to construct its intelligence index. The integration management layer ([`backend/app/services/integration_management_service.py`](file:///c:/hacker/Market-Intelligence/backend/app/services/integration_management_service.py)) provides:
1. **Active Health Verification**: Connectors are never reported as healthy without live probe verification.
2. **Failure Isolation**: Circuit breakers prevent upstream provider outages from blocking worker threads or degrading core APIs.
3. **Quota & Rate-Limit Tracking**: Monitors request rates and prevents provider billing overruns.
4. **Surface-Web Compliance Enforcement**: Enforces that all connectors access public, permissible data endpoints only.

---

## 2. Inventory of Enterprise Connectors

| Connector ID | Name & Target | Purpose & Scope | Protocol / Method | Circuit Breaker Config |
|---|---|---|---|---|
| `google_places` | Google Maps & Places API | Dispensary verification, geocoding, ratings | REST / HTTPS | 5 fails, 30s reset |
| `census_gov` | US Census Bureau API | County demographic data & density metrics | REST / HTTPS | 5 fails, 30s reset |
| `fl_health_ommu` | Florida Health OMMU Portal | Weekly patient counts, dispensary licenses | Public HTTPS / Scrape | 5 fails, 30s reset |
| `pa_doh_mmp` | PA Dept of Health MMP | Dispensary locations & practitioner registries | Public HTTPS / Scrape | 5 fails, 30s reset |
| `oh_com_mmcp` | Ohio Division of Cannabis | Active dispensaries & medical regulations | Public HTTPS / Scrape | 5 fails, 30s reset |
| `openai_api` | OpenAI API (GPT-4o) | Structured entity extraction & AI queries | REST / HTTPS | 5 fails, 30s reset |
| `anthropic_api` | Anthropic Claude API | Regulatory reasoning & scenario synthesis | REST / HTTPS | 5 fails, 30s reset |
| `resend_email` | Resend / SMTP Gateway | High-priority operational & compliance alerts | REST / HTTPS | 5 fails, 30s reset |

---

## 3. Active Health Probing & Status Lifecycle

### Non-Negotiable Operational Rule
> **A connector is NEVER displayed as healthy without recent, measured evidence of successful operation.**

```text
                  +-----------------------------------+
                  |      Scheduled Probe (Every 5m)   |
                  +-----------------+-----------------+
                                    |
                       [ HTTP GET with 5.0s Timeout ]
                                    |
                     +--------------+--------------+
                     |                             |
            (HTTP 200 & < 1000ms)         (HTTP 5xx, 429, Timeout)
                     |                             |
                     v                             v
           +--------------------+        +--------------------+
           |      HEALTHY       |        |   Increment Fails  |
           +--------------------+        +----------+---------+
                                                    |
                                    +---------------+---------------+
                                    |                               |
                              (< 5 Fails)                     (>= 5 Fails)
                                    |                               |
                                    v                               v
                          +--------------------+          +--------------------+
                          |      DEGRADED      |          |    CIRCUIT_OPEN    |
                          +--------------------+          +--------------------+
```

### Connector Status Matrix
- `HEALTHY`: Probe completed successfully within the last 5 minutes with latency $< 1,000$ ms.
- `DEGRADED`: Provider returned intermittent errors ($1 \le \text{errors} < 5$) or latency $> 2,500$ ms.
- `DOWN`: Upstream host unreachable, DNS resolution failed, or continuous HTTP 5xx responses.
- `CIRCUIT_OPEN`: 5 consecutive failures recorded; circuit breaker tripped into open state. Outbound requests fail immediately without blocking.

---

## 4. Live Probing & Breaker Reset Operations

### Triggering an On-Demand Live Health Probe
Administrators can probe any connector directly via the Operations Center UI or API:
```bash
curl -X POST http://localhost:8000/api/operations/connectors/google_places/probe \
  -H "Content-Type: application/json"
```

**Probe Response**:
```json
{
  "connector_id": "google_places",
  "status": "HEALTHY",
  "latency_ms": 142.5,
  "last_success_at": "2026-10-13T12:05:00.123Z",
  "consecutive_errors": 0,
  "circuit_breaker_state": "CLOSED"
}
```

### Resetting a Tripped Circuit Breaker
```bash
curl -X POST http://localhost:8000/api/operations/connectors/reset-breaker \
  -H "Content-Type: application/json" \
  -d '{"connector_id": "google_places"}'
```

---

## 5. Fallback Rules & Degradation Protocols

When an external provider fails:
1. **Government Portals (`fl_health_ommu`, `pa_doh_mmp`, `oh_com_mmcp`)**:
   - Fall back to the most recent cached snapshot in `market_intelligence.db`.
   - Records are marked with warning flag: `DATA_PROVENANCE_CACHED_FALLBACK`.
   - Pipeline does not fail or discard data; an operational alert is dispatched.
2. **AI Providers (`openai_api`, `anthropic_api`)**:
   - If OpenAI circuit trips open, queries fall back to secondary Anthropic Claude endpoint if configured, or return grounded rule-based responses.
   - If all LLM providers are down, the system returns exact structured database records without synthetic narrative.
3. **Mapping & Geocoding (`google_places`)**:
   - Inbound addresses are stored in `UNVERIFIED` status and queued for batch geocoding once the breaker returns to `CLOSED`.
