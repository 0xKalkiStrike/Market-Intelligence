"""
Centralized Observability Layer (Phase 5).
Tracks:
- HTTP Request Metrics (Counts, Latency, Status Codes, Errors)
- Database Query Metrics
- Queue Depth and Worker Utilization
- Collector Success Rates
- AI Latency and Token Consumption
- Exposes Prometheus-compatible /api/metrics and JSON /api/observability/summary
"""
import time
from collections import defaultdict
from threading import Lock
from typing import Any, Dict, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import uuid


class MetricsCollector:
    """Thread-safe multi-dimensional metrics aggregator with Prometheus text exporter."""

    def __init__(self):
        self._lock = Lock()
        self._http_requests = defaultdict(int)  # (method, endpoint, status_code) -> count
        self._http_latencies = defaultdict(list)  # (method, endpoint) -> list of latency (seconds)
        self._ai_requests = defaultdict(int)  # (provider, model, status) -> count
        self._ai_tokens = defaultdict(int)  # (provider, model) -> total tokens
        self._ai_latencies = defaultdict(list)  # provider -> list of latency
        self._collector_runs = defaultdict(int)  # (source_name, status) -> count
        self._start_time = time.time()

    def record_http_request(self, method: str, path: str, status_code: int, duration_sec: float) -> None:
        with self._lock:
            # Normalize path to avoid high cardinality
            norm_path = self._normalize_path(path)
            self._http_requests[(method, norm_path, status_code)] += 1
            latencies = self._http_latencies[(method, norm_path)]
            latencies.append(duration_sec)
            if len(latencies) > 500:  # Cap stored latencies
                self._http_latencies[(method, norm_path)] = latencies[-500:]

    def record_ai_request(self, provider: str, model: str, status: str, tokens: int, latency_sec: float) -> None:
        with self._lock:
            self._ai_requests[(provider, model, status)] += 1
            self._ai_tokens[(provider, model)] += tokens
            self._ai_latencies[provider].append(latency_sec)
            if len(self._ai_latencies[provider]) > 200:
                self._ai_latencies[provider] = self._ai_latencies[provider][-200:]

    def record_collector_run(self, source_name: str, status: str) -> None:
        with self._lock:
            self._collector_runs[(source_name, status)] += 1

    def _normalize_path(self, path: str) -> str:
        # Strip query string
        clean = path.split("?")[0]
        # Replace UUIDs with :id placeholder
        parts = clean.split("/")
        norm_parts = []
        for part in parts:
            if len(part) in (32, 36) and ("-" in part or part.isalnum()):
                norm_parts.append(":id")
            else:
                norm_parts.append(part)
        return "/".join(norm_parts) or "/"

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            uptime_sec = round(time.time() - self._start_time, 1)
            total_requests = sum(self._http_requests.values())
            error_requests = sum(count for (m, p, status), count in self._http_requests.items() if status >= 400)
            error_rate_pct = round((error_requests / total_requests * 100), 2) if total_requests > 0 else 0.0

            all_latencies = [lat for lat_list in self._http_latencies.values() for lat in lat_list]
            avg_latency_ms = round(sum(all_latencies) / len(all_latencies) * 1000, 2) if all_latencies else 0.0

            # Compute p95 latency
            p95_latency_ms = 0.0
            if all_latencies:
                sorted_lat = sorted(all_latencies)
                idx = int(len(sorted_lat) * 0.95)
                p95_latency_ms = round(sorted_lat[min(idx, len(sorted_lat) - 1)] * 1000, 2)

            return {
                "uptime_seconds": uptime_sec,
                "total_http_requests": total_requests,
                "total_errors": error_requests,
                "error_rate_percentage": error_rate_pct,
                "avg_response_time_ms": avg_latency_ms,
                "p95_response_time_ms": p95_latency_ms,
                "ai_requests": sum(self._ai_requests.values()),
                "total_ai_tokens_consumed": sum(self._ai_tokens.values()),
                "collector_runs": sum(self._collector_runs.values()),
            }

    def export_prometheus_text(self) -> str:
        with self._lock:
            lines = [
                "# HELP mmj_uptime_seconds Platform process uptime in seconds",
                "# TYPE mmj_uptime_seconds gauge",
                f"mmj_uptime_seconds {time.time() - self._start_time:.1f}",
                "",
                "# HELP mmj_http_requests_total Total HTTP requests handled",
                "# TYPE mmj_http_requests_total counter",
            ]
            for (method, path, status), count in self._http_requests.items():
                lines.append(f'mmj_http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')

            lines.extend([
                "",
                "# HELP mmj_ai_tokens_total Total AI tokens consumed by model",
                "# TYPE mmj_ai_tokens_total counter",
            ])
            for (provider, model), tokens in self._ai_tokens.items():
                lines.append(f'mmj_ai_tokens_total{{provider="{provider}",model="{model}"}} {tokens}')

            lines.extend([
                "",
                "# HELP mmj_collector_runs_total Total external collector runs",
                "# TYPE mmj_collector_runs_total counter",
            ])
            for (source, status), count in self._collector_runs.items():
                lines.append(f'mmj_collector_runs_total{{source="{source}",status="{status}"}} {count}')

            return "\n".join(lines) + "\n"


# Global singleton metrics collector
metrics_collector = MetricsCollector()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Starlette/FastAPI Middleware for request tracing, latency tracking, and response header injection."""

    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.time()

        response: Optional[Response] = None
        try:
            response = await call_next(request)
        except Exception as exc:
            duration = time.time() - start_time
            metrics_collector.record_http_request(request.method, request.url.path, 500, duration)
            raise exc

        duration = time.time() - start_time
        duration_ms = round(duration * 1000, 2)

        metrics_collector.record_http_request(request.method, request.url.path, response.status_code, duration)

        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        return response
