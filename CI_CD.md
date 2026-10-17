# MMJ-DOCS Market Intelligence Platform — CI/CD & Release Management
# Document: CI_CD.md | Phase 5 Production Readiness

## 1. Release Pipeline Architecture

The release management lifecycle guarantees that no unverified, insecure, or breaking change reaches production. The pipeline is implemented in GitHub Actions ([`.github/workflows/release.yml`](file:///c:/hacker/Market-Intelligence/.github/workflows/release.yml)).

```text
                  +-----------------------------------+
                  |        Git Push / PR Merge        |
                  +-----------------+-----------------+
                                    |
                    +---------------v---------------+
                    |     Stage 1: Static Checks    |
                    | - Flake8 / Black (Python)     |
                    | - TypeScript Compiler (0 Err) |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    |     Stage 2: Automated Tests  |
                    | - Pytest Suite (27/27 Pass)   |
                    | - Frontend Component Tests    |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    |     Stage 3: Security Scan    |
                    | - Bandit AST Security Analysis|
                    | - npm audit Vulnerability Scan|
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    | Stage 4: Migration Validation |
                    | - Alembic Upgrade Head Test   |
                    | - Alembic Downgrade Test      |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    | Stage 5: Container Packaging  |
                    | - Multi-Stage Docker Builds   |
                    | - Non-root Artifact Tagging   |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    |   Stage 6: Staging Deployment |
                    | - Deploy to Staging Cluster   |
                    | - Smoke Tests & Health Probes |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    | Stage 7: Production Approval  |
                    | (Mandatory Human Sign-Off)    |
                    +---------------+---------------+
                                    |
                    +---------------v---------------+
                    | Stage 8: Production Rollout   |
                    | - Rolling Container Update    |
                    | - Automated Health Verification|
                    +-------------------------------+
```

---

## 2. Stage Breakdown & Acceptance Criteria

### Stage 1: Static Code Quality & Type Safety
- **Backend**: Flake8 code linting, isort import verification.
- **Frontend**: `npx tsc --noEmit` verifies strict TypeScript typing across all components, hooks, and services with **0 errors**.

### Stage 2: Automated Unit & Integration Testing
- Executes the full test suite via Pytest:
  ```bash
  pytest tests/test_api.py tests/test_phase3.py tests/test_phase4.py tests/test_phase5.py -v
  ```
- **Acceptance Criteria**: 100% test pass rate (27 of 27 test cases).

### Stage 3: Security & Vulnerability Analysis
- **Bandit Python AST Scan**: Analyzes source code for SQL injection, hardcoded credentials, unsafe deserialization, and unvalidated URL requests.
- **Dependency Audit**: `npm audit --audit-level=high` checks frontend dependencies for known CVEs.

### Stage 4: Database Migration Roundtrip Validation
- Spin up an ephemeral database.
- Execute `alembic upgrade head` to verify that all revisions apply cleanly without syntax or foreign-key errors.
- Execute `alembic downgrade -1` to verify clean rollback capability.
- Re-apply `alembic upgrade head` to confirm idempotency.

### Stage 5: Container Build & Provenance
- Build multi-stage Docker images tagged with both the git commit SHA (`sha-${GITHUB_SHA::8}`) and semver tag.
- Push images to container registry (GHCR / AWS ECR).

### Stage 6: Staging Deployment & Automated Smoke Tests
- Deploy to staging environment.
- Run automated smoke test harness:
  - Probe `GET /api/health/ready` (assert HTTP 200).
  - Probe `GET /api/health/dependencies` (assert all core connectors reachable).
  - Probe `POST /api/operations/orchestrator/dispatch` (assert job queue admission).

### Stage 7: Production Human Approval Gate
- Deployment to the `production` environment requires explicit approval from designated Release Managers / SRE leads in the GitHub Actions UI.
- Pull request summaries and test evidence are attached to the deployment record.

### Stage 8: Production Deployment & Verification
- Blue/Green or rolling update of containers.
- If `/api/health/ready` fails within 60 seconds post-deploy, the deployment pipeline automatically initiates container rollback to the previous tag.
