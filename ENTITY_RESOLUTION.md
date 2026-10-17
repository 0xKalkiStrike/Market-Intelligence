# Cross-System Entity Resolution

**Service Layer**: `app/services/entity_resolution_service.py`  
**Matching Algorithm**: Multi-Signal Probabilistic & Deterministic Weighted Matcher  
**Status Thresholds**: `CONFIRMED` (>= 0.75), `PENDING_REVIEW` (0.20 – 0.74), `UNMATCHED` (< 0.20)

---

## 1. Problem Statement

Across public licensing bodies, Google Places listings, and MMJ-DOCS internal databases, identical healthcare and dispensary businesses appear under divergent variations:

```text
State DOH Registry:   CURALEAF FLORIDA LLC (License: MMTC-2017-001)
Google Places:        Curaleaf Dispensary Orlando East
Internal System:      Curaleaf - East Colonial
Third-Party Feed:     Curaleaf Medical Marijuana Treatment Center
```

Merely comparing raw strings leads to catastrophic false positives (merging unrelated clinics) or fragmented duplicate records. The Entity Resolution Service provides traceable, multi-signal identity matching.

---

## 2. Multi-Signal Matching Architecture

```text
Incoming Entity Record (External System, ID, Name, State, Phone, Domain, License)
                                |
                                v
                   Target State Candidate Pool
             (All Entities with Location in State)
                                |
                                v
               Multi-Signal Scoring per Candidate
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
License / NPI Match     Domain / Website        10-Digit Phone
Exact Match (+0.40)     Clean Match (+0.35)     Normalized (+0.30)
        |                       |                       |
        +-----------------------+-----------------------+
                                |
                                v
                Physical Address Match (+0.20)
                Alphanumeric Substring Containment
                                |
                                v
                Tokenized Name Similarity (+0.35 * sim)
                (LLC / Corp / Inc / Clinic stripped)
                                |
                                v
             Composite Match Score (0.00 to 1.00)
                                |
          +---------------------+---------------------+
          |                                           |
          v                                           v
Score >= 0.75: CONFIRMED                     0.20 <= Score < 0.75: PENDING_REVIEW
Canonical Link auto-bound                    Recorded in cross_system_entity_links
Production data enriched                     Flagged for human operator review
```

---

## 3. Signal Weights and Match Rules

| Matching Signal | Weight | Matching Criteria |
| :--- | :--- | :--- |
| **Public License / NPI** | +0.40 | Exact string match against `dispensary_details.license_info` or `doctor_details.license_number` |
| **Domain / Website** | +0.35 | Normalized domain match (protocol `http/https`, `www`, and trailing slashes stripped) |
| **10-Digit Phone** | +0.30 | Exact match on trailing 10 numeric digits (ignoring punctuation and country codes) |
| **Physical Address** | +0.20 | Alphanumeric normalized address token overlap |
| **Tokenized Name Similarity** | up to +0.35 | Word token set intersection over union after stripping legal suffixes (`llc`, `inc`, `corp`, `group`, `services`, `center`) |

### Non-Negotiable Rule
**Never merge entities solely because their names look similar.** If only name similarity matches and all other signals are absent, the composite score remains strictly below 0.35, resulting in a `PENDING_REVIEW` link rather than an automatic destructive merge.

---

## 4. API Resolution Endpoint

`POST /api/v1/governed/entity-resolution/resolve`

### Input Payload
```json
{
  "system_name": "STATE_DOH",
  "external_id": "DOH-DISP-9921",
  "name": "Curaleaf Dispensary",
  "state": "FL",
  "license_number": "MMTC-2026-004",
  "website": "https://curaleaf.com"
}
```

### Resolution Output
```json
{
  "link_id": "d1e2f3a4-b5c6-7890-abcd-ef0123456789",
  "canonical_entity_id": "014acb86-a650-416b-a979-99102fda8780",
  "system_name": "STATE_DOH",
  "external_system_id": "DOH-DISP-9921",
  "match_confidence": 0.85,
  "review_status": "CONFIRMED",
  "reasons": [
    "Public License / NPI exact match: MMTC-2026-004",
    "Domain match: curaleaf.com",
    "Name similarity 85%"
  ],
  "is_new": true
}
```
