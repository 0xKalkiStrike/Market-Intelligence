# MMJ-DOCS Market Intelligence Platform — Phase 9 Documentation
## Enterprise Multi-Tenancy, Customer Onboarding & Commercial Readiness

---

### Executive Summary

Phase 9 transforms the MMJ-DOCS Market Intelligence Platform from a single-tenant intelligence engine into an enterprise-grade, multi-tenant SaaS architecture capable of securely serving multiple independent business customers. Built on top of the verified foundations of Phases 1–8, Phase 9 establishes logical data isolation, server-side authorization enforcement, role-based access control, a 5-step guided customer onboarding workflow, a tiered subscription and entitlement engine, idempotent usage metering, provider-independent commercial billing, and a protected cross-tenant platform administration console.

Zero cross-tenant data leakage is permitted. Public Surface-Web market intelligence (~492,000 entities, state regulatory metrics, and macro price indices) remains safely accessible as a shared data lake, while proprietary research workspaces, scenario definitions, custom findings, internal notification configurations, team invitations, and billing records are strictly partitioned by organization identity.

---

### 1. Architecture & Tenancy Decisions

#### 1.1 Tenancy Isolation Model
- **Model Chosen**: Shared Database with Discriminator (`organization_id` foreign keys and server-side tenant context validation).
- **Rationale**:
  1. The platform contains a massive, curated Surface-Web public intelligence data lake (~492k doctor, dispensary, and competitor records) that must be shared across all commercial subscribers without duplicate crawling or storage overhead.
  2. Proprietary customer records (research projects, hypotheses, findings, private watchlists, scenario models, export jobs, and audit logs) are partitioned with an explicit `organization_id` column.
  3. Relational integrity is enforced with cascading deletes on organization teardown and foreign key constraints.

#### 1.2 Tenant Context & Anti-IDOR Enforcement
- **Crucial Security Boundary**: Client-supplied tenant identifiers (e.g. `X-Organization-Id` header or `?organization_id` query param) are **never trusted blindly**.
- In `backend/app/auth/deps.py`:
  - `get_current_tenant` extracts the requested tenant and queries `organization_memberships` for `user_id == current_user.id AND organization_id == requested_org_id AND is_active == True`.
  - Non-members attempting to access or spoof another tenant's ID immediately receive `HTTP 403 Forbidden` (`Cross-tenant access forbidden. You are not an active member of this organization.`).
  - Platform superadmins (`user.is_superuser == True`) are granted auditable cross-tenant access.

---

### 2. Database Schema & Migrations

Alembic migration `backend/alembic/versions/0005_phase9_enterprise_multi_tenancy.py` introduces 12 new relational entities and links existing projects:

| Entity Name | Primary Key / Constraints | Purpose |
|---|---|---|
| `organizations` | `id` (UUID), `slug` (Unique) | Tenant workspace identity, domain, plan tier, and operational status (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`). |
| `organization_memberships` | `id` (UUID), `Unique(org_id, user_id)` | Tenant membership link with role (`OWNER`, `ADMIN`, `ANALYST`, `VIEWER`, `SERVICE_ACCOUNT`). |
| `organization_invitations` | `id` (UUID), `token` (Unique Index) | Secure 7-day cryptographic tokens for onboarding team members. |
| `organization_settings` | `id` (UUID), `organization_id` (Unique) | Tenant-specific permitted geographic markets, competitor watchlists, and alert thresholds. |
| `organization_subscriptions` | `id` (UUID), `organization_id` (Unique) | Active plan tier (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), billing cadence, renewal date, and provider status. |
| `billing_customers` | `id` (UUID), `provider_customer_id` (Unique) | Provider-independent customer mapping (Stripe/Sandbox). |
| `billing_invoices` | `id` (UUID), `invoice_number` (Unique) | Historical invoice ledger with amount due/paid, period timestamps, and receipts. |
| `billing_webhook_events` | `id` (UUID), `event_id` (Unique Index) | Idempotent ledger of processed billing webhooks preventing duplicate charging. |
| `tenant_usage_records` | `id` (UUID), `idempotency_key` (Unique Index) | Metered resource consumption ledger (`AI_TOKENS`, `EXPORTS_GENERATED`, `SCENARIOS_RUN`). |
| `tenant_audit_logs` | `id` (UUID), Immutable | Tenant-scoped audit trail with automated credential redaction. |
| `tenant_api_keys` | `id` (UUID), `key_prefix` (Index) | Organization-scoped API credentials with scoped permission masks. |
| `tenant_webhooks` | `id` (UUID) | Tenant-scoped event notification endpoints with HMAC signing secrets. |

#### Safe Backfill Strategy
The migration auto-seeds the default enterprise organization:
- **Organization Name**: `MMJ-DOCS Enterprise Primary` (`slug="mmj-docs-primary"`)
- **Plan Tier**: `ENTERPRISE` (annual renewal, sandbox provider)
- **Settings**: Permitted markets `["FL", "OK", "OH", "PA", "MI", "CA", "CO"]`
- **Users**: Backfills all 11 existing platform users as `OWNER` (if superuser) or `ANALYST`.
- **Projects**: Links all existing orphaned projects to the primary organization.

---

### 3. Role Hierarchy & Permission Architecture

The platform defines 5 distinct organization-level roles in `backend/app/services/tenant_membership_service.py`:

```
                       ┌──────────────┐
                       │    OWNER     │  (Full control, transfer ownership, billing)
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │    ADMIN     │  (Manage members, invite team, edit settings)
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │   ANALYST    │  (Run research, scenarios, view & export intel)
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │    VIEWER    │  (Read-only intelligence dashboards)
                       └──────────────┘
                              │
                       ┌──────▼───────┐
                       │ SERVICE_ACCT │  (Automated ingestion & programmatic API keys)
                       └──────────────┘
```

#### Guardrails Enforced:
1. **Sole Owner Protection**: An organization's only owner cannot be removed or demoted without first transferring ownership to another active member.
2. **Ownership Transfer**: Dedicated workflow (`POST /api/tenants/transfer-ownership`) that atomically elevates the recipient to `OWNER` and demotes the previous owner to `ADMIN`.
3. **Invitation Lifecycles**: Invitations have a cryptographically random 64-character token with 7-day expiration. Accepting an invitation automatically binds the user to the organization. Revoked or expired invitations cannot be redeemed.

---

### 4. Guided Customer Onboarding Wizard

Accessible at `/onboarding`, the guided wizard enables seamless, interruption-tolerant setup across 5 distinct stages:

```
[ Step 1: Profile ] ──> [ Step 2: Geo Scope ] ──> [ Step 3: Competitors ] ──> [ Step 4: Team Invites ] ──> [ Step 5: Launch ]
 (Name, Domain, Email)      (State Jurisdictions)     (Competitor Watchlist)    (Batch Teammate Invites)    (Sample Seed & Verify)
```

- **Resumption**: Calling `GET /api/onboarding/status` returns the highest completed step and partial draft data. Users who leave or refresh can resume without lost work.
- **Sample Workspace Seeding**: Customers can choose to seed a clearly labeled sample research workspace (`[Sample] Florida Medical Market Expansion`) to benchmark dispensary density, doctor coverage, and competitive pricing analysis without confusing real production data.

---

### 5. Subscription & Entitlement Matrix

The centralized entitlement engine (`backend/app/services/subscription_entitlement_service.py`) defines clear commercial tiers:

| Dimension | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|
| **Monthly Pricing** | $1,499 / mo | $4,999 / mo | $14,999 / mo |
| **Annual Pricing** | $14,990 / yr | $49,990 / yr | $149,990 / yr |
| **Team Seats (Users)** | 3 | 15 | Unlimited (9,999) |
| **Monitored Competitors** | 5 | 25 | Unlimited (9,999) |
| **Permitted State Markets** | 2 | 10 | All 50 states |
| **Monthly AI Request Tokens** | 50,000 | 500,000 | 10,000,000 |
| **Monthly Intelligence Exports** | 10 | 100 | Unlimited (9,999) |
| **Monthly Optimization Scenarios** | 5 | 50 | Unlimited (9,999) |
| **Data Refresh Cadence** | Weekly | Daily | Continuous Real-Time |
| **Enterprise Webhooks & API** | ❌ | API Access Only | Webhooks, SSO & Audit Export |

#### Server-Side Enforcement:
- `SubscriptionEntitlementService.check_quota(db, org_id, metric, quantity)`: Checks active usage vs limit before executing costly AI prompts, scenario simulations, or PDF report exports. If limit is exceeded, an actionable rejection message is returned.
- `SubscriptionEntitlementService.check_feature_access(db, org_id, feature_name)`: Enforces feature flags in backend services.

---

### 6. Usage Metering & Quotas

Resource tracking is implemented in `backend/app/services/tenant_usage_metering_service.py`:
- **Metrics Tracked**: `AI_TOKENS`, `EXPORTS_GENERATED`, `SCENARIOS_RUN`, `API_REQUESTS`.
- **Anti-Double-Charging (Idempotency)**: All metering events accept an optional `idempotency_key`. Retried background jobs or network hiccups referencing the same key return the existing record without incrementing consumption.
- **Threshold Alerting**:
  - `NORMAL`: < 80% of monthly limit
  - `WARNING`: ≥ 80% of monthly limit
  - `CRITICAL`: ≥ 95% of monthly limit
  - `EXCEEDED`: ≥ 100% of monthly limit (operations restricted)

---

### 7. Commercial Billing & Payment Architecture

Implemented in `backend/app/services/billing_service.py`:
- **Provider-Independent Abstraction**: Operates in `STRIPE` mode if `STRIPE_SECRET_KEY` is configured in `.env`, or seamless `SANDBOX` simulation mode for local development and test environments.
- **Zero Cardholder Storage**: Raw payment cards are never stored or transmitted through platform application servers.
- **HMAC-SHA256 Webhook Verification**: All incoming webhooks must provide a valid HMAC-SHA256 signature matching the secret. Tampered payloads are rejected with HTTP 400.
- **Duplicate Event Protection**: Webhook event IDs are stored in `billing_webhook_events`. Replayed webhook deliveries return `ALREADY_PROCESSED` without double-crediting or duplicate invoice generation.
- **Invoice Ledger**: Paid invoices generate immutable records in `billing_invoices` with period dates, amounts paid, and receipt URLs.

---

### 8. Platform Administration & Tenant Governance

Available to superusers at `/admin-platform` via `backend/app/api/platform_admin.py`:
- **Operational KPIs**: Total organizations, total platform users, Monthly Recurring Revenue (MRR), total platform AI tokens consumed.
- **Organization Directory**: Real-time cross-tenant directory with plan tiers, active seat counts, and status controls (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`).
- **Least-Privilege Tenant Privacy**: Platform operators can inspect organizational metadata and health without penetrating private customer hypothesis notes or research projects.

---

### 9. Frontend Experience

Built with rich dark-mode aesthetics, responsive glassmorphism containers, Google Fonts, and zero TypeScript compilation errors:
1. **Customer Onboarding Wizard** (`/onboarding`): 5-step interactive workflow with progress tracking, state tag selectors, and sample workspace toggle.
2. **Organization & Team Management** (`/organization`): Workspace settings, member role administration, invite dispatch modal, ownership transfer, and immutable audit log viewer.
3. **Subscriptions & Billing Dashboard** (`/organization/billing`): Plan comparison cards, real quota progress gauges with threshold badges, invoice ledger table, and sandbox mock payment simulator.
4. **Platform Administration Console** (`/admin-platform`): Cross-tenant metrics, tenant directory, and lifecycle controls.
5. **Sidebar Workspace Switcher** (`frontend/components/layout/Sidebar.tsx`): Active tenant badge displaying current organization name and plan tier.

---

### 10. Verification & Test Results

The comprehensive test suite in `backend/tests/test_phase9.py` covers 11 security and integration tests:

1. `test_multi_tenant_creation_and_default_organization_backfill`: **PASSED**
2. `test_cross_tenant_data_isolation`: **PASSED**
3. `test_organization_membership_roles_and_permissions`: **PASSED**
4. `test_team_invitation_lifecycle`: **PASSED**
5. `test_customer_onboarding_guided_wizard_and_resumption`: **PASSED**
6. `test_subscription_entitlement_limits_and_enforcement`: **PASSED**
7. `test_tenant_usage_metering_and_idempotency`: **PASSED**
8. `test_billing_checkout_and_sandbox_payment`: **PASSED**
9. `test_billing_webhook_hmac_verification_and_idempotency`: **PASSED**
10. `test_tenant_audit_logs_immutability_and_redaction`: **PASSED**
11. `test_platform_admin_cross_tenant_management`: **PASSED**

#### Full Multi-Suite Regression Results:
```
tests/test_phase9.py ...........                                         [ 25%]
tests/test_phase8.py ............                                        [ 53%]
tests/test_phase7.py ............                                        [ 81%]
tests/test_phase6.py ........                                            [100%]

====================== 43 passed, 31 warnings in 49.67s =======================
```
- **Phase 9 Tests**: 11/11 Passed (100%)
- **Phase 8 Tests**: 12/12 Passed (100%)
- **Phase 7 Tests**: 12/12 Passed (100%)
- **Phase 6 Tests**: 8/8 Passed (100%)
- **Total Combined Tests**: **43/43 Passed (100%)**
- **TypeScript Compile (`npx tsc --noEmit`)**: **0 Errors (Exit code 0)**
