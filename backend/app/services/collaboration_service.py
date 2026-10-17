"""
Intelligence Collaboration Workspace Service (Phase 6).
Enables authorized analysts, researchers, and managers to:
- Save and organize collaborative intelligence findings
- Add strictly private internal notes (guarded from public exports/external systems)
- Assign reviewers and follow-up owners
- Record and track management decisions and outcomes
- Share team and public watchlists with role-aware access
"""
import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.models import (
    CollaborationFinding,
    IntelligenceNote,
    Watchlist,
    Entity,
    utc_now,
)


class CollaborationService:
    """Manages collaborative intelligence findings, private internal notes, and shared watchlists."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # COLLABORATION FINDINGS & DOSSIERS
    # ==========================================

    def create_finding(
        self,
        title: str,
        category: str,
        finding_summary: str,
        evidence_sources: List[Dict[str, Any]],
        entity_id: Optional[str] = None,
        assigned_reviewer: Optional[str] = None,
        follow_up_owner: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> CollaborationFinding:
        finding = CollaborationFinding(
            title=title,
            category=category.upper(),
            entity_id=entity_id,
            finding_summary=finding_summary,
            evidence_sources=json.dumps(evidence_sources),
            status="UNDER_REVIEW" if assigned_reviewer else "DRAFT",
            assigned_reviewer=assigned_reviewer,
            follow_up_owner=follow_up_owner,
            created_by=created_by,
        )
        self.db.add(finding)
        self.db.commit()
        self.db.refresh(finding)
        return finding

    def list_findings(self, category: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.db.query(CollaborationFinding)
        if category and category.upper() != "ALL":
            query = query.filter(CollaborationFinding.category == category.upper())
        if status and status.upper() != "ALL":
            query = query.filter(CollaborationFinding.status == status.upper())

        findings = query.order_by(CollaborationFinding.created_at.desc()).limit(100).all()

        results = []
        for f in findings:
            ent = self.db.get(Entity, f.entity_id) if f.entity_id else None
            notes_count = self.db.query(IntelligenceNote).filter(IntelligenceNote.finding_id == f.id).count()
            results.append({
                "id": f.id,
                "title": f.title,
                "category": f.category,
                "entity_id": f.entity_id,
                "entity_name": ent.name if ent else None,
                "finding_summary": f.finding_summary,
                "evidence_sources": json.loads(f.evidence_sources) if f.evidence_sources else [],
                "status": f.status,
                "assigned_reviewer": f.assigned_reviewer,
                "follow_up_owner": f.follow_up_owner,
                "management_decision": f.management_decision,
                "notes_count": notes_count,
                "created_by": f.created_by,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            })
        return results

    def record_decision(
        self,
        finding_id: str,
        management_decision: str,
        status: str = "ACTION_APPROVED",
    ) -> Dict[str, Any]:
        finding = self.db.get(CollaborationFinding, finding_id)
        if not finding:
            raise ValueError("Finding not found.")
        finding.management_decision = management_decision
        finding.status = status.upper()
        finding.updated_at = utc_now()
        self.db.commit()
        return {
            "finding_id": finding.id,
            "status": finding.status,
            "management_decision": finding.management_decision,
        }

    # ==========================================
    # PRIVATE INTERNAL NOTES
    # ==========================================

    def add_note(
        self,
        author_email: str,
        note_content: str,
        finding_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> IntelligenceNote:
        if not finding_id and not entity_id:
            raise ValueError("Note must be associated with a finding or an entity.")

        note = IntelligenceNote(
            finding_id=finding_id,
            entity_id=entity_id,
            author_email=author_email,
            note_content=note_content,
            is_internal_only=True,  # Guarded: strictly internal
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def list_notes_for_finding(self, finding_id: str) -> List[Dict[str, Any]]:
        notes = (
            self.db.query(IntelligenceNote)
            .filter(IntelligenceNote.finding_id == finding_id)
            .order_by(IntelligenceNote.created_at.asc())
            .all()
        )
        return [
            {
                "id": n.id,
                "author_email": n.author_email,
                "note_content": n.note_content,
                "is_internal_only": n.is_internal_only,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notes
        ]

    # ==========================================
    # SHARED WATCHLISTS (Personal, Team, Public)
    # ==========================================

    def create_shared_watchlist(
        self,
        name: str,
        category: str,
        description: Optional[str] = None,
        sharing_scope: str = "PERSONAL",  # PERSONAL, TEAM, PUBLIC
        team_name: Optional[str] = None,
        created_by: str = "admin",
    ) -> Watchlist:
        wl = Watchlist(
            name=name,
            category=category,
            description=description,
            sharing_scope=sharing_scope.upper(),
            team_name=team_name,
            created_by=created_by,
            is_active=True,
        )
        self.db.add(wl)
        self.db.commit()
        self.db.refresh(wl)
        return wl

    def list_shared_watchlists(
        self,
        current_user_email: Optional[str] = None,
        user_team: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns watchlists accessible to the caller:
        - Public watchlists
        - Team watchlists matching user's team
        - Personal watchlists created by the user
        """
        query = self.db.query(Watchlist).filter(Watchlist.is_active)
        all_lists = query.order_by(Watchlist.created_at.desc()).all()

        results = []
        for w in all_lists:
            # Check access
            if w.sharing_scope == "PUBLIC":
                can_access = True
            elif w.sharing_scope == "TEAM":
                can_access = True if (not user_team or w.team_name == user_team) else False
            else:  # PERSONAL
                can_access = True if (not current_user_email or w.created_by == current_user_email) else False

            if can_access:
                items_count = len(w.items) if w.items else 0
                results.append({
                    "id": w.id,
                    "name": w.name,
                    "category": w.category,
                    "description": w.description,
                    "sharing_scope": w.sharing_scope,
                    "team_name": w.team_name,
                    "items_count": items_count,
                    "created_by": w.created_by,
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                })
        return results
