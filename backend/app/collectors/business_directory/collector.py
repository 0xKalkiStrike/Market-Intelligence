from typing import Any, Dict, List
from app.collectors.base_collector import BaseCollector


class BusinessDirectoryCollector(BaseCollector):
    """Collector for Dispensaries and Clinics -- pulls live public records
    (OpenStreetMap Overpass) via base_collector's generate_dynamic_records().
    No fabricated/placeholder data."""

    def __init__(self):
        super().__init__(source_name="Public Business Directory", base_url="https://businessdirectory.org")

    def collect(self, query: str = "", location: str = "", max_records: int = 0) -> List[Dict[str, Any]]:
        return self.generate_dynamic_records(
            entity_type="DISPENSARY",
            query=query,
            location=location,
            target_count=max_records,
        )

    def validate(self, record: Dict[str, Any]) -> bool:
        return bool(record.get("name") and record.get("entity_type"))

    def normalize(self, record: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": record.get("name", "").strip(),
            "entity_type": record.get("entity_type", "DISPENSARY"),
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
            "dispensary_detail": {
                "business_type": record.get("business_type"),
                "operating_hours": record.get("operating_hours"),
                "services": record.get("services") or record.get("products_services"),
                "license_info": record.get("license_info"),
                "products_offered": record.get("products_offered") or record.get("products_services"),
            },
            "source_name": record.get("source_name", self.source_name),
            "source_url": record.get("source_url", self.base_url),
            "raw_payload": str(record),
        }
