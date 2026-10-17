"""
Intelligence Case Management Service (Phase 6).
Provides a lightweight investigative case workflow for significant market signals:
Signal -> Case Created -> Evidence Attached -> Reviewer Assigned -> Investigation -> Management Decision -> Outcome Recorded
Categories:
- COMPETITOR_MOVEMENT
- PRICING_CHANGE
- REGULATORY_REVIEW
- GEOGRAPHIC_OPPORTUNITY
- PARTNERSHIP_OPPORTUNITY
- DATA_QUALITY_INCIDENT
- FORECAST_DEVIATION
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.models import IntelligenceCase, utc_now


CASE_CATEGORIES = [
    "COMPETITOR_MOVEMENT",
    "PRICING_CHANGE",
    "REGULATORY_REVIEW",
    "GEOGRAPHIC_OPPORTUNITY",
    "PARTNERSHIP_OPPORTUNITY",
    "DATA_QUALITY_INCIDENT",
    "FORECAST_DEVIATION",
]


class CaseManagementService:
    """Manages the lifecycle of intelligence investigation cases."""

    def __init__(self, db: Session):
        self.db = db

    def create_case(
        self,
        title: str,
        category: str,
        evidence_summary: str,
        severity: str = "MEDIUM",
        assigned_investigator: Optional[str] = None,
        assigned_reviewer: Optional[str] = None,
    ) -> IntelligenceCase:
        cat_upper = category.upper()
        if cat_upper not in CASE_CATEGORIES:
            raise ValueError(f"Invalid category '{category}'. Must be one of: {', '.join(CASE_CATEGORIES)}")

        # Sequential case number: CASE-YYYY-XXXX
        year = datetime.now(timezone.utc).year
        count = self.db.query(IntelligenceCase).count() + 1
        case_number = f"CASE-{year}-{count:04d}"

        case = IntelligenceCase(
            case_number=case_number,
            title=title,
            category=cat_upper,
            severity=severity.upper(),
            status="OPEN",
            evidence_summary=evidence_summary,
            assigned_investigator=assigned_investigator,
            assigned_reviewer=assigned_reviewer,
        )
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case

    def list_cases(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(IntelligenceCase)
        if category and category.upper() != "ALL":
            query = query.filter(IntelligenceCase.category == category.upper())
        if status and status.upper() != "ALL":
            query = query.filter(IntelligenceCase.status == status.upper())
        if severity and severity.upper() != "ALL":
            query = query.filter(IntelligenceCase.severity == severity.upper())

        cases = query.order_by(IntelligenceCase.created_at.desc()).limit(100).all()

        return [
            {
                "id": c.id,
                "case_number": c.case_number,
                "title": c.title,
                "category": c.category,
                "severity": c.severity,
                "status": c.status,
                "evidence_summary": c.evidence_summary,
                "investigation_findings": c.investigation_findings,
                "management_decision": c.management_decision,
                "outcome_recorded": c.outcome_recorded,
                "assigned_investigator": c.assigned_investigator,
                "assigned_reviewer": c.assigned_reviewer,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "closed_at": c.closed_at.isoformat() if c.closed_at else None,
            }
            for c in cases
        ]

    def update_investigation(
        self,
        case_id: str,
        investigation_findings: str,
        new_status: str = "REVIEW_REQUIRED",
    ) -> Dict[str, Any]:
        case = self.db.get(IntelligenceCase, case_id)
        if not case:
            raise ValueError("Case not found.")
        case.investigation_findings = investigation_findings
        case.status = new_status.upper()
        case.updated_at = utc_now()
        self.db.commit()
        return {
            "case_id": case.id,
            "case_number": case.case_number,
            "status": case.status,
            "investigation_findings": case.investigation_findings,
        }

    def record_decision_and_outcome(
        self,
        case_id: str,
        management_decision: str,
        outcome_recorded: Optional[str] = None,
        close_case: bool = True,
    ) -> Dict[str, Any]:
        case = self.db.get(IntelligenceCase, case_id)
        if not case:
            raise ValueError("Case not found.")
        case.management_decision = management_decision
        if outcome_recorded:
            case.outcome_recorded = outcome_recorded
        case.status = "CLOSED" if close_case else "DECISION_RECORDED"
        case.updated_at = utc_now()
        if close_case:
            case.closed_at = utc_now()
        self.db.commit()
        return {
            "case_id": case.id,
            "case_number": case.case_number,
            "status": case.status,
            "management_decision": case.management_decision,
            "outcome_recorded": case.outcome_recorded,
        }
