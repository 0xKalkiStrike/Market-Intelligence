"""
API Keys & Service Accounts Authentication Layer (Phase 6).
Provides secure programmatic access for external enterprise consumers:
- Prefix + cryptographically secure hashed secret (SHA-256)
- Secret key displayed strictly once upon generation
- Scope-based access control and rate limits per key
- Usage tracking, rotation, and revocation
"""
import hashlib
import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.deps import get_optional_current_user
from app.auth.rbac import get_user_permission_codes
from app.database.models import ApiKey, User, utc_now
from app.database.session import get_db

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


@dataclass
class AuthenticatedPrincipal:
    """Unified principal representing either an interactive human User or an automated Service Account."""
    is_service_account: bool
    user: Optional[User] = None
    api_key: Optional[ApiKey] = None
    scopes: Set[str] = None
    identifier: str = ""

    def has_scope(self, required_scope: str) -> bool:
        if "*" in self.scopes or required_scope in self.scopes:
            return True
        return False


# In-memory sliding window rate-limiter for API keys
_KEY_RATE_LIMITS: Dict[str, List[float]] = {}


def generate_secure_api_key(
    name: str,
    scopes: List[str],
    user_id: Optional[str] = None,
    rate_limit_per_minute: int = 60,
    expires_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Generates a secure API key pair:
    Returns the raw secret (to be presented ONCE to caller) and persists only the SHA-256 hash.
    """
    prefix = f"mmj_{os.urandom(4).hex()}"
    raw_secret = os.urandom(24).hex()
    full_api_key = f"{prefix}_{raw_secret}"
    hashed_secret = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()

    return {
        "full_api_key": full_api_key,
        "prefix": prefix,
        "hashed_key": hashed_secret,
        "name": name,
        "scopes": scopes,
        "user_id": user_id,
        "rate_limit_per_minute": rate_limit_per_minute,
        "expires_at": expires_at,
    }


def verify_api_key(
    api_key_str: str,
    db: Session,
) -> ApiKey:
    """Verifies format, hash, active status, expiration, and rate limit of incoming API key."""
    if not api_key_str or "_" not in api_key_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format.",
        )

    parts = api_key_str.split("_", 2)
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed API key.",
        )

    prefix = f"{parts[0]}_{parts[1]}"
    raw_secret = parts[2]
    candidate_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()

    key_record = db.query(ApiKey).filter(ApiKey.prefix == prefix).first()
    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key not recognized.",
        )

    if not key_record.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key has been revoked or deactivated.",
        )

    if key_record.expires_at:
        exp = key_record.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API key has expired.",
            )

    if key_record.hashed_key != candidate_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key secret.",
        )

    # In-process rate limiting per API key
    now = time.time()
    timestamps = _KEY_RATE_LIMITS.setdefault(key_record.prefix, [])
    # Evict timestamps older than 60s
    _KEY_RATE_LIMITS[key_record.prefix] = [ts for ts in timestamps if now - ts < 60.0]
    if len(_KEY_RATE_LIMITS[key_record.prefix]) >= key_record.rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {key_record.rate_limit_per_minute} requests/minute allowed.",
        )
    _KEY_RATE_LIMITS[key_record.prefix].append(now)

    # Track usage stats
    key_record.requests_count += 1
    key_record.last_used_at = utc_now()
    db.commit()

    return key_record


def get_authenticated_principal(
    api_key_header_val: Optional[str] = Security(api_key_header),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> AuthenticatedPrincipal:
    """
    Unified authentication dependency:
    Resolves caller identity from either X-API-Key header OR Bearer JWT session token.
    """
    # 1. Check API Key
    if api_key_header_val:
        key_record = verify_api_key(api_key_header_val, db)
        try:
            scopes_list = json.loads(key_record.scopes)
        except Exception:
            scopes_list = ["intelligence:read"]

        return AuthenticatedPrincipal(
            is_service_account=True,
            api_key=key_record,
            scopes=set(scopes_list),
            identifier=f"service_account:{key_record.name} ({key_record.prefix})",
        )

    # 2. Check JWT User Session
    if current_user:
        user_perms = get_user_permission_codes(current_user)
        return AuthenticatedPrincipal(
            is_service_account=False,
            user=current_user,
            scopes=user_perms,
            identifier=f"user:{current_user.email}",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide valid 'Authorization: Bearer <token>' or 'X-API-Key' header.",
    )


def require_governed_scope(required_scope: str):
    """Dependency factory checking that the caller holds the specified permission or scope."""
    def _checker(principal: AuthenticatedPrincipal = Depends(get_authenticated_principal)) -> AuthenticatedPrincipal:
        if not principal.has_scope(required_scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission/scope '{required_scope}'.",
            )
        return principal
    return _checker
