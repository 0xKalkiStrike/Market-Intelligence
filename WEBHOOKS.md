# Outbound Webhook Framework & Event Delivery

**Service Layer**: `app/services/webhook_service.py` & `app/services/event_dispatcher.py`  
**Security Standard**: HMAC-SHA256 Payload Signature (`X-MMJ-Signature-256`), SSRF Protected

---

## 1. Overview

The Webhook Framework delivers real-time notifications to approved external systems when consequential market events occur. Webhooks decouple event producers (such as scraping crawlers, pricing monitors, and forecast calculators) from external consumers (partner CRMs, notification systems, data warehouses).

```text
+------------------------+
| Platform Event Trigger | (e.g., Competitor drops price by $50)
+-----------+------------+
            |
            v
+------------------------+
|    EventDispatcher     | --> Records event to database
+-----------+------------+
            |
            v
+------------------------+
|     WebhookService     | --> Queries active subscriptions matching event_type
+-----------+------------+
            |
            v
+------------------------+
| SSRF Destination Check | --> Rejects private IPs / loopback / cloud metadata
+-----------+------------+
            |
            v
+------------------------+
| HMAC-SHA256 Signature  | --> Computes X-MMJ-Signature-256 using subscriber secret
+-----------+------------+
            |
            v
+------------------------+
|  HTTP POST Delivery    | --> Sends payload with 5s timeout & retry policies
+-----------+------------+
            |
            v
+------------------------+
|   Audit Delivery Log   | --> Records status_code, duration_ms, and payload ID
+------------------------+
```

---

## 2. Supported Event Types

| Event Type | Trigger Condition |
| :--- | :--- |
| `competitor.price_changed` | Competitor consultation fee updated or promotion detected |
| `competitor.location_added` | New competitor clinic or dispensary opened |
| `regulation.changed` | Legislative, telehealth, or qualifying condition rule updated |
| `market.opportunity_detected`| High-growth, low-competition territory score threshold exceeded |
| `partnership.opportunity_created`| Dispensary cross-referral prospect identified |
| `forecast.completed` | Multi-horizon patient growth or demand projection completed |
| `integration.failed` | Connector synchronization failure or data anomaly detected |

---

## 3. Security & Anti-SSRF Protections

The platform treats all destination URLs as untrusted. Before establishing a connection, `validate_safe_url()` enforces:

1. **Protocol Restrictions**: Strictly `http` or `https` permitted.
2. **Blocked Hostnames & Metadata**:
   - `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`
   - `metadata.google.internal`, `169.254.169.254` (cloud instance metadata endpoints)
3. **Blocked Private IP Ranges**:
   - `10.0.0.0/8` (RFC 1918)
   - `172.16.0.0/12` (RFC 1918)
   - `192.168.0.0/16` (RFC 1918)
   - `127.0.0.0/8` (Loopback)
   - `169.254.0.0/16` (Link-local)
   - `fc00::/7` (IPv6 Unique Local)

---

## 4. Cryptographic Payload Verification (HMAC-SHA256)

Every outbound webhook delivery includes two security headers:
- `X-MMJ-Timestamp`: Current UTC epoch timestamp (prevents replay attacks).
- `X-MMJ-Signature-256`: Hex-encoded HMAC-SHA256 signature calculated over `<timestamp>.<json_body>`.

### Verification Example for Consumers (Python)
```python
import hmac
import hashlib

def verify_webhook(secret_key: str, timestamp_header: str, body_bytes: bytes, signature_header: str) -> bool:
    signed_payload = f"{timestamp_header}.".encode("utf-8") + body_bytes
    expected_sig = hmac.new(secret_key.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, signature_header)
```

---

## 5. Webhook Management Endpoints

| Endpoint | Method | Scope | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/governed/webhooks` | POST | `system:manage` | Create subscription and receive secret |
| `/api/v1/governed/webhooks` | GET | `system:manage` | List all registered subscriptions |
| `/api/v1/governed/webhooks/{id}/rotate-secret` | POST | `system:manage` | Generate new secret key immediately |
| `/api/v1/governed/webhooks/{id}` | DELETE | `system:manage` | Deactivate/delete subscription |
| `/api/v1/governed/webhooks/deliveries` | GET | `system:manage` | Audit delivery log history |
| `/api/v1/governed/webhooks/deliveries/{id}/replay` | POST | `system:manage` | Re-dispatch past event payload |
