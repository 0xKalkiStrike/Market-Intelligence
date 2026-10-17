"""
Enterprise Outbound Webhook Framework (Phase 6).
Provides secure, reliable delivery of platform market events to approved external systems:
- HMAC-SHA256 signature headers with replay timestamps
- SSRF endpoint destination validation
- Exponential backoff retry policies and timeout enforcement
- Full delivery logs, failure tracking, and manual redelivery replay controls
"""
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.auth.rbac import validate_safe_url
from app.database.models import WebhookSubscription, WebhookDeliveryLog, utc_now


SUPPORTED_EVENT_TYPES = [
    "competitor.price_changed",
    "competitor.location_added",
    "regulation.changed",
    "market.opportunity_detected",
    "partnership.opportunity_created",
    "forecast.completed",
    "integration.failed",
    "data_quality.conflict_detected",
]


class WebhookService:
    """Manages webhook subscriptions, secure payload delivery, and retry cycles."""

    def __init__(self, db: Session):
        self.db = db

    def create_subscription(
        self,
        name: str,
        target_url: str,
        event_types: List[str],
        created_by: Optional[str] = None,
    ) -> WebhookSubscription:
        """Validates target URL against SSRF rules and creates a signed subscription."""
        # 1. Enforce SSRF protection
        validated_url = validate_safe_url(target_url)

        # 2. Validate event types
        for ev in event_types:
            if ev != "*" and ev not in SUPPORTED_EVENT_TYPES:
                raise ValueError(f"Unsupported event type '{ev}'.")

        # 3. Generate cryptographic signing secret
        secret_key = f"whsec_{os.urandom(24).hex()}"

        sub = WebhookSubscription(
            name=name,
            target_url=validated_url,
            secret_key=secret_key,
            event_types=json.dumps(event_types),
            is_active=True,
            created_by=created_by,
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        return sub

    def list_subscriptions(self) -> List[Dict[str, Any]]:
        subs = self.db.query(WebhookSubscription).all()
        results = []
        for s in subs:
            try:
                evs = json.loads(s.event_types)
            except Exception:
                evs = ["*"]
            results.append({
                "id": s.id,
                "name": s.name,
                "target_url": s.target_url,
                "event_types": evs,
                "is_active": s.is_active,
                "created_by": s.created_by,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })
        return results

    def rotate_secret(self, subscription_id: str) -> Dict[str, Any]:
        """Rotates subscription HMAC secret key."""
        sub = self.db.get(WebhookSubscription, subscription_id)
        if not sub:
            raise ValueError("Webhook subscription not found.")
        new_secret = f"whsec_{os.urandom(24).hex()}"
        sub.secret_key = new_secret
        self.db.commit()
        return {
            "subscription_id": sub.id,
            "secret_key": new_secret,
            "message": "Secret rotated successfully. Update your receiving verification service.",
        }

    def delete_subscription(self, subscription_id: str) -> bool:
        sub = self.db.get(WebhookSubscription, subscription_id)
        if not sub:
            return False
        self.db.delete(sub)
        self.db.commit()
        return True

    @staticmethod
    def generate_signature(secret: str, timestamp: int, payload_str: str) -> str:
        """Computes HMAC-SHA256 signature over timestamp and raw JSON payload."""
        to_sign = f"{timestamp}.{payload_str}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()

    def deliver_event_to_subscription(
        self,
        subscription: WebhookSubscription,
        event_type: str,
        payload: Dict[str, Any],
        event_id: Optional[str] = None,
        max_retries: int = 2,
    ) -> WebhookDeliveryLog:
        """
        Delivers an event to a specific webhook subscription with HMAC signing and retries.
        """
        payload_str = json.dumps(payload, sort_keys=True)
        now_ts = int(time.time())
        signature = self.generate_signature(subscription.secret_key, now_ts, payload_str)

        log = WebhookDeliveryLog(
            subscription_id=subscription.id,
            event_type=event_type,
            event_id=event_id,
            payload_json=payload_str,
            status="PENDING",
            attempts=0,
        )
        self.db.add(log)
        self.db.commit()

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MMJ-DOCS-Intelligence-Platform/6.0",
            "X-MMJ-Event": event_type,
            "X-MMJ-Delivery": log.id,
            "X-MMJ-Signature-256": f"t={now_ts},v1={signature}",
        }

        attempts = 0
        last_error = None
        http_status = None

        while attempts <= max_retries:
            attempts += 1
            log.attempts = attempts
            try:
                # Deliver with strict 5-second timeout
                with httpx.Client(timeout=5.0, follow_redirects=False) as client:
                    resp = client.post(subscription.target_url, content=payload_str, headers=headers)
                    http_status = resp.status_code
                    log.http_status = http_status
                    if 200 <= http_status < 300:
                        log.status = "SUCCESS"
                        log.delivered_at = datetime.now(timezone.utc)
                        log.error_message = None
                        self.db.commit()
                        return log
                    else:
                        last_error = f"HTTP {http_status}: {resp.text[:200]}"
            except Exception as ex:
                last_error = f"{type(ex).__name__}: {str(ex)}"

            # Wait with exponential backoff if retrying
            if attempts <= max_retries:
                time.sleep(0.5 * (2 ** (attempts - 1)))

        log.status = "FAILED"
        log.http_status = http_status
        log.error_message = last_error
        self.db.commit()
        return log

    def replay_delivery(self, delivery_log_id: str) -> Dict[str, Any]:
        """Manually replays a previously logged or failed webhook delivery."""
        log = self.db.get(WebhookDeliveryLog, delivery_log_id)
        if not log:
            raise ValueError("Delivery log not found.")
        sub = self.db.get(WebhookSubscription, log.subscription_id)
        if not sub or not sub.is_active:
            raise ValueError("Target webhook subscription is inactive or deleted.")

        try:
            payload = json.loads(log.payload_json)
        except Exception:
            payload = {}

        new_log = self.deliver_event_to_subscription(
            subscription=sub,
            event_type=log.event_type,
            payload=payload,
            event_id=log.event_id,
        )
        return {
            "replayed_delivery_id": new_log.id,
            "status": new_log.status,
            "http_status": new_log.http_status,
            "attempts": new_log.attempts,
            "error_message": new_log.error_message,
        }

    def list_delivery_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        logs = (
            self.db.query(WebhookDeliveryLog)
            .order_by(WebhookDeliveryLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": l.id,
                "subscription_id": l.subscription_id,
                "event_type": l.event_type,
                "event_id": l.event_id,
                "http_status": l.http_status,
                "status": l.status,
                "attempts": l.attempts,
                "error_message": l.error_message,
                "delivered_at": l.delivered_at.isoformat() if l.delivered_at else None,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
