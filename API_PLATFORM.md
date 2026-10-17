# Governed API Platform & Programmatic Service Accounts

**Base Path**: `/api/v1/governed`  
**Authentication**: `Authorization: Bearer <JWT>` OR `X-API-Key: mmj_<prefix>_<secret>`  
**Specification Version**: Phase 6.0 OpenAPI Compliant

---

## 1. Overview

The Governed API Platform exposes platform intelligence, market aggregates, entity resolution, and integration controls to authorized internal applications and approved third-party enterprise consumers.

### Architectural Principles
1. **Never Expose Raw DB Records**: All endpoints enforce schema validation, pagination limits, and field projection.
2. **Proprietary Metric Redaction**: Sensitive MMJ-DOCS internal business metrics (e.g., patient volume counts and estimated revenues) are automatically redacted with `"[RESTRICTED]"` unless the caller holds the `internal_metrics:read` scope.
3. **Dual Authentication**: Accepts interactive user JWT tokens or programmatic `X-API-Key` headers interchangeably via `AuthenticatedPrincipal`.
4. **Sliding-Window Rate Limiting**: In-memory rate limiting enforces caller quotas without database overhead.

---

## 2. Permission Scopes

| Scope Identifier | Description | Granted Endpoints |
| :--- | :--- | :--- |
| `intelligence:read` | Read public market intelligence, competitors, pricing, opportunities | `/competitors`, `/competitor-pricing`, `/dispensaries`, `/state-markets`, `/opportunity-scores`, `/geographic-analytics`, `/regulatory-intelligence`, `/events-alerts`, `/exports/jobs` |
| `internal_metrics:read` | View unredacted MMJ-DOCS internal revenue, volume, and capacity metrics | Field-level clearance on `/competitors`, `/state-markets`, `/exports/generate` |
| `sources:manage` | Trigger connector synchronization and run health probes | `/integrations`, `/integrations/{name}/probe`, `/integrations/{name}/toggle` |
| `data_quality:correct` | Import bulk data and resolve identity match links | `/imports/preview`, `/imports/execute`, `/entity-resolution/resolve`, `/conflicts/resolve-manually` |
| `partnerships:manage` | View and manage dispensary partnerships | `/partnerships` |
| `system:manage` | Issue/revoke API keys, manage webhooks, configure report distributions | `/api-keys`, `/api-keys/{id}`, `/webhooks`, `/webhooks/{id}`, `/report-distributions` |

---

## 3. Programmatic API Keys & Service Accounts

### Key Lifecycle & Format
- **Format**: `mmj_<8 hex prefix>_<48 hex secret>`
- **Storage**: Only the `prefix` and `SHA-256(raw_secret)` are stored in the database.
- **Display**: The unhashed raw key is returned **strictly once** upon generation.

### Generation Request (`POST /api/v1/governed/api-keys`)
```json
{
  "name": "Enterprise Analytics Warehouse Pipeline",
  "scopes": ["intelligence:read", "sources:manage"],
  "rate_limit_per_minute": 120,
  "expires_in_days": 90
}
```

### Generation Response (HTTP 201)
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Enterprise Analytics Warehouse Pipeline",
  "prefix": "mmj_8b7c4a1e",
  "full_api_key": "mmj_8b7c4a1e_f8e3d2c1b0a99887766554433221100ffeeddccbbaa99887",
  "scopes": ["intelligence:read", "sources:manage"],
  "rate_limit_per_minute": 120,
  "expires_at": "2027-01-12T17:15:00Z",
  "notice": "Store this API key safely now. It will NEVER be displayed again."
}
```

### Revocation (`DELETE /api/v1/governed/api-keys/{key_id}`)
Deactivates the key record immediately. Subsequent requests using the key will receive `HTTP 403 Forbidden: API key has been revoked or deactivated`.

---

## 4. Key Governed Endpoints Reference

### 1. Competitors Directory
- `GET /api/v1/governed/competitors?state=FL&page=1&page_size=20`
- **Scope Required**: `intelligence:read`
- **Output Sample**:
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "e9e2e338-9a76-4040-bcc6-6ca7f252d252",
      "name": "Veriheal Florida",
      "state": "FL",
      "city": "Orlando",
      "verification_status": "VERIFIED",
      "rating": 4.6,
      "review_count": 840,
      "estimated_revenue": "[RESTRICTED]",
      "website": "https://veriheal.com"
    }
  ]
}
```
*(Note: `estimated_revenue` displays actual figures only if caller holds `internal_metrics:read`)*.

### 2. State Market Metrics
- `GET /api/v1/governed/state-markets`
- **Scope Required**: `intelligence:read`
- Returns state-by-state patient population, dispensary counts, competitor density, opportunity scores, and restricted internal volumes.

### 3. Competitor Pricing Intelligence
- `GET /api/v1/governed/competitor-pricing?state=FL`
- **Scope Required**: `intelligence:read`
- Returns recent pricing movements, promotions, consultation fees, and confidence scores.

### 4. Integration Connector Statuses
- `GET /api/v1/governed/integrations`
- **Scope Required**: `sources:manage`
- Returns real-time health, sync frequency, checkpoints, and supported entities.
