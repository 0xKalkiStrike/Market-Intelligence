"""
Enterprise Incident Management Service & Runbooks (Phase 5).
Tracks, triages, mitigates, and resolves platform operational incidents with:
- Severity Levels: CRITICAL, HIGH, MEDIUM, LOW
- Status Workflow: OPEN -> INVESTIGATING -> MITIGATED -> RESOLVED -> CLOSED
- Root Cause Analysis (RCA) and Corrective Action Tracking
- Standardized SRE Runbooks for common failure modes
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.models import IncidentRecord, utc_now

INCIDENT_RUNBOOKS: Dict[str, Dict[str, Any]] = {
    "DATABASE_CONNECTION_LOSS": {
        "title": "Runbook: Database Connection Failure or Pool Exhaustion",
        "severity": "CRITICAL",
        "immediate_actions": [
            "Verify database server availability (Postgres service / SQLite lock).",
            "Check connection pool usage via /api/health/dependencies.",
            "Verify disk space on database mount (ensure > 1GB free).",
            "Restart backend service or bounce database connection pool.",
        ],
        "investigation_steps": [
            "Inspect slow queries in /api/audit and application logs.",
            "Review transaction locks using PRAGMA lock_status or pg_stat_activity.",
        ],
        "rollback_procedure": "If schema migration caused the deadlock, roll back to previous Alembic revision.",
    },
    "EXTERNAL_PROVIDER_RATE_LIMITED": {
        "title": "Runbook: External Connector 429 Rate Limiting or Quota Exhaustion",
        "severity": "HIGH",
        "immediate_actions": [
            "Verify circuit breaker state for provider in /api/integrations/status.",
            "Pause non-critical background collection tasks for affected provider.",
            "Switch to secondary fall-back provider or cached records.",
        ],
        "investigation_steps": [
            "Review request frequency and concurrent worker threads in /api/orchestration/metrics.",
            "Contact provider to request temporary quota increase if urgent.",
        ],
        "rollback_procedure": "Reset circuit breaker via /api/integrations/{name}/reset once quota resets.",
    },
    "COLLECTOR_WORKER_FAILURE": {
        "title": "Runbook: Collector Worker Crash or Timeout",
        "severity": "MEDIUM",
        "immediate_actions": [
            "Inspect failed run in /api/orchestration/tasks?status=DEAD_LETTER.",
            "Check error trace for CAPTCHA, blocked domain, or schema change.",
            "Verify target surface-web source URL is accessible.",
        ],
        "investigation_steps": [
            "Check parser version in collector metadata.",
            "Ensure surface-web compliance rules are adhered to (no dark web/auth bypass).",
        ],
        "rollback_procedure": "Re-queue dead letter task via /api/orchestration/tasks/{id}/retry.",
    },
    "QUEUE_BACKPRESSURE_SURGE": {
        "title": "Runbook: Internal Workload Queue Backpressure Exceeded",
        "severity": "HIGH",
        "immediate_actions": [
            "Check current queue depth in /api/orchestration/metrics.",
            "Pause low-priority tasks (priority > 7).",
            "Scale worker pool concurrency limit if CPU/Memory permits.",
        ],
        "investigation_steps": [
            "Identify slowest workload category blocking worker threads.",
            "Ensure task timeouts (120s) are aborting unresponsive jobs.",
        ],
        "rollback_procedure": "Drain or cancel stalled tasks via /api/orchestration/tasks/{id}/cancel.",
    },
    "BACKUP_INTEGRITY_FAILURE": {
        "title": "Runbook: Backup Checksum Mismatch or Restoration Error",
        "severity": "CRITICAL",
        "immediate_actions": [
            "Trigger an immediate on-demand verified backup via BackupManager.",
            "Inspect storage mount permissions and disk space in /api/health/dependencies.",
            "Do NOT run destructive actions on production database.",
        ],
        "investigation_steps": [
            "Verify last successful verified backup in storage/backups/.",
            "Validate SHA256 checksum and PRAGMA quick_check on historical snapshots.",
        ],
        "rollback_procedure": "Restore most recent verified healthy snapshot into isolated sandbox.",
    },
}


class IncidentManagementService:
    def __init__(self, db: Session):
        self.db = db

    def list_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(IncidentRecord)
        if status:
            query = query.filter(IncidentRecord.status == status)
        if severity:
            query = query.filter(IncidentRecord.severity == severity)

        records = query.order_by(IncidentRecord.started_at.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "severity": r.severity,
                "affected_component": r.affected_component,
                "status": r.status,
                "detection_method": r.detection_method,
                "description": r.description,
                "impact": r.impact,
                "assigned_owner": r.assigned_owner or "Unassigned",
                "root_cause": r.root_cause,
                "corrective_action": r.corrective_action,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "closed_at": r.closed_at.isoformat() if r.closed_at else None,
            }
            for r in records
        ]

    def create_incident(
        self,
        title: str,
        severity: str,
        affected_component: str,
        description: str,
        impact: Optional[str] = None,
        assigned_owner: Optional[str] = None,
        detection_method: str = "MANUAL_REPORT",
    ) -> IncidentRecord:
        incident = IncidentRecord(
            title=title,
            severity=severity.upper(),
            affected_component=affected_component,
            description=description,
            impact=impact,
            assigned_owner=assigned_owner,
            detection_method=detection_method,
            status="OPEN",
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def update_incident_status(
        self,
        incident_id: str,
        status: str,
        resolution_notes: Optional[str] = None,
        root_cause: Optional[str] = None,
        corrective_action: Optional[str] = None,
        assigned_owner: Optional[str] = None,
    ) -> IncidentRecord:
        incident = self.db.get(IncidentRecord, incident_id)
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        incident.status = status.upper()
        if assigned_owner:
            incident.assigned_owner = assigned_owner
        if root_cause:
            incident.root_cause = root_cause
        if corrective_action:
            incident.corrective_action = corrective_action

        if status.upper() in ("RESOLVED", "CLOSED"):
            incident.resolved_at = datetime.now(timezone.utc)
            if status.upper() == "CLOSED":
                incident.closed_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(incident)
        return incident

    def get_runbooks(self) -> Dict[str, Dict[str, Any]]:
        return INCIDENT_RUNBOOKS
