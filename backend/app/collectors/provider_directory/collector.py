from typing import Any, Dict, List
from app.collectors.base_collector import BaseCollector


class ProviderDirectoryCollector(BaseCollector):
    """Collector for Healthcare Providers & Doctors -- pulls live public records
    (Official NPI Registry, OpenStreetMap Overpass) via base_collector's
    generate_dynamic_records(). No fabricated/placeholder data."""

    def __init__(self):
        super().__init__(source_name="Public Healthcare Registry", base_url="https://registry.health.gov")

    def collect(self, query: str = "", location: str = "", max_records: int = 0) -> List[Dict[str, Any]]:
        return self.generate_dynamic_records(
            entity_type="DOCTOR",
            query=query,
            location=location,
            target_count=max_records,
        )

    def validate(self, record: Dict[str, Any]) -> bool:
        return bool(record.get("name") and record.get("entity_type"))

    def normalize(self, record: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": record.get("name", "").strip(),
            "entity_type": record.get("entity_type", "DOCTOR"),
            "location": {
                "address": record.get("address"),
                "city": record.get("city"),
                "state": record.get("state"),
                "zip_code": record.get("zip_code"),
                "country": "USA",
            },
            "contact": {
                "phone": record.get("phone"),
                "email": record.get("email"),
                "website": record.get("website"),
            },
            "doctor_detail": {
                "title": record.get("title"),
                "specialty": record.get("specialty"),
                "organization": record.get("organization"),
                "clinic_name": record.get("clinic_name"),
                "license_number": record.get("license_number"),
                "services": record.get("services"),
            },
            "source_name": record.get("source_name", self.source_name),
            "source_url": record.get("source_url", self.base_url),
            "raw_payload": str(record),
        }
