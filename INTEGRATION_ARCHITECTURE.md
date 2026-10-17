# Enterprise Integration Architecture

**Document Version**: 1.0.0 (Phase 6)  
**Target Systems**: MMJ-DOCS Internal Operations, State Department of Health Registries, Surface Directory Adapters  
**Security Classification**: Highly Governed / Surface Web & Internal Aggregates

---

## 1. Architectural Philosophy

Every enterprise integration connected to the MMJ-DOCS platform must solve a documented business problem and provide measurable market value. The integration layer does not assume every external provider behaves identically; instead, it enforces a strict adapter abstraction where:
1. All inputs pass through format normalization.
2. Ingested data is strictly vetted against the Zero-PHI boundary filter.
3. Identities are resolved against canonical entities.
4. Conflicting evidence is preserved and weighted by source authority.
5. Connectivity and synchronization checkpoints are tracked and auditable.

```text
+-----------------------------------------------------------------------------------+
|                            EXTERNAL OR INTERNAL SOURCE                            |
|       (Public State DOH Registry, Commercial Directory, Internal Aggregate Feed)  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            INTEGRATION ADAPTER LAYER                              |
|                    BaseIntegrationAdapter.sync(checkpoint, options)               |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        SECURITY & PERMISSION VALIDATION                           |
|       - RBAC Scope Check (sources:manage)                                         |
|       - Target URL SSRF Guard (RFC 1918, loopback, AWS metadata blocked)          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       ZERO-PHI BOUNDARY INGESTION FILTER                          |
|       - Regex scan for MRNs, SSNs, patient identifiers, clinical symptom notes    |
|       - Rejects record with ValueError if PHI is detected                         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        NORMALIZATION & ENTITY RESOLUTION                          |
|       - Name normalization (legal suffix stripping)                               |
|       - Multi-signal weighted matching (Domain, License/NPI, Phone, State)        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                         EVIDENCE & CONFLICT RESOLUTION                            |
|       - Authority scoring (State DOH: 100, Internal: 90, Scrape: 40)               |
|       - Conflicting records preserved in data_conflicts for audit                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                          PERSISTENCE & EVENT DISPATCH                             |
|       - Core Database Transaction                                                 |
|       - EventDispatcher fires signed webhooks to verified subscribers             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Standard Adapter Interface (`BaseIntegrationAdapter`)

Located at `backend/app/integrations/adapter.py`, all integration adapters inherit from `BaseIntegrationAdapter`:

```python
class BaseIntegrationAdapter(ABC):
    """
    Standard interface for all external and internal enterprise data adapters.
    Guarantees consistent lifecycle, health probing, checkpointing, and error reporting.
    """

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Returns connector metadata: name, provider, sync frequency, permissions, supported entities."""
        pass

    @abstractmethod
    def probe_connectivity(self) -> Tuple[bool, str]:
        """Performs a live connectivity health probe. Returns (is_healthy, status_message)."""
        pass

    @abstractmethod
    def sync(
        self,
        db: Session,
        checkpoint: Optional[str] = None,
        dry_run: bool = False,
    ) -> SyncResult:
        """Executes an incremental or full synchronization run."""
        pass
```

### Key Data Structures

1. **`NormalizedEntityRecord`**: Represents an external business record normalized to the canonical schema:
   - `entity_type`: `DOCTOR`, `DISPENSARY`, `COMPETITOR`
   - `name`: Cleaned business or provider name
   - `state`: 2-letter postal code
   - `city`, `address`, `phone`, `website`, `license_number`
   - `raw_metadata`: JSON dictionary containing source references

2. **`SyncResult`**: Structured result returned by every sync operation:
   - `records_processed`, `records_added`, `records_updated`, `errors`
   - `checkpoint`: Checkpoint token to resume subsequent sync runs
   - `status`: `SUCCESS`, `PARTIAL`, `FAILED`

---

## 3. MMJ-DOCS Internal System Adapter (`InternalMmjDocsAdapter`)

Located at `backend/app/integrations/internal_adapter.py`, this adapter synchronizes internal operational aggregates:
- **Appointment Aggregates**: State-level volume, completion rates, initial vs. renewal ratios.
- **Revenue Aggregates**: Aggregated gross revenue figures mapped to `StateMarketMetric`.
- **Capacity Demands**: Active certifying physician capacity and patient volume backlogs.

### Strict Zero-PHI Enforcement Guard
To comply with HIPAA Minimum Necessary principles and prevent accidental ingestion of patient health records, the adapter runs every incoming record through `_scan_for_phi_violations()`:

```python
PHI_PATTERNS = [
    re.compile(r"\b(mrn|medical\s*record\s*number)[:\s=]*[A-Z0-9-]{4,}\b", re.IGNORECASE),
    re.compile(r"\b(ssn|social\s*security)[:\s=]*\d{3}-?\d{2}-?\d{4}\b", re.IGNORECASE),
    re.compile(r"\b(patient\s*name|pt\s*name)[:\s=]*[A-Z][a-z]+\s+[A-Z][a-z]+\b", re.IGNORECASE),
    re.compile(r"\b(diagnosis|symptom|prescription|dosage|intake\s*notes?)[:\s=]", re.IGNORECASE),
    re.compile(r"\b(dob|date\s*of\s*birth)[:\s=]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", re.IGNORECASE),
]
```

If any PHI pattern is matched, the record is immediately aborted, logged to security audit logs, and raised as a `ValueError("PHI Violation: Record contains prohibited health or patient identifier")`.

---

## 4. Integration Registry & Health Monitoring

The Integration Registry (`backend/app/services/integration_registry_service.py`) manages the operational state of connectors:

1. **Registry Records**:
   - `name`: Unique connector identifier (e.g., `MMJ_DOCS_INTERNAL_AGGREGATES`)
   - `provider`: Organization or authority managing the feed
   - `integration_type`: `INTERNAL_API`, `PUBLIC_SURFACE_FEED`, `COMMERCIAL_DIRECTORY`
   - `connection_status`: Live verified status (`HEALTHY`, `DEGRADED`, `UNCONFIGURED`, `DISABLED`)
   - `sync_frequency`: `HOURLY`, `DAILY`, `WEEKLY`
   - `last_sync_checkpoint`: Checkpoint timestamp for incremental resumption

2. **Dynamic Health Verification**:
   - The platform never reports an integration as healthy merely because its configuration exists.
   - Calling `/api/v1/governed/integrations/{name}/probe` invokes `probe_connectivity()` on the adapter, performing a network handshake or synthetic query before updating `connection_status`.
