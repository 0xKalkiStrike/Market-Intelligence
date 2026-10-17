"""
Controlled Data Export Center Service (Phase 6).
Provides secure, permission-governed data exports:
- Supports CSV and JSON formats
- Granular column selection, state filters, and entity type filters
- Enforces internal MMJ-DOCS business data redaction for non-authorized roles
- Maintains full audit log in export_jobs table
"""
import csv
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.auth.api_key_auth import AuthenticatedPrincipal
from app.database.models import Entity, ExportJob, utc_now


RESTRICTED_EXPORT_FIELDS = {
    "estimated_revenue",
    "appointment_volume",
    "physician_capacity",
    "internal_cost",
    "workload_target",
}


class DataExportService:
    """Manages governed exports with permission-based masking and job history."""

    def __init__(self, db: Session):
        self.db = db

    def generate_export(
        self,
        export_name: str,
        format_type: str,
        entity_type: str = "ALL",
        state_filter: Optional[str] = None,
        selected_fields: Optional[List[str]] = None,
        principal: Optional[AuthenticatedPrincipal] = None,
    ) -> Dict[str, Any]:
        """
        Generates controlled export payload, applying security redaction if caller lacks internal_metrics:read.
        """
        fmt = format_type.upper()
        if fmt not in ("CSV", "JSON"):
            raise ValueError(f"Unsupported export format '{format_type}'. Must be CSV or JSON.")

        # 1. Check authorization for restricted business metrics
        can_read_internal = False
        if principal:
            can_read_internal = principal.has_scope("internal_metrics:read")

        # 2. Query entities
        from app.database.models import EntityLocation
        query = self.db.query(Entity)
        if entity_type and entity_type.upper() != "ALL":
            query = query.filter(Entity.entity_type == entity_type.upper())
        if state_filter and state_filter.upper() != "ALL":
            query = query.join(Entity.locations).filter(EntityLocation.state == state_filter.upper())

        entities = query.limit(2000).all()

        # 3. Build rows
        default_fields = ["id", "name", "type", "state", "city", "phone", "website", "quality_status", "estimated_revenue", "created_at"]
        fields = selected_fields or default_fields

        rows = []
        for ent in entities:
            state = ent.locations[0].state if ent.locations else ""
            city = ent.locations[0].city if ent.locations else ""
            address = ent.locations[0].address if ent.locations else ""
            phone = ent.contacts[0].phone if ent.contacts else ""
            website = ent.contacts[0].website if ent.contacts else ""

            row_dict = {
                "id": ent.id,
                "name": ent.name,
                "type": ent.entity_type,
                "state": state,
                "city": city,
                "address": address,
                "phone": phone,
                "website": website,
                "quality_status": ent.verification_status,
                "estimated_revenue": ent.estimated_revenue if can_read_internal else "[RESTRICTED - INTERNAL MMJ-DOCS DATA]",
                "created_at": ent.created_at.isoformat() if ent.created_at else "",
            }

            filtered_row = {k: row_dict.get(k, "") for k in fields}
            rows.append(filtered_row)

        # 4. Format Output
        content_str = ""
        content_type = "text/plain"
        if fmt == "CSV":
            out = io.StringIO()
            writer = csv.DictWriter(out, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
            content_str = out.getvalue()
            content_type = "text/csv"
        elif fmt == "JSON":
            content_str = json.dumps(rows, indent=2)
            content_type = "application/json"

        # 5. Log Export Job
        job = ExportJob(
            export_name=export_name,
            entity_type=entity_type.upper(),
            format=fmt,
            filters_json=json.dumps({"state": state_filter or "ALL"}),
            fields_json=json.dumps(fields),
            status="COMPLETED",
            record_count=len(rows),
            created_by=principal.identifier if principal else "anonymous",
            completed_at=datetime.now(timezone.utc),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        return {
            "job_id": job.id,
            "export_name": export_name,
            "format": fmt,
            "record_count": len(rows),
            "content": content_str,
            "content_type": content_type,
            "filename": f"{export_name.lower().replace(' ', '_')}_{int(datetime.now(timezone.utc).timestamp())}.{fmt.lower()}",
            "created_at": job.created_at.isoformat(),
        }

    def list_export_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        jobs = (
            self.db.query(ExportJob)
            .order_by(ExportJob.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": j.id,
                "export_name": j.export_name,
                "entity_type": j.entity_type,
                "format": j.format,
                "status": j.status,
                "record_count": j.record_count,
                "created_by": j.created_by,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            }
            for j in jobs
        ]
