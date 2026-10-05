# PHASE 4 — ADVANCED AUTOMATION, FORECASTING, OPTIMIZATION & CONTINUOUS INTELLIGENCE PLAN

## 1. Executive Summary & Core Objective

Phase 4 transforms the MMJ-DOCS Market Intelligence Platform into a continuously operating, proactive intelligence, forecasting, simulation, and workflow optimization platform.

It builds directly upon:
- **Phase 1**: Data Collection & Data Foundation (NPI Registry, Overpass, Web Scrapers, Entity Resolution, Cleaning, Verification).
- **Phase 2**: Surface-Web Market Intelligence (State Metrics, Competitor Pricing, Partnerships, Regulatory, SEO, Reviews).
- **Phase 3**: AI Intelligence & Decision Support (Grounded RAG Assistant, Knowledge Objects, What-Changed Engine, Anomaly Detection, Scenario Engine, Workload Orchestration).

Phase 4 adds continuous monitoring, quantitative forecasting, market scenario simulation, early-warning risk detection, human-in-the-loop workflow automation, AI cost management, model evaluation, and an Executive Command Center.

---

## 2. Phase 4 Gap Analysis

| Module / Requirement | Phase 1–3 Current Status | Phase 4 Gap / New Implementation |
|---|---|---|
| **Continuous Monitoring** | On-demand & scheduled collection runs | Continuous watchlists & rule-based monitoring engine |
| **Intelligence Watchlists & Rules** | Basic static alerts | Dynamic watchlists (Competitors, States, Regulations, SEO) with custom trigger rules |
| **Intelligent Alert Prioritization** | Static priority string (`HIGH`/`MEDIUM`) | Explainable multi-factor scoring (Magnitude, Relevance, Confidence, Recency, Impact) |
| **Forecasting Engine** | Statistical anomaly & trend detection | Multi-horizon forecasts (7d, 30d, 90d, 6m, 12m) for volume, revenue, growth, and capacity |
| **Forecast Evaluation & Backtesting** | None | MAE, RMSE, MAPE evaluation framework, historical backtesting, and model drift detection |
| **Scenario Modeling** | Basic price change & expansion simulation | Multi-variable scenario engine (Conservative, Base, Aggressive) with assumption isolation |
| **Demand & Capacity Intelligence** | Physician coverage listing | Real-time demand vs. capacity analysis, utilization bottleneck & excess capacity detection |
| **Geographic Optimization** | Basic state metrics | Geo Opportunity Grid (ZIP/County/State level) and spatial clustering |
| **Partnership Optimization** | Static partnership score | Dynamic multi-factor scoring, outcome tracking, and human-in-the-loop lead pipeline |
| **Competitive Movement & Momentum** | Price history tracking | Unified Competitor Activity Score, movement timeline, and momentum tracking |
| **Early-Warning & Risk Engine** | Single-event alerts | Multi-signal correlation early warnings and structured risk intelligence framework |
| **Automated Workflows & Approval Gates** | Async workload tasks | Configurable Trigger-Condition-Action workflows with explicit Human Approval Gates |
| **Feedback Loop & False Positives** | None | User feedback recording (Useful/False Positive/Confirmed) to tune future rules & models |
| **AI Cost Management & Router** | Basic provider config | Token/cost tracking per feature/user, model routing (Lightweight/Medium/Advanced), cost dashboard |
| **Executive Command Center** | Weekly report page | Unified Executive Command Center dashboard & Management Review Queue |

---

## 3. Phase 4 Architecture & Technical Design

```text
                                 SURFACE WEB & INTERNAL DATA
                                             │
                                             ▼
                               CONTINUOUS MONITORING ENGINE
                                             │
                               ┌─────────────┴─────────────┐
                               ▼                           ▼
                     INTELLIGENCE WATCHLISTS      MONITORING RULES ENGINE
                               │                           │
                               └─────────────┬─────────────┘
                                             ▼
                            INTELLIGENT ALERT PRIORITIZATION
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
               FORECASTING ENGINE     SCENARIO ENGINE     EARLY WARNING & RISK
                       │                     │                     │
                       └─────────────────────┼─────────────────────┘
                                             ▼
                                   OPPORTUNITY OPTIMIZATION
                               (Geo Grid, Demand/Capacity, Partnerships)
                                             │
                                             ▼
                                AUTOMATED WORKFLOW ENGINE
                                             │
                                   HUMAN APPROVAL GATES
                                             │
                                             ▼
                               MANAGEMENT REVIEW QUEUE &
                               EXECUTIVE COMMAND CENTER
                                             │
                                             ▼
                               OUTCOME & CONTINUOUS LEARNING
```

---

## 4. Database Migration Plan (New Phase 4 Entities)

The following tables extend `app/database/models.py`:

1. `watchlists`: User-created monitoring lists for states, companies, keywords, regulations.
2. `watchlist_items`: Individual target entities/urls/keywords inside a watchlist.
3. `monitoring_rules`: User-configurable rules (`IF competitor price drop > 10% THEN alert`).
4. `forecast_models`: Abstraction of forecasting models (Baseline, MovingAverage, Trend, Seasonal, ML).
5. `forecasts`: Stored multi-horizon forecasts with confidence intervals and ranges.
6. `forecast_evaluations`: MAE, RMSE, MAPE tracking and historical backtest scores.
7. `geographic_clusters`: ZIP/County geographic opportunity grids and clusters.
8. `competitor_movement_scores`: Activity score logs and momentum classifications.
9. `risk_signals`: Structured risk items (severity, evidence, affected area, trend).
10. `early_warning_signals`: Multi-source correlated early warning market signals.
11. `workflow_definitions`: Reusable automated workflow definitions (Triggers, Conditions, Actions).
12. `workflow_runs`: Execution logs of automated workflows.
13. `human_approvals`: Explicit human approval queue items requiring management authorization.
14. `intelligence_feedbacks`: Feedback records (Useful, False Positive, Confirmed) for tuning models.
15. `ai_cost_logs`: Detailed LLM request cost and token accounting per feature/user.

---

## 5. Forecasting & Scenario Engine Model Plan

- **Forecasting Models**:
  - `BaselineModel`: Naive historical baseline with rolling average.
  - `MovingAverageModel`: Exponentially weighted moving average (EWMA).
  - `TrendLinearModel`: Ordinary Least Squares linear trend with seasonality adjustment.
  - `SeasonalDecompositionModel`: Additive seasonal decomposition for monthly/weekly patterns.
  - `ForecastEvaluationEngine`: Calculates MAE, RMSE, MAPE against historical snapshots to determine model confidence.
- **Scenario Simulation**:
  - `MarketScenarioEngine`: Evaluates hypothetical scenarios without modifying production data. Inputs (Price, Capacity, Marketing, Dispensary Outreach) -> Outputs (Expected Volume, Expected Revenue, Payback Period).
  - Clear separation of **Current Data**, **Assumptions**, and **Scenario Outputs**.

---

## 6. Automation, Workflow & Approval Plan

- **Workflow Engine Architecture**:
  - `Triggers`: `PRICE_CHANGE`, `NEW_DISPENSARY`, `REGULATORY_CHANGE`, `CAPACITY_DROP`, `RISK_DETECTED`.
  - `Conditions`: Parameterized rules (e.g. `price_drop_percent > 10.0`, `importance == 'HIGH'`).
  - `Actions`: `CREATE_ALERT`, `GENERATE_AI_SUMMARY`, `CREATE_REVIEW_ITEM`, `ENQUEUE_TASK`.
  - `Human Approval Gate`: Consequential actions (external outreach, budget shifts, config updates) strictly require human review in `human_approvals` table before proceeding.

---

## 7. Testing & Validation Plan

1. **Unit Tests**: Test Watchlists, Rules Engine, Forecast Engine math, Alert Prioritization scoring, Scenario Engine calculations, and Workflow execution.
2. **Integration Tests**: Test FastAPI Phase 4 endpoints, database persistence, and background job handling.
3. **Backtesting & Evaluation**: Run historical backtesting on forecasting models to verify MAE/RMSE calculations and confidence ratings.
