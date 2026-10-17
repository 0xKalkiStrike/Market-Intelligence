"""
Enterprise Role-Based Access Control (RBAC) & Data Protection Layer (Phase 5).
Maps Enterprise Roles:
1. System Administrator (system_admin)
2. Platform Administrator (platform_admin)
3. Intelligence Analyst (analyst)
4. Market Researcher (market_researcher)
5. Partnership Manager (partnership_manager)
6. Executive Viewer (executive_viewer)
7. Compliance Reviewer (compliance_reviewer)

Enforces backend authorization, least-privilege policies, and internal data protection.
"""
import ipaddress
import re
import urllib.parse
from typing import Any, Callable, Dict, List, Optional, Set
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import User, Role, Permission
from app.database.session import get_db


# Complete Enterprise Role & Permission Mapping
ENTERPRISE_ROLES: Dict[str, Dict[str, Any]] = {
    "system_admin": {
        "display_name": "System Administrator",
        "description": "Unrestricted administrative access to entire platform, credentials, users, and infrastructure.",
        "permissions": [
            "system:manage",
            "users:manage",
            "sources:manage",
            "collection:run",
            "intelligence:read",
            "internal_metrics:read",
            "partnerships:manage",
            "workflows:approve",
            "regulatory:review",
            "data_quality:correct",
            "ai:query",
            "ai:admin",
            "audit:read",
            "backup:manage",
        ],
    },
    "platform_admin": {
        "display_name": "Platform Administrator",
        "description": "Manages data collectors, integration connections, AI routing, and background jobs.",
        "permissions": [
            "sources:manage",
            "collection:run",
            "intelligence:read",
            "internal_metrics:read",
            "workflows:approve",
            "data_quality:correct",
            "ai:query",
            "ai:admin",
            "audit:read",
        ],
    },
    "analyst": {
        "display_name": "Intelligence Analyst",
        "description": "Full access to market intelligence analysis, what-changed, scenarios, forecasting, and AI assistant.",
        "permissions": [
            "intelligence:read",
            "internal_metrics:read",
            "ai:query",
            "data_quality:correct",
            "audit:read",
        ],
    },
    "market_researcher": {
        "display_name": "Market Researcher",
        "description": "Researches public competitors, pricing, dispensaries, SEO, and reviews.",
        "permissions": [
            "intelligence:read",
            "ai:query",
        ],
    },
    "partnership_manager": {
        "display_name": "Partnership Manager",
        "description": "Manages dispensary CRM pipeline, partnership outreach, and referral channels.",
        "permissions": [
            "intelligence:read",
            "partnerships:manage",
            "ai:query",
        ],
    },
    "executive_viewer": {
        "display_name": "Executive Viewer",
        "description": "Read-only executive access to command center, weekly reports, forecasts, and high-level KPIs.",
        "permissions": [
            "intelligence:read",
            "internal_metrics:read",
            "ai:query",
        ],
    },
    "compliance_reviewer": {
        "display_name": "Compliance Reviewer",
        "description": "Reviews regulatory changes, source provenance, verification statuses, and audit logs.",
        "permissions": [
            "intelligence:read",
            "regulatory:review",
            "audit:read",
        ],
    },
}


def get_user_permission_codes(user: User) -> Set[str]:
    """Extracts all active permission codes granted to the user through assigned roles."""
    if user.is_superuser:
        # Superuser possesses all permissions implicitly
        return {
            p
            for role_def in ENTERPRISE_ROLES.values()
            for p in role_def["permissions"]
        } | {"*"}

    codes = set()
    for role in user.roles:
        # Check standard mapped enterprise roles
        role_key = role.name.lower().replace(" ", "_")
        if role_key in ENTERPRISE_ROLES:
            codes.update(ENTERPRISE_ROLES[role_key]["permissions"])
        # Check explicit DB role_permissions
        for perm in getattr(role, "permissions", []):
            codes.add(perm.code)
    return codes


def require_permission(permission_code: str):
    """FastAPI dependency factory enforcing a specific permission code on the backend."""
    def _dependency(user: User = Depends(get_current_user)) -> User:
        user_perms = get_user_permission_codes(user)
        if "*" in user_perms or permission_code in user_perms:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Missing required permission '{permission_code}'.",
        )
    return _dependency


def require_any_role(allowed_roles: List[str]):
    """FastAPI dependency factory enforcing membership in any of the specified roles."""
    normalized_allowed = {r.lower().replace(" ", "_") for r in allowed_roles}
    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.is_superuser:
            return user
        user_role_names = {r.name.lower().replace(" ", "_") for r in user.roles}
        if not user_role_names.intersection(normalized_allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User requires one of roles: {', '.join(allowed_roles)}.",
            )
        return user
    return _dependency


def sanitize_internal_business_data(data: Dict[str, Any], user: User) -> Dict[str, Any]:
    """
    Protects restricted MMJ-DOCS internal metrics (revenue, appointment volume, internal physician capacity)
    from unauthorized users who only hold public research privileges.
    """
    user_perms = get_user_permission_codes(user)
    if "internal_metrics:read" in user_perms or "*" in user_perms:
        return data  # Authorized: return full internal business metrics

    sanitized = data.copy()
    restricted_fields = [
        "estimated_revenue",
        "appointment_volume",
        "physician_capacity",
        "internal_revenue",
        "internal_cost",
        "weekly_capacity",
        "current_workload",
    ]
    for field in restricted_fields:
        if field in sanitized:
            sanitized[field] = "[RESTRICTED - INTERNAL MMJ-DOCS DATA]"

    return sanitized


def validate_safe_url(url: str) -> str:
    """
    SSRF Protection: Validates that a user-provided or scraped URL targets a safe,
    public surface-web HTTP/HTTPS destination and blocks internal/private IP ranges.
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

    # Check if host is an IP address
    parsed_ip = None
    try:
        parsed_ip = ipaddress.ip_address(hostname)
    except ValueError:
        pass  # Hostname is a standard domain name (e.g. google.com)

    if parsed_ip is not None:
        if parsed_ip.is_private or parsed_ip.is_loopback or parsed_ip.is_link_local or parsed_ip.is_reserved:
            raise ValueError(f"Access to private IP address '{hostname}' is blocked.")

    return url
