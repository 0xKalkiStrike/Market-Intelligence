# MMJ-DOCS Market Intelligence Platform — Security Architecture & Hardening
# Document: SECURITY.md | Phase 5 Production Readiness

## 1. Security Architecture Principles

The MMJ-DOCS Market Intelligence Platform adheres to a defense-in-depth security model designed to safeguard platform integrity, protect internal business intelligence, and maintain strict isolation between public research data and proprietary operations.

```text
                               +---------------------------------------+
                               |     Inbound Request / API Gateway     |
                               +-------------------+-------------------+
                                                   |
                                       [ Rate Limiting (200/min) ]
                                       [ HTTPS / TLS 1.3 Strict  ]
                                       [ Security Headers (HSTS) ]
                                                   |
                               +-------------------v-------------------+
                               |   Authentication & Session Filter     |
                               |  - JWT HS256 / Bearer Token           |
                               |  - Bcrypt Password Hashing (Cost 12)  |
                               +-------------------+-------------------+
                                                   |
                               +-------------------v-------------------+
                               | Enterprise RBAC Authorization Guard   |
                               | (7 Roles, 19 Fine-Grained Permissions)|
                               +-------------------+-------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             | Public Intelligence  |                              | Internal Business    |
             | Data Access Layer    |                              | Data Access Layer    |
             | (Dispensary, Prices) |                              | (Revenue, Doctor Cap)|
             +----------------------+                              +----------------------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             | Sanitization Guard   |                              | Restricted RBAC Check|
             | - No Internal Metric |                              | (Requires            |
             | - No PHI / Clinical  |                              |  `view_internal_     |
             | - Source Provenance  |                              |   metrics`)          |
             +----------------------+                              +----------------------+
```

---

## 2. Role-Based Access Control (RBAC) Matrix

Enterprise access is governed at the backend API level via [`backend/app/auth/rbac.py`](file:///c:/hacker/Market-Intelligence/backend/app/auth/rbac.py). Frontends do not enforce security alone; every API endpoint enforces explicit permission checks.

### Role Definitions

| Role | Description | Assigned Permissions |
|---|---|---|
| **System Administrator** (`system_admin`) | Full platform authority, infrastructure, and user management | All 19 permissions |
| **Platform Administrator** (`platform_admin`) | Operational control, orchestrator, connectors, backups, incidents | 15 permissions (excluding role/user management and raw business metrics) |
| **Intelligence Analyst** (`analyst`) | Market intelligence querying, executive reporting, AI workflows | `view_public_data`, `view_intelligence`, `export_reports`, `trigger_ai_analysis` |
| **Market Researcher** (`market_researcher`) | Public competitor & dispensary tracking, scraper triggering | `view_public_data`, `run_scrapers`, `view_intelligence` |
| **Partnership Manager** (`partnership_manager`) | B2B CRM, dispensary outreach, lead management | `view_public_data`, `manage_partnerships`, `export_reports` |
| **Executive Viewer** (`executive_viewer`) | Read-only executive dashboards, high-level opportunity briefs | `view_public_data`, `view_intelligence`, `export_reports` |
| **Compliance Reviewer** (`compliance_reviewer`) | Data governance reviews, regulatory verification, audit trails | `view_public_data`, `manage_governance`, `approve_data_quality`, `view_audit_logs` |

### Complete 19-Permission Inventory

1. `view_public_data`: Query public dispensary, doctor, competitor, and regulatory data.
2. `edit_public_data`: Modify public database records.
3. `view_internal_metrics`: Access proprietary revenue, appointment, or capacity figures.
4. `manage_users`: Create, update, or deactivate user accounts.
5. `manage_roles`: Grant, revoke, or modify user roles.
6. `run_scrapers`: Trigger live or background Surface-Web scrapers.
7. `view_intelligence`: Access competitive intelligence, pricing history, and opportunity scores.
8. `export_reports`: Generate and download Excel/PDF executive intelligence reports.
9. `manage_partnerships`: Create, update, and manage CRM partner records and outreach.
10. `trigger_ai_analysis`: Submit natural language queries and AI synthesis workflows.
11. `manage_orchestrator`: Dispatch, pause, retry, and manage background workloads and worker pools.
12. `manage_connectors`: Configure, test, and reset external API connectors.
13. `trigger_backups`: Execute database backups and sandbox restoration tests.
14. `manage_governance`: View data quality dashboard, trigger quality scans, resolve duplicates.
15. `approve_data_quality`: Authorize entity merges and record overrides.
16. `manage_incidents`: Open, update, resolve, and close operational incident tickets.
17. `manage_budgets`: Configure and update AI and operational cost budget limits.
18. `view_audit_logs`: Inspect audit logs and record history.
19. `execute_runbooks`: Execute automated SRE remediation runbooks.

---

## 3. Surface-Web Compliance & Threat Mitigation

### Non-Negotiable Surface-Web Policy
- **Zero Dark Web Operations**: All collection occurs exclusively on the public Surface Web.
- **No Authentication Bypass**: No scraping behind authenticated portals, paywalls, or private logins.
- **No CAPTCHA Circumvention**: Automated CAPTCHA solving or evasion tools are strictly forbidden.
- **Respect for Terms & Robots.txt**: Ingestion pipelines adhere to source robots.txt guidelines and rate limits.

### Anti-SSRF (Server-Side Request Forgery) Protection
All outbound scraper and connector requests are filtered through `validate_safe_url()` ([`backend/app/auth/rbac.py`](file:///c:/hacker/Market-Intelligence/backend/app/auth/rbac.py#L112)):
- Blocks loopback addresses (`127.0.0.0/8`, `::1`).
- Blocks private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Blocks link-local and cloud metadata addresses (`169.254.0.0/16` AWS/GCP metadata).
- Rejects non-HTTP/HTTPS protocols (`file://`, `ftp://`, `gopher://`).
- Resolves domain names to IP addresses prior to HTTP dispatch to prevent DNS rebinding attacks.

---

## 4. Internal Data Protection & Zero PHI Architecture

### Data Separation Boundary
Public market intelligence is strictly segregated from MMJ-DOCS internal business metrics:
- **Sanitization Layer**: When returning intelligence data, `sanitize_internal_business_data()` strips:
  - `revenue_per_patient`
  - `internal_appointment_counts`
  - `physician_capacity_utilization`
  - `clinician_payout_rates`
- **Exclusion of Protected Health Information (PHI)**:
  - The system contains **zero** patient charts, diagnosis records, medical cannabis certifications, patient names, addresses, or clinical documents.
  - Automated regex and NLP sanitization filters in [`backend/app/services/ai_governance_service.py`](file:///c:/hacker/Market-Intelligence/backend/app/services/ai_governance_service.py) reject inbound queries or data containing clinical or PHI markers.

---

## 5. Rate Limiting & DoS Protection

A thread-safe sliding-window rate limiter ([`backend/app/core/rate_limit.py`](file:///c:/hacker/Market-Intelligence/backend/app/core/rate_limit.py)) protects all endpoints:
- **Default Limit**: 200 requests per minute per client IP.
- **Response Headers**:
  - `X-RateLimit-Limit: 200`
  - `X-RateLimit-Remaining: <count>`
  - `X-RateLimit-Reset: <epoch_seconds>`
- **HTTP 429 Status**: Exceeded requests are immediately dropped with a structured JSON error body.

---

## 6. Audit Logging & Non-Repudiation

All sensitive actions generate tamper-evident audit records in `entity_audit_trail`:
- **Captured Metadata**: Entity ID, Entity Type, Action (`CREATE`, `UPDATE`, `CORRECTION`, `MERGE`, `DISMISS`), Previous State, New State, Changed By (User ID/Email), Timestamp, Client IP, and Reason.
- **Retention**: Audit records are immutable; no API endpoint permits deletion or modification of audit trails.

---

## 7. Secrets Management & Environment Isolation

- **Zero Hardcoded Credentials**: All database URLs, JWT secret keys, and provider API tokens are loaded exclusively via environment variables (`.env`).
- **Production Secrets**: In production, secrets are injected via Docker Compose secrets or Kubernetes Secrets / AWS Secrets Manager.
- **Frontend Bundle Isolation**: Vite/Next.js client bundles are strictly audited to ensure no server-side secrets or tokens are exposed to browser clients.
