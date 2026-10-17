# Phase 9: Enterprise Multi-Tenancy, Customer Onboarding & Commercial Readiness
## Architecture, Project Audit & Implementation Plan

### 1. Mandatory Project Audit & Baseline

#### Current Repository Structure
- **Backend**: FastAPI 0.8.0, SQLAlchemy 2.0 with PostgreSQL UUID/SQLite WAL compatibility, Alembic migrations 0001–0004.
- **Frontend**: Next.js 16+ App Router, TypeScript, Tailwind CSS, Lucide icons, Dark/Light theme context.
- **Data Architecture**:
  - ~492,000 public entities, competitor pricing, regulatory documents, geographic metrics, collection runs.
  - Private artifacts: Research workspaces, findings, scenario models, feedback items, collaboration notes.
- **Authentication**: JWT access tokens, `get_current_user`, `require_permission`, `ProjectUser` table for project-level sharing.
- **Baseline Test Results**:
  - `pytest tests/test_phase8.py tests/test_phase7.py`: **24 passed, 0 failed** (100% green).
  - `pytest tests/test_phase6.py`: **8 passed, 0 failed** (100% green).
  - `npx tsc --noEmit` in `frontend/`: **0 errors**.

#### Phase 9 Gap Analysis
1. **Multi-Tenancy Model**:
   - *Current*: System lacks an `Organization` abstraction. Users own projects individually.
   - *Requirement*: Organization-based multi-tenancy. Every tenant has isolated workspaces, team roles, private settings, and usage records.
2. **Tenant Isolation**:
   - *Current*: No tenant context header or server-side tenant validation.
   - *Requirement*: Shared tables with validated `organization_id`. Server-side validation of authenticated user's active membership.
3. **Roles & Teams**:
   - *Current*: Global `Role` / `Permission` and per-project `ProjectUser`.
   - *Requirement*: Organization-level roles (`OWNER`, `ADMIN`, `ANALYST`, `VIEWER`), invitations lifecycle, and ownership transfer.
4. **Onboarding**:
   - *Current*: Direct login into generic dashboard.
   - *Requirement*: Step-by-step guided setup (Profile -> Geographic Scope -> Competitor Watchlists -> Team Invites -> Activation).
5. **Subscriptions & Entitlements**:
   - *Current*: Static feature availability.
   - *Requirement*: Configurable plans (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) with server-side limit enforcement (users, competitors, AI tokens, exports, markets).
6. **Billing & Payment Integration**:
   - *Current*: No billing abstraction.
   - *Requirement*: Provider-independent billing service, mock/sandbox checkout, HMAC webhook verification, and idempotent invoice records.
7. **Usage Metering**:
   - *Current*: Global token spend estimation.
   - *Requirement*: Tenant-scoped usage records, quota tracking, threshold alerts, and idempotency protection against double-metering.
8. **Enterprise Platform Administration**:
   - *Current*: Local settings and quality center.
   - *Requirement*: Cross-organization platform admin view (`/admin-platform`), tenant audit logs, and diagnostic support access.

---

### 2. Multi-Tenancy Architecture & Data Boundary

```
+-------------------------------------------------------------------------+
|                  SHARED SURFACE-WEB DATA LAKE (PUBLIC)                  |
|  - Entity, EntityLocation, DispensaryDetail, DoctorDetail               |
|  - PriceHistory, CompetitorPrice, StateMarketMetric                     |
|  - RegulatoryUpdate, CollectionRun, JobExecution                        |
+-------------------------------------------------------------------------+
                                    |
                    Filtered / Enriched by Tenant Context
                                    |
+-------------------------------------------------------------------------+
|                   TENANT-ISOLATED DATA (STRICT SCOPE)                   |
|  - Organization, OrganizationMembership, OrganizationInvitation        |
|  - TenantWorkspaceConfig, OrganizationSubscription, BillingCustomer     |
|  - TenantUsageRecord, TenantAuditLog, TenantApiKey, TenantWebhook       |
|  - Scoped Analytics: ResearchWorkspace, ScenarioModel, CustomWeights   |
+-------------------------------------------------------------------------+
```

---

### 3. Implementation Sequence (Stages A to L)

- **Stage A — Audit**: Completed; baseline recorded.
- **Stage B — Database Models & Alembic Migration**: Add `Organization`, `OrganizationMembership`, `OrganizationInvitation`, `OrganizationSettings`, `OrganizationSubscription`, `BillingCustomer`, `BillingInvoice`, `BillingWebhookEvent`, `TenantUsageRecord`, `TenantAuditLog`, `TenantApiKey`, `TenantWebhook`. Add `organization_id` to private tables with backfill migration (`0005`).
- **Stage C — Tenant Context & Security Layer**: Implement `get_current_tenant` dependency in `backend/app/auth/deps.py`. Validate authenticated user membership server-side.
- **Stage D — Team & Role Management**: Implement invitation creation, acceptance, role updating, ownership transfer in `TenantMembershipService`.
- **Stage E — Customer Onboarding**: Guided onboarding workflow service and resume logic in `CustomerOnboardingService`.
- **Stage F — Subscriptions & Entitlements**: Centralized plans (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), limit checking, upgrade/downgrade logic in `SubscriptionEntitlementService`.
- **Stage G — Usage Metering & Quotas**: Real-time quota calculation, deduplication, threshold alerting in `TenantUsageMeteringService`.
- **Stage H — Billing & Payment Service**: Provider-independent abstraction (`BillingService`) with sandbox checkout, HMAC webhook signature verification, and invoice logging.
- **Stage I — Integrations & Webhook Tenancy**: Tenant-scoped API keys and webhook event dispatching.
- **Stage J — Enterprise Admin & Audit**: Platform administration endpoints and structured audit logger (`TenantAuditService`).
- **Stage K — REST APIs & Routes**: Mount `/api/tenants`, `/api/onboarding`, `/api/subscriptions`, `/api/billing`, `/api/usage`, `/api/admin/platform`.
- **Stage L — Frontend Experience**:
  - `/onboarding`: Multi-step onboarding wizard.
  - `/organization`: Team, invitations, workspace settings.
  - `/organization/billing`: Subscription plans, usage meter, invoice history.
  - `/admin-platform`: Platform administration overview.
  - Update `Sidebar.tsx` with organization switcher/indicator.
- **Stage M — Security & Isolation Testing**: Implement `backend/tests/test_phase9.py` covering unauthorized cross-tenant access, entitlement blocking, webhook replay defense, and role matrices.
