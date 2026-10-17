# Controlled Data Import & Export Centers

**Services**: `app/services/data_import_service.py` & `app/services/data_export_service.py`  
**Security Standard**: Pre-screening Validation, Role-Aware Internal Metric Redaction

---

## 1. Controlled Data Import Center

The Data Import Center enables authorized users to ingest external datasets (e.g., licensed dispensary registries, physician licensing lists, competitor directories) safely without corrupting production tables.

### Import Workflow Architecture

```text
+-----------------------+
|  File Upload (CSV/JSON)
+-----------+-----------+
            |
            v
+-----------------------+
| File Pre-Screening    | --> Validates encoding, format, structure, size (<10MB)
| & Header Parsing      |
+-----------+-----------+
            |
            v
+-----------------------+
| Preview Generation    | --> Returns detected row count, column headers, and top 5 sample rows
+-----------+-----------+
            |
            v
+-----------------------+
| Column Mapping Config | --> Maps external headers (e.g. "dispensary_name" -> "name")
+-----------+-----------+
            |
            v
+-----------------------+
| Record Ingestion &    | --> Checks duplicates by normalized name in target state
| Duplicate Detection   |     - If exists: updates missing attributes, increments updated_records
|                       |     - If new: creates Entity, Location, Contact, and Detail records
+-----------+-----------+
            |
            v
+-----------------------+
| Audit Log & Summary   | --> Records added, updated, duplicates, and errors to data_imports table
+-----------------------+
```

### Import Execution Request
`POST /api/v1/governed/imports/execute`
- Form fields:
  - `file`: CSV or JSON file payload
  - `entity_type`: `DISPENSARY`, `DOCTOR`, or `COMPETITOR`
  - `column_mapping_json`: JSON string mapping file headers to canonical fields:
    ```json
    {
      "name": "facility_name",
      "state": "state_code",
      "city": "municipality",
      "phone": "telephone",
      "website": "url",
      "revenue": "annual_est_revenue"
    }
    ```

### Execution Response
```json
{
  "import_id": "b4c5d6e7-f8a9-0123-bcde-456789012345",
  "status": "COMPLETED",
  "total_records": 150,
  "added_records": 142,
  "updated_records": 8,
  "duplicate_records": 8,
  "error_records": 0,
  "error_details": []
}
```

---

## 2. Controlled Data Export Center

The Export Center provides role-governed data exports to CSV or JSON formats.

### Security & Redaction Boundaries
Proprietary MMJ-DOCS business data (such as actual internal clinic consultation volumes and patient revenue) is strictly protected.

When an export is generated:
1. If the caller holds `internal_metrics:read`, full numbers are exported.
2. If the caller is a standard researcher or unprivileged API client, proprietary internal fields are replaced with `"[RESTRICTED - INTERNAL MMJ-DOCS DATA]"`.
3. An audit record is committed to `export_jobs` capturing the exporting user, format, query filters, and the number of redacted fields.

### Export Generation Request
`POST /api/v1/governed/exports/generate?export_name=Q4_Dispensary_Report&format_type=CSV&entity_type=DISPENSARY&state_filter=FL`

### Export Response
```json
{
  "job_id": "c5d6e7f8-a9b0-1234-cdef-567890123456",
  "export_name": "Q4_Dispensary_Report",
  "format": "CSV",
  "total_records": 420,
  "content": "id,name,type,state,city,phone,website,quality_status,estimated_revenue,created_at\r\n...",
  "redacted_fields_count": 420,
  "is_redacted": true
}
```
