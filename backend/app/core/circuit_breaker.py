"""
Circuit Breaker Pattern for Enterprise Reliability (Phase 5).
Protects the platform against cascading failures from slow or failing external APIs
(NPI Registry, OpenStreetMap, AI Providers, Government Portals).
"""
import time
from enum import Enum
from threading import Lock
from typing import Any, Callable, Dict, Optional


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operation: requests pass through
    OPEN = "OPEN"            # Failing: requests fail fast without hitting the provider
    HALF_OPEN = "HALF_OPEN"  # Testing: a trial request is permitted to probe recovery


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    def __init__(self, name: str, retry_after: float):
        super().__init__(f"Circuit breaker '{name}' is OPEN. Retry after {retry_after:.1f}s.")
        self.name = name
        self.retry_after = retry_after


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_trials: int = 2,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_trials = half_open_max_trials

        self._state: CircuitState = CircuitState.CLOSED
        self._failure_count: int = 0
        self._success_count: int = 0
        self._last_state_change: float = time.time()
        self._last_failure_time: Optional[float] = None
        self._last_error_message: Optional[str] = None
        self._lock = Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if recovery timeout has elapsed
                if time.time() - self._last_state_change >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._last_state_change = time.time()
                    self._success_count = 0
            return self._state

    def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        current_state = self.state
        if current_state == CircuitState.OPEN:
            time_left = max(0.0, self.recovery_timeout - (time.time() - self._last_state_change))
            raise CircuitBreakerOpenException(self.name, time_left)

        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as exc:
            self._record_failure(str(exc))
            raise exc

    def _record_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.half_open_max_trials:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._last_state_change = time.time()
            elif self._state == CircuitState.CLOSED:
                self._failure_count = 0

    def _record_failure(self, error_message: str) -> None:
        with self._lock:
            self._last_failure_time = time.time()
            self._last_error_message = error_message
            if self._state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
                self._failure_count += 1
                if self._failure_count >= self.failure_threshold or self._state == CircuitState.HALF_OPEN:
                    self._state = CircuitState.OPEN
                    self._last_state_change = time.time()

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self._failure_count,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout_sec": self.recovery_timeout,
            "last_failure_time": self._last_failure_time,
            "last_error_message": self._last_error_message,
        }

    def reset(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_state_change = time.time()
            self._last_error_message = None


class CircuitBreakerRegistry:
    """Central registry of circuit breakers across all platform integrations."""
    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = Lock()

    def get_or_create(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ) -> CircuitBreaker:
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                )
            return self._breakers[name]

    def get_all_statuses(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            return {name: cb.get_status() for name, cb in self._breakers.items()}


# Global singleton registry
circuit_breaker_registry = CircuitBreakerRegistry()
