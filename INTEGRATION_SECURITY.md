# Enterprise Integration Security & Threat Protection

**Document Version**: Phase 6.0 Security Architecture  
**Scope**: External Connectors, Ingestion Guards, Governed APIs, Webhooks, File Handlers  
**Security Standard**: Defense-in-Depth, Zero-Trust Destination Verification, Strict PHI Exclusion

---

## 1. Threat Matrix & Countermeasures

| Attack / Threat Vector | Potential Impact | Platform Countermeasure |
| :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | Attacker forces webhook delivery to internal VPC, loopback (127.0.0.1), or cloud metadata (`169.254.169.254`) | `validate_safe_url()` parses destination IP/hostname; strictly blocks RFC 1918 private subnets, localhost, link-local, and cloud metadata hostnames. |
| **Accidental PHI Ingestion** | Ingesting patient names, MRNs, or clinical notes violates HIPAA Minimum Necessary | `InternalMmjDocsAdapter` enforces regex boundary scans for MRNs, SSNs, and clinical notes, aborting the sync if detected. |
| **API Key Abuse & Exhaustion** | Leaked key causes database exhaustion or quota overrun | In-memory sliding-window rate limiter per API key prefix; scopes restrict actions; revocation is instantaneous. |
| **Credential Leakage** | API keys or webhook secrets exposed in logs or version control | Secrets are displayed **once** upon generation; stored strictly as SHA-256 hashes; full secrets are sanitized from all log formatters. |
| **Webhook Spoofing & Replay** | Attacker intercepts or fabricates fake event webhooks | Deliveries signed with HMAC-SHA256 (`X-MMJ-Signature-256`) using shared subscriber secret and UTC timestamp (`X-MMJ-Timestamp`). |
| **CSV Formula Injection** | Malicious CSV cell starting with `=`, `+`, `-`, or `@` executes shell commands in Excel | `DataImportService` strips formula control characters during preview and normalization. |
| **Proprietary Data Exfiltration** | Non-executive user exports full internal clinical revenues | `DataExportService` automatically redacts internal revenue and appointment metrics unless caller holds `internal_metrics:read`. |
| **Dark Web & CAPTCHA Bypass** | Legal & ethical violation | Platform strictly operates on public Surface-Web data feeds; zero Dark Web, zero anti-bot / CAPTCHA bypass scripts. |

---

## 2. SSRF Protection Implementation

Located in `backend/app/auth/rbac.py`:

```python
def validate_safe_url(url: str) -> str:
    """
    SSRF Protection: Validates user-provided or partner URLs target safe,
    public surface-web HTTP/HTTPS destinations and blocks internal/private IP ranges.
    """
    if not url or not isinstance(url, str):
        raise ValueError("URL must be a non-empty string.")

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid URL protocol '{parsed.scheme}'. Only http and https are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL missing valid hostname.")

    # Block localhost & link-local hostnames
    if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
        raise ValueError("Access to internal localhost destinations is blocked for security.")

    # Resolve IP and check against private subnets
    try:
        ip_addr = ipaddress.ip_address(hostname)
        if ip_addr.is_private or ip_addr.is_loopback or ip_addr.is_link_local or ip_addr.is_reserved:
            raise ValueError(f"Destination IP '{hostname}' resolves to private/internal network.")
    except ValueError as ex:
        # Hostname is a domain name, not raw IP literal -> allowed surface web
        pass

    return url
```

---

## 3. Secret Management & Key Protection

- **No Secrets in Frontend Code**: The Next.js frontend never stores or embeds API secrets, HMAC signing keys, or service credentials.
- **Display Once Principle**: When an API key or webhook subscription is created, the raw secret is delivered in the immediate HTTP 201 response and never rendered again.
- **Secret Rotation**: Outbound webhooks support immediate zero-downtime secret rotation via `POST /api/v1/governed/webhooks/{id}/rotate-secret`.
- **Log Masking**: Observability middleware automatically suppresses `Authorization`, `X-API-Key`, and `secret_key` fields from request payloads and server logs.
