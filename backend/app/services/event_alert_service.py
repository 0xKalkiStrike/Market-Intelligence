from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import IntelligenceEvent, AlertNotification

class EventAlertService:
    """Centralized universal event logging and configurable alert engine."""

    def log_event(
        self,
        db: Session,
        event_type: str,
        entity_name: str,
        state: str,
        description: str,
        importance: str = "MEDIUM",
        entity_id: Optional[str] = None,
        entity_type: str = "COMPETITOR",
        previous_value: Optional[str] = None,
        new_value: Optional[str] = None,
        source_name: str = "Surface Web Engine",
        source_url: Optional[str] = None,
    ) -> IntelligenceEvent:
        event = IntelligenceEvent(
            event_type=event_type,
            entity_id=entity_id,
            entity_name=entity_name,
            entity_type=entity_type,
            state=state,
            description=description,
            previous_value=previous_value,
            new_value=new_value,
            importance=importance,
            source_name=source_name,
            source_url=source_url,
            detected_at=datetime.now(timezone.utc),
        )
        db.add(event)

        # Trigger notification if importance is HIGH or CRITICAL
        if importance in ["HIGH", "CRITICAL"]:
            notification = AlertNotification(
                alert_type=event_type,
                priority=importance,
                entity_id=entity_id,
                entity_name=entity_name,
                state=state,
                title=f"{importance} Event: {event_type.replace('_', ' ')}",
                message=description,
                source_url=source_url,
                status="UNREAD",
            )
            db.add(notification)

        db.commit()
        db.refresh(event)
        return event

    def list_events(
        self,
        db: Session,
        event_type: Optional[str] = None,
        state: Optional[str] = None,
        importance: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query = db.query(IntelligenceEvent)

        if event_type and event_type != "ALL":
            query = query.filter(IntelligenceEvent.event_type == event_type)

        if state:
            query = query.filter(IntelligenceEvent.state.ilike(f"%{state}%"))

        if importance and importance != "ALL":
            query = query.filter(IntelligenceEvent.importance == importance)

        events = query.order_by(IntelligenceEvent.detected_at.desc()).limit(limit).all()

        return [
            {
                "id": e.id,
                "event_type": e.event_type,
                "entity_id": e.entity_id,
                "entity_name": e.entity_name,
                "entity_type": e.entity_type,
                "state": e.state,
                "description": e.description,
                "previous_value": e.previous_value,
                "new_value": e.new_value,
                "importance": e.importance,
                "source_name": e.source_name,
                "source_url": e.source_url,
                "detected_at": e.detected_at.isoformat() if e.detected_at else None,
                "reviewed": e.reviewed,
            }
            for e in events
        ]

    def list_alerts(
        self,
        db: Session,
        status: Optional[str] = "UNREAD",
        priority: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = db.query(AlertNotification)

        if status and status != "ALL":
            query = query.filter(AlertNotification.status == status)

        if priority and priority != "ALL":
            query = query.filter(AlertNotification.priority == priority)

        alerts = query.order_by(AlertNotification.triggered_at.desc()).all()

        return [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "priority": a.priority,
                "entity_id": a.entity_id,
                "entity_name": a.entity_name,
                "state": a.state,
                "title": a.title,
                "message": a.message,
                "source_url": a.source_url,
                "status": a.status,
                "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            }
            for a in alerts
        ]
