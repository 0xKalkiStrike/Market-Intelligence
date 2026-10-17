# Intelligence Sharing & Collaboration Workspace

**Service Layer**: `app/services/collaboration_service.py`  
**Core Models**: `CollaborationFinding`, `IntelligenceNote`, `Watchlist`  
**Security Boundary**: Strict Logical Separation of Private Internal Notes from Public Ingested Content

---

## 1. Overview

Market intelligence is only actionable when decision-makers and analysts can collaborate around verified findings. The Collaboration Workspace allows cross-functional teams (Operations, Executive Leadership, Marketing, and Compliance) to:
1. Publish and curate intelligence findings.
2. Annotate findings and entities with private, confidential internal notes.
3. Share continuous monitoring watchlists across teams or entire departments.
4. Escalate critical market movements into formal investigation cases.

---

## 2. Intelligence Findings Feed

A `CollaborationFinding` represents an analyzed market insight or signal:

- **Attributes**:
  - `title`: Executive headline (e.g., *"Veriheal dropped Orlando consultation fees to $149"*)
  - `content`: Strategic observations, impact analysis, and recommended response
  - `category`: `COMPETITOR`, `PRICING`, `REGULATORY`, `MARKET`, `PARTNERSHIP`
  - `importance`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `review_status`: `DRAFT`, `PUBLISHED`, `IN_REVIEW`, `ACTIONED`, `ARCHIVED`
  - `assigned_to`: Lead analyst responsible for follow-up
  - `supporting_sources_json`: Links to primary external source URLs and scraped evidence

---

## 3. Strict Logical Separation of Private Internal Notes

### Critical Compliance Rule
**Private internal team notes must never leak into external public feeds, API exports, or outbound partner webhooks.**

`IntelligenceNote` records are logically separated from canonical entity tables and public findings:
- `is_internal_only = True` by default.
- Internal notes are stored in a dedicated `intelligence_notes` table linked via foreign keys to `finding_id` or `case_id`.
- Public-facing APIs, webhook payloads, and unprivileged export endpoints strictly exclude `intelligence_notes` from queries.
- Author identity and timestamps are permanently captured for compliance and internal accountability.

---

## 4. Shared Team Watchlists

Phase 6 extends Phase 4 continuous watchlists with multi-tenant sharing scopes:

| Sharing Scope | Visibility | Access Rules |
| :--- | :--- | :--- |
| `PERSONAL` | Creator Only | Private monitoring list for individual analyst exploration |
| `TEAM` | Designated Team | Shared among analysts in a specific group (e.g., `FL-Expansion-Team`) |
| `ENTERPRISE` | All Authorized Users | Platform-wide strategic watchlist (e.g., *Top 5 Multi-State Operators*) |

### Watchlist Sharing Schema
```python
class Watchlist(Base):
    __tablename__ = "watchlists"
    # ...
    sharing_scope: Mapped[str] = mapped_column(String(50), default="PERSONAL")
    team_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
```
API endpoints (`/api/v1/governed/collaboration/shared-watchlists`) automatically filter by user identity and team membership.
