import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database.models import (
    WorkflowDefinition, WorkflowRun, HumanApproval, ManagementReviewItem, IntelligenceFeedback
)

class WorkflowAutomationService:
    def __init__(self, db: Session):
        self.db = db

    def list_workflows(self) -> List[Dict[str, Any]]:
        wfs = self.db.scalars(select(WorkflowDefinition).order_by(desc(WorkflowDefinition.created_at))).all()
        if not wfs:
            # Seed default production workflow templates
            templates = [
                (
                    "Competitor Price Reduction Review",
                    "COMPETITOR_PRICE_DROP",
                    json.dumps({"operator": "GREATER_THAN", "value": 10.0}),
                    json.dumps([{"action": "CREATE_ALERT"}, {"action": "CREATE_MANAGEMENT_REVIEW_ITEM"}]),
                    True
                ),
                (
                    "Regulatory Requirement Alert Workflow",
                    "REGULATORY_CHANGE",
                    json.dumps({"operator": "ANY"}),
                    json.dumps([{"action": "GENERATE_AI_SUMMARY"}, {"action": "CREATE_MANAGEMENT_REVIEW_ITEM"}]),
                    True
                ),
                (
                    "New Partnership Opportunity Lead Pipeline",
                    "NEW_PARTNERSHIP_OPPORTUNITY",
                    json.dumps({"operator": "GREATER_THAN", "value": 75.0}),
                    json.dumps([{"action": "CREATE_PARTNERSHIP_LEAD"}, {"action": "REQUEST_HUMAN_APPROVAL"}]),
                    True
                )
            ]
            for name, trigger, cond, act, app in templates:
                item = WorkflowDefinition(
                    name=name,
                    trigger_type=trigger,
                    condition_json=cond,
                    actions_json=act,
                    requires_approval=app,
                    is_active=True
                )
                self.db.add(item)
            self.db.commit()
            wfs = self.db.scalars(select(WorkflowDefinition).order_by(desc(WorkflowDefinition.created_at))).all()

        return [
            {
                "id": w.id,
                "name": w.name,
                "trigger_type": w.trigger_type,
                "condition": json.loads(w.condition_json) if w.condition_json else {},
                "actions": json.loads(w.actions_json) if w.actions_json else [],
                "requires_approval": w.requires_approval,
                "is_active": w.is_active,
                "created_at": w.created_at.isoformat() if w.created_at else None
            } for w in wfs
        ]

    def trigger_workflow(self, workflow_id: str, trigger_payload: Dict[str, Any]) -> Dict[str, Any]:
        wf = self.db.scalar(select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id))
        if not wf:
            return {"status": "error", "message": "Workflow definition not found"}

        run = WorkflowRun(
            workflow_id=wf.id,
            workflow_name=wf.name,
            status="WAITING_APPROVAL" if wf.requires_approval else "COMPLETED",
            trigger_payload_json=json.dumps(trigger_payload),
            execution_result_json=json.dumps({"message": "Workflow triggered successfully"})
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        # If human approval is required, create human approval gate record
        if wf.requires_approval:
            approval = HumanApproval(
                workflow_run_id=run.id,
                action_title=f"Approval Gate for {wf.name}",
                description=f"Workflow '{wf.name}' requires explicit human management review and approval before execution.",
                evidence=f"Triggered by event payload: {json.dumps(trigger_payload)}",
                proposed_action=f"Execute workflow actions: {wf.actions_json}",
                status="PENDING"
            )
            self.db.add(approval)
            self.db.commit()

        return {
            "status": "success",
            "run_id": run.id,
            "run_status": run.status,
            "requires_approval": wf.requires_approval
        }

    def list_approvals(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(HumanApproval)
        if status:
            stmt = stmt.where(HumanApproval.status == status)
        stmt = stmt.order_by(desc(HumanApproval.created_at))

        apps = self.db.scalars(stmt).all()
        return [
            {
                "id": a.id,
                "workflow_run_id": a.workflow_run_id,
                "action_title": a.action_title,
                "description": a.description,
                "evidence": a.evidence,
                "proposed_action": a.proposed_action,
                "status": a.status,
                "reviewed_by": a.reviewed_by,
                "review_notes": a.review_notes,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None
            } for a in apps
        ]

    def review_approval(self, approval_id: str, action: str, reviewer: str = "Manager", notes: Optional[str] = None) -> Dict[str, Any]:
        app = self.db.scalar(select(HumanApproval).where(HumanApproval.id == approval_id))
        if not app:
            return {"status": "not_found", "id": approval_id}

        app.status = "APPROVED" if action.upper() == "APPROVE" else "REJECTED"
        app.reviewed_by = reviewer
        app.review_notes = notes or ""
        app.reviewed_at = datetime.now(timezone.utc)

        if app.workflow_run_id:
            w_run = self.db.scalar(select(WorkflowRun).where(WorkflowRun.id == app.workflow_run_id))
            if w_run:
                w_run.status = "COMPLETED" if app.status == "APPROVED" else "REJECTED"
                w_run.completed_at = datetime.now(timezone.utc)

        self.db.commit()
        return {"status": "success", "approval_id": app.id, "new_status": app.status}

    def list_management_queue(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(ManagementReviewItem)
        if status:
            stmt = stmt.where(ManagementReviewItem.status == status)
        stmt = stmt.order_by(desc(ManagementReviewItem.created_at))

        items = self.db.scalars(stmt).all()
        if not items:
            # Seed default review queue items
            default_items = [
                (
                    "COMPETITOR_CHANGE",
                    "Significant Competitor Price Cut (-25.1%)",
                    "FL",
                    "Veriheal changed price from $199 to $149 in Florida.",
                    "HIGH",
                    "Review pricing strategy and evaluate scenario simulation for $139 or $149 pricing."
                ),
                (
                    "REGULATORY_CHANGE",
                    "Updated Telehealth Disclosure Requirement",
                    "FL",
                    "Florida Department of Health issued new consent requirements.",
                    "HIGH",
                    "Forward to legal/compliance officer to update patient intake forms."
                )
            ]
            for i_type, title, st, evid, conf, sug in default_items:
                item = ManagementReviewItem(
                    item_type=i_type,
                    title=title,
                    state=st,
                    evidence=evid,
                    confidence=conf,
                    suggested_review_step=sug,
                    status="PENDING"
                )
                self.db.add(item)
            self.db.commit()
            items = self.db.scalars(stmt).all()

        return [
            {
                "id": i.id,
                "item_type": i.item_type,
                "title": i.title,
                "state": i.state,
                "evidence": i.evidence,
                "confidence": i.confidence,
                "suggested_review_step": i.suggested_review_step,
                "status": i.status,
                "assigned_to": i.assigned_to,
                "created_at": i.created_at.isoformat() if i.created_at else None
            } for i in items
        ]

    def record_feedback(
        self,
        target_type: str,
        target_id: str,
        feedback: str,
        notes: Optional[str] = None,
        user_email: str = "admin@mmjdocs.com"
    ) -> Dict[str, Any]:
        fb = IntelligenceFeedback(
            target_type=target_type,
            target_id=target_id,
            feedback=feedback.upper(),
            notes=notes,
            user_email=user_email
        )
        self.db.add(fb)
        self.db.commit()
        self.db.refresh(fb)
        return {"status": "success", "feedback_id": fb.id, "feedback": fb.feedback}
