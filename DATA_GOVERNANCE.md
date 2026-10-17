# MMJ-DOCS Market Intelligence Platform — Data Governance Framework
# Document: DATA_GOVERNANCE.md | Phase 5 Production Readiness

## 1. Governance Objectives & Principles

The MMJ-DOCS Market Intelligence Platform processes high-volume public market, dispensary, pricing, and regulatory intelligence across multiple states. Data governance ensures:
1. **Provenance & Attribution**: Every data point traces back to an immutable public source and timestamp.
2. **Quality Verification**: Systematic classification of data trust and freshness.
3. **Historical Non-Destructiveness**: Competitor price histories, regulatory updates, and market events are preserved in append-only logs rather than overwritten.
4. **Human-in-the-Loop Accountability**: High-impact entity merges and corrections require authorization and produce permanent audit trails.

---

## 2. Record Lifecycle & Quality Statuses

Every entity in the database (Competitors, Dispensaries, Doctors, Regulatory Updates, Prices) is categorized by a formal quality state ([`backend/app/services/data_governance_service.py`](file:///c:/hacker/Market-Intelligence/backend/app/services/data_governance_service.py)):

```text
       [ Public Scraper / API ]
                  |
                  v
       +--------------------+
       |     UNVERIFIED     | <--- Ingested without multi-source cross-reference
       +---------+----------+
                 |
                 +---- Cross-referenced / Validated (Confidence >= 0.80)
                 v
       +--------------------+
       |       LIKELY       |
       +---------+----------+
                 |
                 +---- Official State Registry / Manual Verification (Confidence >= 0.95)
                 v
       +--------------------+
       |      VERIFIED      |
       +---------+----------+
                 |
                 +---- No updates in > 90 days
                 v
       +--------------------+
       |       STALE        |
       +--------------------+

    [ Discrepant Sources detected ] ----> +--------------------+
                                           |    CONFLICTING     |
                                           +--------------------+
```

### Quality Status Definitions
- `VERIFIED`: Confirmed by official government API, primary state licensing board, or manual compliance sign-off.
- `LIKELY`: High-confidence multi-source match (e.g. Google Maps API + state business registry match with confidence $\ge 0.80$).
- `UNVERIFIED`: Ingested from a single public website without secondary cross-validation.
- `STALE`: Verified record whose `last_verified_at` timestamp exceeds 90 days without re-validation.
- `CONFLICTING`: Conflicting data points discovered across disparate sources (e.g., mismatched dispensary addresses or license numbers).

---

## 3. The 12-Factor Data Quality Scanner

The automated Data Quality Scanner runs scheduled checks across the entire database to detect anomalies:

| Check Factor | Detection Rule | Remediation Action |
|---|---|---|
| **1. Duplicate Entities** | Fuzzy string matching (Levenshtein $\ge 0.88$) on name + postal code | Flag for deduplication review in Operations Center |
| **2. Missing Source References** | Record missing `source_url` or `source_id` | Set status to `UNVERIFIED`; alert pipeline operator |
| **3. Invalid URLs** | Malformed protocol, broken syntax, or unreachable source URL | Mark URL as invalid; schedule scraper re-run |
| **4. Stale Records** | `last_verified_at` older than 90 days | Set status to `STALE`; trigger automated re-crawl |
| **5. Conflicting Identities** | Same state license number associated with different DBA names | Set status to `CONFLICTING`; route to compliance queue |
| **6. Unexpected Values** | Out-of-bounds metrics (e.g., negative dispensary ratings or $>5.0$) | Normalize value to valid range or flag for review |
| **7. Invalid Dates** | Future timestamps or dates prior to legal MMJ programs ($<2000$) | Correct to current timestamp or flag corrupted record |
| **8. Missing Geo Fields** | Null state, missing coordinates, or invalid 5-digit zip code | Trigger geocoding enrichment job in orchestrator |
| **9. Invalid Prices** | Consultation prices $< \$20$ or $> \$1,000$ | Mark price record as anomalous; exclude from market index |
| **10. Broken Relationships** | Orphaned price records, dispensary-doctor mappings without parents | Quarantine orphaned records; notify database admin |
| **11. Failed Normalization** | Non-standard state codes (e.g., "Florida" instead of "FL") | Execute automated normalizer rule |
| **12. Unverified Regulations** | Regulatory change lacking official state administrative register citation | Hold in review queue before alerting analysts |

---

## 4. Manual Correction & Deduplication Workflows

### Manual Correction with Audit Trail
Authorized compliance reviewers and platform administrators can correct data points directly via the Operations Center or API (`POST /api/operations/governance/records/correct`):

```json
{
  "entity_type": "competitor",
  "entity_id": 42,
  "field_updates": {
    "consultation_price": 149.00,
    "phone": "+1-850-555-0199"
  },
  "reason": "Verified pricing directly via updated public pricing page",
  "actor_id": "compliance@mmjdocs.com"
}
```

**System Behavior on Correction**:
1. Previous state and new state are diffed and serialized.
2. A permanent row is created in `entity_audit_trail`.
3. Entity's `last_verified_at` is updated to UTC now.
4. Entity's `data_quality_status` transitions to `VERIFIED`.

### Deduplication: Merge vs. Dismiss
Duplicate candidate pairs are surfaced on the Operations Center dashboard:
- **MERGE (`POST /api/operations/governance/duplicates/resolve`)**:
  - Requires `approve_data_quality` permission.
  - Primary master record is retained.
  - Secondary record's child relations (historical prices, reviews, doctor affiliations) are reparented to the master record.
  - Secondary record is archived and marked `MERGED_INTO_{ID}`.
  - Action recorded in `entity_audit_trail`.
- **DISMISS**:
  - Flags pair as a verified false positive (e.g. separate dispensaries belonging to the same chain in adjacent suites).
  - Prevents the deduplication scanner from re-surfacing the pair.

---

## 5. Historical Non-Destructive Storage

Market intelligence requires longitudinal analysis. The platform implements non-destructive historical tracking:
- **Pricing History**: Every competitor price change creates a new record in `competitor_prices` with `effective_date`, `source_url`, and `scraped_at`. Historical prices are never overwritten.
- **Regulatory Changes**: Every state bill, executive order, or health department rule change creates an immutable event in `regulatory_updates`.
- **Opportunity Scoring**: Historical state and county scores are versioned with calculation run identifiers to enable trend analysis over time.
