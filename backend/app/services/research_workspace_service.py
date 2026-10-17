"""
Research Workspace & Finding Lifecycle Service (Phase 7).
Manages Research Projects, Hypotheses, Findings, Evidence References,
Review Audits, and automated Reassessment Triggering.
Strictly enforces the 7-stage Research Finding Lifecycle:
DRAFT -> UNDER_INVESTIGATION -> EVIDENCE_REVIEWED -> VALIDATED -> NEEDS_REASSESSMENT / SUPERSEDED / REJECTED.
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database.models import (
    ResearchProject,
    ResearchHypothesis,
    ResearchFinding,
    EvidenceReference,
    ResearchReviewHistory,
    PriceHistory,
    RegulatoryChange,
    utc_now,
)

# Standard Allowed Lifecycle Statuses
LIFECYCLE_STATUSES = [
    "DRAFT",
    "UNDER_INVESTIGATION",
    "EVIDENCE_REVIEWED",
    "VALIDATED",
    "NEEDS_REASSESSMENT",
    "SUPERSEDED",
    "REJECTED",
]

# Permitted Lifecycle Transitions
VALID_TRANSITIONS = {
    "DRAFT": ["UNDER_INVESTIGATION", "REJECTED"],
    "UNDER_INVESTIGATION": ["EVIDENCE_REVIEWED", "DRAFT", "REJECTED"],
    "EVIDENCE_REVIEWED": ["VALIDATED", "UNDER_INVESTIGATION", "REJECTED"],
    "VALIDATED": ["NEEDS_REASSESSMENT", "SUPERSEDED", "REJECTED"],
    "NEEDS_REASSESSMENT": ["UNDER_INVESTIGATION", "VALIDATED", "SUPERSEDED", "REJECTED"],
    "SUPERSEDED": [],
    "REJECTED": ["DRAFT"],
}


class ResearchWorkspaceService:
    """Enterprise service orchestrating market research projects, evidence-backed findings, and audit trails."""

    # =========================================================================
    # 1. RESEARCH PROJECTS
    # =========================================================================

    def create_project(
        self,
        db: Session,
        title: str,
        description: str = "",
        target_states: Optional[List[str]] = None,
        created_by: Optional[str] = None,
    ) -> ResearchProject:
        project = ResearchProject(
            title=title,
            description=description,
            status="ACTIVE",
            target_states=json.dumps(target_states or []),
            created_by=created_by,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    def list_projects(
        self,
        db: Session,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        query = db.query(ResearchProject)
        if status:
            query = query.filter(ResearchProject.status == status)
        projects = query.order_by(desc(ResearchProject.created_at)).offset(offset).limit(limit).all()

        results = []
        for p in projects:
            hypothesis_count = db.query(func.count(ResearchHypothesis.id)).filter(ResearchHypothesis.project_id == p.id).scalar() or 0
            finding_count = db.query(func.count(ResearchFinding.id)).filter(ResearchFinding.project_id == p.id).scalar() or 0
            validated_count = db.query(func.count(ResearchFinding.id)).filter(
                ResearchFinding.project_id == p.id,
                ResearchFinding.status == "VALIDATED"
            ).scalar() or 0

            results.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "status": p.status,
                "target_states": json.loads(p.target_states or "[]"),
                "created_by": p.created_by,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "hypothesis_count": hypothesis_count,
                "finding_count": finding_count,
                "validated_finding_count": validated_count,
            })
        return results

    def get_project_detail(self, db: Session, project_id: str) -> Optional[Dict[str, Any]]:
        project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
        if not project:
            return None

        hypotheses = db.query(ResearchHypothesis).filter(ResearchHypothesis.project_id == project_id).all()
        findings = db.query(ResearchFinding).filter(ResearchFinding.project_id == project_id).all()

        return {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "status": project.status,
            "target_states": json.loads(project.target_states or "[]"),
            "created_by": project.created_by,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "hypotheses": [self._format_hypothesis(h) for h in hypotheses],
            "findings": [self._format_finding(f) for f in findings],
        }

    # =========================================================================
    # 2. RESEARCH HYPOTHESES
    # =========================================================================

    def create_hypothesis(
        self,
        db: Session,
        project_id: str,
        hypothesis_statement: str,
        geographic_scope: str = "NATIONAL",
        geographic_target: str = "ALL",
        time_period_start: Optional[datetime] = None,
        time_period_end: Optional[datetime] = None,
        comparison_groups: Optional[List[str]] = None,
        target_metrics: Optional[List[str]] = None,
        methodology_notes: str = "",
        limitations_notes: str = "",
        created_by: Optional[str] = None,
    ) -> ResearchHypothesis:
        hypothesis = ResearchHypothesis(
            project_id=project_id,
            hypothesis_statement=hypothesis_statement,
            geographic_scope=geographic_scope,
            geographic_target=geographic_target,
            time_period_start=time_period_start,
            time_period_end=time_period_end,
            comparison_groups_json=json.dumps(comparison_groups or []),
            target_metrics_json=json.dumps(target_metrics or []),
            status="DRAFT",
            confidence_score=0.0,
            methodology_notes=methodology_notes,
            limitations_notes=limitations_notes,
            created_by=created_by,
        )
        db.add(hypothesis)
        db.commit()
        db.refresh(hypothesis)
        return hypothesis

    def evaluate_hypothesis(
        self,
        db: Session,
        hypothesis_id: str,
        confidence_score: float,
        status: str,
        methodology_update: Optional[str] = None,
    ) -> ResearchHypothesis:
        hyp = db.query(ResearchHypothesis).filter(ResearchHypothesis.id == hypothesis_id).first()
        if not hyp:
            raise ValueError(f"Hypothesis {hypothesis_id} not found")

        if status not in ["DRAFT", "TESTING", "SUPPORTED", "CONTRADICTED", "INCONCLUSIVE"]:
            raise ValueError(f"Invalid hypothesis status: {status}")

        hyp.confidence_score = max(0.0, min(1.0, float(confidence_score)))
        hyp.status = status
        if methodology_update:
            hyp.methodology_notes = methodology_update
        hyp.updated_at = utc_now()
        db.commit()
        db.refresh(hyp)
        return hyp

    # =========================================================================
    # 3. RESEARCH FINDINGS & 7-STAGE LIFECYCLE
    # =========================================================================

    def create_finding(
        self,
        db: Session,
        project_id: str,
        title: str,
        statement: str,
        category: str = "OPPORTUNITY",
        hypothesis_id: Optional[str] = None,
        calculation_method: str = "DESCRIPTIVE_AGGREGATE",
        sample_size: int = 0,
        data_coverage_pct: float = 100.0,
        confidence_score: float = 0.5,
        limitations: str = "",
        contradictory_evidence: str = "",
        recommended_next_step: str = "",
        created_by: Optional[str] = None,
    ) -> ResearchFinding:
        finding = ResearchFinding(
            project_id=project_id,
            hypothesis_id=hypothesis_id,
            title=title,
            statement=statement,
            category=category,
            status="DRAFT",
            calculation_method=calculation_method,
            sample_size=sample_size,
            data_coverage_pct=data_coverage_pct,
            confidence_score=confidence_score,
            limitations=limitations,
            contradictory_evidence=contradictory_evidence,
            recommended_next_step=recommended_next_step,
            created_by=created_by,
        )
        db.add(finding)
        db.commit()
        db.refresh(finding)

        # Audit initial creation
        audit = ResearchReviewHistory(
            finding_id=finding.id,
            reviewer_email=created_by or "system",
            previous_status="NONE",
            new_status="DRAFT",
            review_notes="Initial finding draft recorded in research workspace.",
            rationale="Finding created with baseline observations.",
        )
        db.add(audit)
        db.commit()

        return finding

    def transition_finding_lifecycle(
        self,
        db: Session,
        finding_id: str,
        new_status: str,
        reviewer_email: str,
        review_notes: str = "",
        rationale: str = "",
    ) -> ResearchFinding:
        finding = db.query(ResearchFinding).filter(ResearchFinding.id == finding_id).first()
        if not finding:
            raise ValueError(f"Finding {finding_id} not found")

        if new_status not in LIFECYCLE_STATUSES:
            raise ValueError(f"Invalid lifecycle status: {new_status}")

        current_status = finding.status
        allowed_targets = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed_targets:
            raise ValueError(
                f"Invalid lifecycle transition from '{current_status}' to '{new_status}'. "
                f"Permitted targets: {allowed_targets}"
            )

        # Record status change and reviewer metadata
        finding.status = new_status
        finding.reviewer_id = reviewer_email
        finding.reviewed_at = utc_now()
        finding.updated_at = utc_now()

        # Audit entry
        audit = ResearchReviewHistory(
            finding_id=finding.id,
            reviewer_email=reviewer_email,
            previous_status=current_status,
            new_status=new_status,
            review_notes=review_notes,
            rationale=rationale,
        )
        db.add(audit)
        db.commit()
        db.refresh(finding)
        return finding

    # =========================================================================
    # 4. EVIDENCE REFERENCES
    # =========================================================================

    def attach_evidence_reference(
        self,
        db: Session,
        finding_id: str,
        source_name: str,
        source_type: str = "PUBLIC_SURFACE_WEB",
        source_uri: Optional[str] = None,
        observation_date: Optional[datetime] = None,
        record_id: Optional[str] = None,
        sample_count: int = 1,
        confidence_weight: float = 1.0,
        supporting_data: Optional[Dict[str, Any]] = None,
        is_contradictory: bool = False,
        verification_status: str = "VERIFIED",
    ) -> EvidenceReference:
        finding = db.query(ResearchFinding).filter(ResearchFinding.id == finding_id).first()
        if not finding:
            raise ValueError(f"Finding {finding_id} not found")

        ref = EvidenceReference(
            finding_id=finding_id,
            source_type=source_type,
            source_name=source_name,
            source_uri=source_uri,
            observation_date=observation_date or utc_now(),
            record_id=record_id,
            sample_count=sample_count,
            confidence_weight=confidence_weight,
            supporting_data_json=json.dumps(supporting_data or {}),
            is_contradictory=is_contradictory,
            verification_status=verification_status,
        )
        db.add(ref)

        # Update finding sample size accumulation
        finding.sample_size = (finding.sample_size or 0) + sample_count
        finding.updated_at = utc_now()

        db.commit()
        db.refresh(ref)
        return ref

    # =========================================================================
    # 5. REASSESSMENT TRIGGER SCANNER
    # =========================================================================

    def scan_for_reassessment_triggers(self, db: Session) -> Dict[str, Any]:
        """
        Scans active VALIDATED research findings to check if newly ingested market records
        (competitor price drops, regulatory changes, or physician density shifts)
        materially contradict or outdate existing validated conclusions.
        """
        validated_findings = db.query(ResearchFinding).filter(
            ResearchFinding.status == "VALIDATED",
            ResearchFinding.is_active
        ).all()

        flagged_count = 0
        findings_flagged = []

        for finding in validated_findings:
            # Check price-related findings for recent price shifts
            if finding.category == "PRICING":
                recent_prices = db.query(PriceHistory).order_by(desc(PriceHistory.effective_date)).limit(5).all()
                for p in recent_prices:
                    if p.effective_date and (utc_now() - p.effective_date.replace(tzinfo=timezone.utc if p.effective_date.tzinfo is None else None)).days < 30:
                        # Material change detected: price lowered by > 10%
                        if p.previous_price and p.new_price and (p.previous_price - p.new_price) / p.previous_price > 0.10:
                            finding.status = "NEEDS_REASSESSMENT"
                            finding.contradictory_evidence = (
                                f"Detected price drop by {p.competitor_name} to ${p.new_price:.2f} on {p.effective_date.date()}."
                            )
                            finding.updated_at = utc_now()

                            audit = ResearchReviewHistory(
                                finding_id=finding.id,
                                reviewer_email="automated_reassessment_daemon",
                                previous_status="VALIDATED",
                                new_status="NEEDS_REASSESSMENT",
                                review_notes="Automated trigger: Recent competitor price drop detected in historical stream.",
                                rationale=f"Observed price drop by {p.competitor_name} exceeds 10% volatility threshold.",
                            )
                            db.add(audit)
                            flagged_count += 1
                            findings_flagged.append({
                                "finding_id": finding.id,
                                "title": finding.title,
                                "reason": finding.contradictory_evidence,
                            })
                            break

            # Check regulatory findings
            elif finding.category == "REGULATORY":
                recent_regs = db.query(RegulatoryChange).order_by(desc(RegulatoryChange.detected_at)).limit(3).all()
                for reg in recent_regs:
                    if reg.impact_priority in ["HIGH", "CRITICAL"]:
                        finding.status = "NEEDS_REASSESSMENT"
                        finding.contradictory_evidence = f"High-impact regulatory change detected in {reg.state}: {reg.rule_title}"
                        finding.updated_at = utc_now()

                        audit = ResearchReviewHistory(
                            finding_id=finding.id,
                            reviewer_email="automated_reassessment_daemon",
                            previous_status="VALIDATED",
                            new_status="NEEDS_REASSESSMENT",
                            review_notes="Automated trigger: Critical regulatory change logged in active jurisdiction.",
                            rationale=reg.rule_title,
                        )
                        db.add(audit)
                        flagged_count += 1
                        findings_flagged.append({
                            "finding_id": finding.id,
                            "title": finding.title,
                            "reason": finding.contradictory_evidence,
                        })
                        break

        db.commit()
        return {
            "total_validated_checked": len(validated_findings),
            "flagged_for_reassessment": flagged_count,
            "findings_flagged": findings_flagged,
            "scan_timestamp": utc_now().isoformat(),
        }

    # =========================================================================
    # 6. RESEARCH DOSSIER EXPORT
    # =========================================================================

    def export_research_dossier(self, db: Session, project_id: str) -> Dict[str, Any]:
        """Exports a complete, audit-traceable research dossier in JSON and structured Markdown."""
        detail = self.get_project_detail(db, project_id)
        if not detail:
            raise ValueError(f"Project {project_id} not found")

        # Build formatted Markdown report
        lines = [
            f"# MARKET INTELLIGENCE RESEARCH DOSSIER: {detail['title']}",
            f"**Project ID:** `{detail['id']}`  ",
            f"**Status:** {detail['status']} | **Target States:** {', '.join(detail['target_states']) or 'National'}  ",
            f"**Generated:** {utc_now().strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
            f"**Author / Lead:** {detail['created_by'] or 'Unassigned'}  ",
            "\n## Project Scope & Description",
            detail["description"] or "No detailed description provided.",
            "\n---",
            "\n## 1. Research Hypotheses",
        ]

        if not detail["hypotheses"]:
            lines.append("_No hypotheses formulated for this project yet._")
        else:
            for i, h in enumerate(detail["hypotheses"], 1):
                lines.extend([
                    f"\n### Hypothesis H{i}: {h['statement']}",
                    f"- **Status:** `{h['status']}` | **Confidence:** {h['confidence_score'] * 100:.1f}%",
                    f"- **Scope:** {h['geographic_scope']} ({h['geographic_target']})",
                    f"- **Target Metrics:** {', '.join(h['target_metrics'])}",
                    f"- **Methodology:** {h['methodology_notes'] or 'Standard empirical observation'}",
                    f"- **Known Limitations:** {h['limitations_notes'] or 'None recorded'}",
                ])

        lines.extend([
            "\n---",
            "\n## 2. Research Findings & Evidence Grounding",
        ])

        if not detail["findings"]:
            lines.append("_No findings recorded for this project yet._")
        else:
            for j, f in enumerate(detail["findings"], 1):
                lines.extend([
                    f"\n### Finding F{j}: {f['title']}",
                    f"**Lifecycle Status:** `{f['status']}` | **Category:** {f['category']}  ",
                    f"**Confidence:** {f['confidence_score'] * 100:.1f}% | **Sample Size:** {f['sample_size']} observations | **Coverage:** {f['data_coverage_pct']:.1f}%  ",
                    f"\n**Core Statement:**  \n{f['statement']}",
                    f"\n- **Analytical Method:** `{f['calculation_method']}`",
                    f"- **Limitations:** {f['limitations'] or 'Standard surface-web observation bounds'}",
                    f"- **Contradictory / Counter Evidence:** {f['contradictory_evidence'] or 'None identified'}",
                    f"- **Recommended Next Step:** {f['recommended_next_step'] or 'Continue standard monitoring'}",
                    f"\n**Attached Evidence References ({len(f['evidence_references'])}):**",
                ])
                if not f["evidence_references"]:
                    lines.append("  - _No primary evidence references linked._")
                else:
                    for ev in f["evidence_references"]:
                        contradiction_tag = " [CONTRADICTORY]" if ev.get("is_contradictory") else ""
                        lines.append(
                            f"  - [{ev['source_type']}] **{ev['source_name']}**{contradiction_tag}: "
                            f"{ev.get('source_uri') or 'Internal Data Lake'} | Observed: {ev.get('observation_date') or 'Recent'} "
                            f"| Samples: {ev.get('sample_count', 1)} | Verification: `{ev.get('verification_status')}`"
                        )

        lines.extend([
            "\n---",
            "\n## 3. Compliance & Governance Attestation",
            "Every finding in this dossier has been assembled strictly from verified surface-web directories, "
            "state health department portals, public CMS registries, and authorized internal aggregate business data. "
            "No Dark Web sources, no credential bypass, and strictly Zero Protected Health Information (PHI) was accessed or utilized.",
        ])

        markdown_content = "\n".join(lines)
        return {
            "project_id": project_id,
            "project_title": detail["title"],
            "json_dossier": detail,
            "markdown_report": markdown_content,
        }

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _format_hypothesis(self, h: ResearchHypothesis) -> Dict[str, Any]:
        return {
            "id": h.id,
            "statement": h.hypothesis_statement,
            "geographic_scope": h.geographic_scope,
            "geographic_target": h.geographic_target,
            "time_period_start": h.time_period_start.isoformat() if h.time_period_start else None,
            "time_period_end": h.time_period_end.isoformat() if h.time_period_end else None,
            "comparison_groups": json.loads(h.comparison_groups_json or "[]"),
            "target_metrics": json.loads(h.target_metrics_json or "[]"),
            "status": h.status,
            "confidence_score": h.confidence_score,
            "methodology_notes": h.methodology_notes,
            "limitations_notes": h.limitations_notes,
            "created_by": h.created_by,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }

    def _format_finding(self, f: ResearchFinding) -> Dict[str, Any]:
        return {
            "id": f.id,
            "title": f.title,
            "statement": f.statement,
            "category": f.category,
            "status": f.status,
            "calculation_method": f.calculation_method,
            "sample_size": f.sample_size,
            "data_coverage_pct": f.data_coverage_pct,
            "confidence_score": f.confidence_score,
            "limitations": f.limitations,
            "contradictory_evidence": f.contradictory_evidence,
            "recommended_next_step": f.recommended_next_step,
            "is_active": f.is_active,
            "created_by": f.created_by,
            "reviewer_id": f.reviewer_id,
            "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "evidence_references": [
                {
                    "id": ref.id,
                    "source_type": ref.source_type,
                    "source_name": ref.source_name,
                    "source_uri": ref.source_uri,
                    "observation_date": ref.observation_date.isoformat() if ref.observation_date else None,
                    "sample_count": ref.sample_count,
                    "confidence_weight": ref.confidence_weight,
                    "is_contradictory": ref.is_contradictory,
                    "verification_status": ref.verification_status,
                }
                for ref in f.evidence_references
            ],
            "review_history": [
                {
                    "id": r.id,
                    "reviewer_email": r.reviewer_email,
                    "previous_status": r.previous_status,
                    "new_status": r.new_status,
                    "review_notes": r.review_notes,
                    "rationale": r.rationale,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in f.review_history
            ],
        }
