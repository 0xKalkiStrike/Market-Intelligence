"""
Enterprise Integration Framework — Base Adapter Interface & Core Contracts (Phase 6).
Provides a uniform, decoupled lifecycle for approved external and internal system integrations:
External System -> Adapter -> Auth/Permissions -> Validation -> Normalization -> Entity Resolution -> Business Rules -> Central DB -> Events
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.auth.rbac import validate_safe_url


@dataclass
class NormalizedEntityRecord:
    """Standardized entity payload emitted by integration adapters."""
    external_id: str
    entity_type: str  # DOCTOR, DISPENSARY, COMPETITOR
    name: str
    state: str
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    license_number: Optional[str] = None
    estimated_revenue: Optional[str] = None
    pricing_data: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    source_timestamp: Optional[datetime] = None


@dataclass
class SyncResult:
    """Summary metrics of an integration synchronization run."""
    integration_name: str
    status: str  # SUCCESS, PARTIAL, FAILED
    records_processed: int = 0
    records_added: int = 0
    records_updated: int = 0
    duplicates_detected: int = 0
    conflicts_detected: int = 0
    errors_count: int = 0
    checkpoint: Optional[str] = None
    duration_ms: float = 0.0
    error_details: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class BaseIntegrationAdapter(ABC):
    """
    Abstract Base Class for all Enterprise Integration Adapters.
    Every integration must inherit from this class and implement the documented lifecycle.
    """

    def __init__(
        self,
        name: str,
        provider: str,
        integration_type: str,
        business_purpose: str,
        base_url: Optional[str] = None,
        sync_frequency: str = "HOURLY",
        supported_entities: Optional[List[str]] = None,
    ):
        self.name = name
        self.provider = provider
        self.integration_type = integration_type
        self.business_purpose = business_purpose
        self.base_url = base_url
        self.sync_frequency = sync_frequency
        self.supported_entities = supported_entities or ["DOCTOR", "DISPENSARY", "COMPETITOR"]

    def validate_destination_url(self) -> None:
        """Enforces SSRF prevention on configured base URLs."""
        if self.base_url and self.base_url.startswith("http"):
            validate_safe_url(self.base_url)

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Verifies live connectivity to the upstream system."""
        pass

    @abstractmethod
    def validate_payload(self, raw_data: Any) -> Any:
        """Validates incoming payload against schema; rejects invalid or prohibited (e.g. PHI) data."""
        pass

    @abstractmethod
    def normalize_records(self, raw_data: Any) -> List[NormalizedEntityRecord]:
        """Transforms provider-specific structures into uniform NormalizedEntityRecord instances."""
        pass

    @abstractmethod
    def sync(
        self,
        db: Session,
        checkpoint: Optional[str] = None,
        limit: int = 100,
        incremental: bool = True,
    ) -> SyncResult:
        """Executes full or incremental data synchronization into the platform database."""
        pass
