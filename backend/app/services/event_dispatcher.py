"""
Universal Event Dispatcher Service (Phase 6).
Decouples producers of market events from consumers (historical log, alerts, AI summaries, and webhooks).
Enforces stable event IDs and idempotency.
"""
import json
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from sqlalchemy.orm import Session

from app.database.models import (
    IntelligenceEvent,
    AlertNotification,
    WebhookSubscription,
)
from app.database.session import SessionLocal
from app.services.webhook_service import WebhookService


class EventDispatcher:
    """Universal dispatcher routing verified platform events to database logs, alerts, and outbound webhooks."""

    def __init__(self, db: Session):
        self.db = db
        self.webhook_service = WebhookService(db)

    def dispatch(
        self,
        event_type: str,
        entity_name: str,
        state: str,
        description: str,
        importance: str = "MEDIUM",
        entity_id: Optional[str] = None,
        entity_type: str = "COMPETITOR",
        previous_value: Optional[str] = None,
        new_value: Optional[str] = None,
        source_name: str = "Market Intelligence Engine",
        source_url: Optional[str] = None,
        custom_payload: Optional[Dict[str, Any]] = None,
        async_webhooks: bool = True,
    ) -> IntelligenceEvent:
        """
        Publishes a market event to all consumers:
        1. Persists event to central IntelligenceEvent table
        2. Raises AlertNotification if priority is HIGH/CRITICAL
        3. Fans out to matching active WebhookSubscriptions
        """
        event_id = uuid4().hex

        # 1. Store event
        event = IntelligenceEvent(
            id=event_id,
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
        self.db.add(event)

        # 2. Trigger high-priority alert if applicable
        if importance in ("HIGH", "CRITICAL"):
            alert = AlertNotification(
                alert_type=event_type,
                priority=importance,
                entity_id=entity_id,
                entity_name=entity_name,
                state=state,
                title=f"{importance}: {event_type.replace('_', ' ').title()}",
                message=description,
                source_url=source_url,
                status="UNREAD",
            )
            self.db.add(alert)

        self.db.commit()
        self.db.refresh(event)

        # 3. Fan out to active Webhook Subscriptions
        matching_subs = self._get_matching_subscriptions(event_type)

        delivery_payload = {
            "event_id": event.id,
            "event_type": event_type,
            "entity_name": entity_name,
            "entity_id": entity_id,
            "state": state,
            "importance": importance,
            "description": description,
            "previous_value": previous_value,
            "new_value": new_value,
            "timestamp": event.detected_at.isoformat() if event.detected_at else datetime.now(timezone.utc).isoformat(),
            "data": custom_payload or {},
        }

        if matching_subs:
            if async_webhooks:
                def _fan_out():
                    with SessionLocal() as bg_db:
                        wh_svc = WebhookService(bg_db)
                        for sub_id in [s.id for s in matching_subs]:
                            sub_record = bg_db.get(WebhookSubscription, sub_id)
                            if sub_record and sub_record.is_active:
                                wh_svc.deliver_event_to_subscription(
                                    subscription=sub_record,
                                    event_type=event_type,
                                    payload=delivery_payload,
                                    event_id=event.id,
                                )
                threading.Thread(target=_fan_out, daemon=True).start()
            else:
                for sub in matching_subs:
                    self.webhook_service.deliver_event_to_subscription(
                        subscription=sub,
                        event_type=event_type,
                        payload=delivery_payload,
                        event_id=event.id,
                    )

        return event

    def _get_matching_subscriptions(self, event_type: str) -> List[WebhookSubscription]:
        """Finds all active webhook subscriptions subscribed to this event type or '*'."""
        subs = self.db.query(WebhookSubscription).filter(WebhookSubscription.is_active).all()
        matched = []
        for s in subs:
            try:
                evs = json.loads(s.event_types)
                if "*" in evs or event_type in evs:
                    matched.append(s)
            except Exception:
                pass
        return matched
