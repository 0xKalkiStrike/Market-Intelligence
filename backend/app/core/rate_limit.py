"""
In-Process Sliding-Window Rate Limiter Middleware (Phase 5).
Protects API endpoints from denial-of-service, scraping abuse, and brute-force attacks.
"""
import time
from collections import defaultdict
from threading import Lock
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SlidingWindowRateLimiter:
    def __init__(self, requests_per_minute: int = 120):
        self.rpm = requests_per_minute
        self.window_size = 60.0  # 60 seconds
        self._requests = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, client_key: str) -> tuple[bool, int, float]:
        now = time.time()
        with self._lock:
            timestamps = self._requests[client_key]
            # Evict timestamps older than 60 seconds
            valid_timestamps = [t for t in timestamps if now - t < self.window_size]
            self._requests[client_key] = valid_timestamps

            remaining = max(0, self.rpm - len(valid_timestamps))
            reset_after = round(self.window_size - (now - valid_timestamps[0]), 1) if valid_timestamps else 0.0

            if len(valid_timestamps) >= self.rpm:
                return False, 0, reset_after

            valid_timestamps.append(now)
            return True, remaining - 1, self.window_size


rate_limiter = SlidingWindowRateLimiter(requests_per_minute=200)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Exempt health checks and metrics from rate limits
        path = request.url.path
        if path.startswith("/api/health") or path == "/api/metrics":
            return await call_next(request)

        # Client identifier (Bearer token if present, otherwise client host IP)
        auth_header = request.headers.get("Authorization", "")
        client_key = auth_header if auth_header else (request.client.host if request.client else "unknown")

        allowed, remaining, reset_after = rate_limiter.is_allowed(client_key)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait before issuing additional requests.",
                    "retry_after_seconds": reset_after,
                },
                headers={
                    "X-RateLimit-Limit": str(rate_limiter.rpm),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_after),
                    "Retry-After": str(int(reset_after) + 1),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rate_limiter.rpm)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
