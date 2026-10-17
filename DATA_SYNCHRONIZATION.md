# Data Synchronization & Conflict Resolution

**Service Layer**: `app/services/conflict_resolution_service.py`  
**Core Models**: `DataConflict`, `CrossSystemEntityLink`, `IntegrationConnectorStatus`  
**Operating Principle**: Preserving Disagreeing Evidence Across Providers

---

## 1. Synchronization Principles

The MMJ-DOCS platform connects multiple external and internal data providers that update on disparate cadences. Synchronization must adhere to strict principles:

1. **Idempotence**: Synchronizing the same batch multiple times produces identical state without duplicate records or metric bloat.
2. **Checkpoint Resumption**: Incremental syncs persist a high-water mark timestamp or sequence token (`last_sync_checkpoint`).
3. **Absence != Closure**: A record temporarily missing from an external feed is **never** interpreted as proof that a clinic or dispensary has permanently closed. The platform strictly distinguishes:
   - `ABSENT_FROM_LATEST_SYNC`: Omitted from latest scrape/feed; flags freshness degradation.
   - `EXPLICITLY_INACTIVE`: Source payload explicitly includes status `INACTIVE` or `EXPIRED`.
   - `CONFIRMED_CLOSED`: Corroborated by primary licensing revocation or manual investigator review.

---

## 2. Integration Conflict Resolution Architecture

When two authorized sources disagree on an entity attribute (e.g. business address, phone number, operating hours), the system **never silently discards evidence**.

```text
Source A Ingested               Source B Ingested
(State DOH Registry)           (Surface Web Crawler)
Address: "100 Main Blvd"        Address: "102 Main Blvd"
         \                          /
          \                        /
           v                      v
    +------------------------------------+
    | Field Value Disagreement Detected |
    +------------------+-----------------+
                       |
                       v
    +------------------------------------+
    |      Preserve Both in Database     |
    |  Record created in data_conflicts  |
    +------------------+-----------------+
                       |
                       v
    +------------------------------------+
    | Apply Source Authority Hierarchy   |
    +------------------+-----------------+
                       |
          +------------+------------+
          |                         |
          v                         v
Authority Difference > 30     Authority Difference <= 30
Auto-resolve to higher        Flag as UNRESOLVED
winning_value = Source A      Queue in Next.js Console
status = RESOLVED_SOURCE_A    Awaits Manual Operator Override
```

---

## 3. Source Authority Ranking

Every connected source is assigned a documented authority score between 0 and 100:

| Source Name | Category | Authority Score | Justification |
| :--- | :--- | :---: | :--- |
| `STATE_DOH` | Official State Health Department | **100** | Primary government regulatory and licensing authority |
| `STATE_LICENSING_BOARD` | State Medical Board | **95** | Primary physician licensure and sanction source |
| `MMJ_DOCS_INTERNAL` | Direct Operational CRM | **90** | Direct clinical operations and appointment records |
| `COMMERCIAL_DIRECTORY` | Verified B2B Partner Feed | **70** | Curated commercial business listings |
| `GOOGLE_PLACES` | Surface Directory Search | **60** | Public geocoded location listing |
| `SURFACE_SCRAPE` | Public Website Crawler | **40** | Unverified public HTML text extraction |

---

## 4. Manual Conflict Override Workflow

When an automated authority score is insufficient or conflicting evidence requires human inspection:

1. The conflict appears in the **Integrations & Collaboration Center** (`/integrations-center` -> *Entity Resolution & Conflicts* tab).
2. The investigator reviews Source A and Source B with source timestamps.
3. The investigator selects the winning value and provides a mandatory written justification (e.g., *"Confirmed via telephone call with store manager on 2026-10-14"*).
4. `ConflictResolutionService.resolve_conflict_manually()`:
   - Updates `data_conflicts.winning_value`
   - Sets `resolution_status = "RESOLVED_MANUAL"`
   - Writes the justification, resolver email, and timestamp to the permanent audit trail.
   - Updates the canonical entity attribute in production tables.
