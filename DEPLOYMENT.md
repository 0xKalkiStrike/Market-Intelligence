# MMJ-DOCS Market Intelligence Platform — Deployment Guide
# Document: DEPLOYMENT.md | Phase 5 Production Readiness

## 1. Deployment Topology & Container Architecture

The platform is packaged into containerized multi-stage Docker artifacts designed for production deployment across Docker Swarm, Kubernetes, AWS ECS, or standard Docker Compose on Linux host instances.

```text
               +-------------------------------------------------------+
               |                  Public Internet                      |
               +---------------------------+---------------------------+
                                           |
                                [ Cloudflare / Nginx SSL ]
                                           |
                +--------------------------v--------------------------+
                |                    frontend_net                     |
                |                                                     |
                |  +---------------------+   +---------------------+  |
                |  | Frontend Container  |   | Backend API Service |  |
                |  | (Next.js 16 :3000)  |-->| (FastAPI :8000)     |  |
                |  | Non-root (UID 1001) |   | Non-root (UID 10001)|  |
                |  +---------------------+   +----------+----------+  |
                +---------------------------------------|-------------+
                                                        |
                +---------------------------------------v-------------+
                |                    backend_net (Isolated)           |
                |                                                     |
                |  +---------------------+   +---------------------+  |
                |  | Postgres 16 Service |   | Redis 7 Cache/Queue |  |
                |  | (:5432)             |   | (:6379)             |  |
                |  +---------------------+   +---------------------+  |
                +-----------------------------------------------------+
```

---

## 2. Docker Packaging Standards

### Backend Container (`backend/Dockerfile`)
- **Base Image**: `python:3.12-slim` (minimal attack surface, hardened Debian base).
- **Multi-Stage Build**: Wheel compilation occurs in an isolated builder stage; the final runner container contains zero compiler tools (`gcc`, `g++`).
- **Security Context**: Executes exclusively as non-root user `appuser` (UID 10001, GID 10001).
- **Healthcheck**: In-container Python curl probe against `http://localhost:8000/api/health` with 10s interval, 5s timeout, and 3 retries.

### Frontend Container (`frontend/Dockerfile`)
- **Base Image**: `node:20-alpine` (hardened Alpine Linux).
- **Multi-Stage Build**:
  - Stage 1 `deps`: `npm ci` with clean cache.
  - Stage 2 `builder`: Next.js production bundle compilation (`npm run build`).
  - Stage 3 `runner`: Node.js standalone runtime with non-root user `nextjs` (UID 1001).
- **Healthcheck**: Wget probe on `http://localhost:3000` with 15s interval.

---

## 3. Environment Configuration & Profiles

The platform supports three distinct deployment profiles:

| Configuration Variable | Development (`.env.local`) | Staging (`.env.staging`) | Production (`.env.production`) |
|---|---|---|---|
| `ENVIRONMENT` | `development` | `staging` | `production` |
| `DEBUG` | `true` | `false` | `false` |
| `DATABASE_URL` | `sqlite:///./market_intelligence.db` | `postgresql://...` | `postgresql://...` |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://staging.mmjdocs.com` | `https://intelligence.mmjdocs.com` |
| `RATE_LIMIT_PER_MINUTE` | `1000` | `200` | `200` |
| `ORCHESTRATOR_MAX_WORKERS` | `4` | `8` | `10` |
| `AI_DAILY_BUDGET_USD` | `10.00` | `25.00` | `50.00` |

---

## 4. Production Deployment Execution

### Step 1: Pre-Deployment Migration Validation
Prior to booting application traffic, database migrations must be applied:
```bash
# In backend container or deployment runner
cd backend
alembic upgrade head
```

### Step 2: Container Launch
```bash
# Launch multi-container production stack
docker compose -f docker-compose.yml up -d --build

# Verify container statuses and health probes
docker compose ps
```

### Step 3: Traffic Readiness Verification
```bash
# Verify backend readiness
curl --fail http://localhost:8000/api/health/ready || exit 1

# Verify frontend readiness
curl --fail http://localhost:3000/api/health || exit 1
```

---

## 5. Rollback & Failover Procedures

If a newly deployed release fails smoke tests or experiences degraded health:

### Automated Rollback
```bash
# 1. Roll back containers to previous tagged image
docker compose down
IMAGE_TAG=v5.0.0 docker compose up -d

# 2. Downgrade database schema if a migration caused failure
docker compose exec backend alembic downgrade -1

# 3. Verify health of rolled-back instance
curl -s http://localhost:8000/api/health/ready | jq .
```

### Disaster Recovery Failover
If the primary host experiences hardware or operating system failure, execute the documented disaster recovery restore sequence in [`BACKUP_AND_RECOVERY.md`](file:///c:/hacker/Market-Intelligence/BACKUP_AND_RECOVERY.md#L73).
