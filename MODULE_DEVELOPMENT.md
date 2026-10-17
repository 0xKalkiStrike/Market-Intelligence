# Intelligence Module Development & Extensibility Guide

**Service Layer**: `app/services/module_registry_service.py`  
**Registry Endpoint**: `GET /api/v1/governed/modules`  
**Architecture Pattern**: Reusable Intelligence Services & Controlled Internal Registry

---

## 1. Overview

Rather than constructing a brittle monolith or an over-engineered external plugin marketplace, the MMJ-DOCS platform provides a governed, internal **Module Registry**. New state regulatory trackers, predictive algorithms, or public data connectors can be plugged in seamlessly without requiring a system rewrite.

Each module declares a formal specification:
- **Module Name & Version**: Unique semantic versioned identifier
- **Purpose**: Clear business rationale and user value
- **Input & Output Contracts**: Well-defined JSON schemas
- **Permissions**: Required RBAC scopes for execution
- **Dependencies**: Required database tables, external APIs, or ML libraries
- **Health & Tests**: Diagnostic probe endpoint and test suite reference

---

## 2. Reusable Intelligence Service Layer

Business logic is completely decoupled from UI components and individual route handlers:

```text
                               +----------------------------------+
                               |     GOVERNED ENTRY POINTS        |
                               | (FastAPI, Cron Jobs, AI Copilot) |
                               +-----------------+----------------+
                                                 |
                                                 v
+-------------------------------------------------------------------------------------------------+
|                                 REUSABLE SERVICE LAYER                                          |
|                                                                                                 |
|   +--------------------+     +--------------------+     +--------------------+                  |
|   | Competitor Service |     |  Pricing Service   |     | Opportunity Engine |                  |
|   +--------------------+     +--------------------+     +--------------------+                  |
|   +--------------------+     +--------------------+     +--------------------+                  |
|   | Geospatial Service |     | Regulatory Service |     | Partnership Engine |                  |
|   +--------------------+     +--------------------+     +--------------------+                  |
|   +--------------------+     +--------------------+     +--------------------+                  |
|   | Executive Reports  |     | Conflict Engine    |     | Webhook Dispatcher |                  |
|   +--------------------+     +--------------------+     +--------------------+                  |
+------------------------------------------------+------------------------------------------------+
                                                 |
                                                 v
                               +-----------------+----------------+
                               |        CORE DATABASE LAYER       |
                               |  (Entities, Locations, Metrics) |
                               +----------------------------------+
```

---

## 3. Registering a New Intelligence Module

To introduce a new intelligence module (e.g. *Retail Canopy Expansion Predictor*):

### Step 1: Implement the Service Class
Create `backend/app/services/canopy_expansion_service.py` extending business logic with standard database sessions:

```python
class CanopyExpansionService:
    def __init__(self, db: Session):
        self.db = db

    def predict_expansion(self, state: str) -> Dict[str, Any]:
        # Perform calculations using StateMarketMetric and Entity data
        return {"state": state, "expansion_probability": 0.82}
```

### Step 2: Register in `ModuleRegistryService`
Add the module descriptor to `backend/app/services/module_registry_service.py`:

```python
{
    "name": "Retail Canopy Expansion Predictor",
    "version": "1.0.0",
    "purpose": "Estimates geographic expansion probabilities for multi-state operators based on municipal ordinance changes.",
    "input_data": ["state_code", "municipal_zoning_rules"],
    "output_data": ["expansion_probability", "recommended_territories"],
    "permissions": ["intelligence:read"],
    "dependencies": ["StateMarketMetric", "GeographicCluster"],
    "api_routes": ["/api/v1/governed/canopy-predictions"],
    "health_status": "HEALTHY",
    "tests": "backend/tests/test_canopy_expansion.py"
}
```

### Step 3: Mount Governed API Route
Add the endpoint to `backend/app/api/governed.py` with scope enforcement:

```python
@router.get("/canopy-predictions")
def get_canopy_predictions(
    state: str = "FL",
    principal: AuthenticatedPrincipal = Depends(require_governed_scope("intelligence:read")),
    db: Session = Depends(get_db),
):
    svc = CanopyExpansionService(db)
    return svc.predict_expansion(state)
```

---

## 4. AI Copilot Integration Boundaries

When the AI Market Assistant (from Phase 3) interacts with newly integrated services:

1. **Tool Allowlist**: The AI may only invoke registered, approved tools via `call_tool`.
2. **Read-Only by Default**: The AI has read-only access to intelligence data; it cannot trigger destructive database imports, revoke API keys, or resolve conflicts without explicit human operator confirmation.
3. **Untrusted Data Boundary**: Scraped website text and external JSON payloads are treated strictly as **untrusted data**, not executable system instructions. System prompt overrides embedded in scraped pages are ignored.
4. **Attribution & Provenance**: Every AI-generated summary must cite the underlying canonical entity or regulatory change ID.
