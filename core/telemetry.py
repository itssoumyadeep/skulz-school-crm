"""Privacy-safe structured telemetry, PII redaction, and in-memory metrics registry for Skool CRM."""

import json
import logging
import re
import threading
import time
import urllib.request
from collections import deque
from typing import Any, Dict, Iterable, List, Optional

from django.conf import settings

telemetry_logger = logging.getLogger("skool_crm.telemetry")

SENSITIVE_KEY_TOKENS = (
    "password",
    "passwd",
    "secret",
    "token",
    "authorization",
    "cookie",
    "pickup_pin",
    "supervisor_pin",
    "pin_hash",
    "email",
    "phone",
    "dob",
    "date_of_birth",
    "allerg",
    "condition",
    "medication",
    "medicine",
    "health",
    "medical",
    "diagnosis",
    "incident_description",
    "student_name",
    "parent_name",
    "full_name",
    "first_name",
    "last_name",
    "card",
    "cvc",
    "stripe_signature",
)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?")


def _is_sensitive_key(key: str) -> bool:
    normalized = str(key or "").strip().lower()
    return any(tok in normalized for tok in SENSITIVE_KEY_TOKENS)


def scrub_pii(value: Any, *, key_hint: str = "") -> Any:
    """Recursively redact PII, credentials, tokens, and health details from telemetry payloads."""
    if key_hint and _is_sensitive_key(key_hint):
        return "[REDACTED]"

    if isinstance(value, dict):
        return {
            str(k)[:64]: scrub_pii(v, key_hint=str(k))
            for k, v in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [scrub_pii(item) for item in value[:50]]

    if isinstance(value, str):
        sanitized = JWT_RE.sub("[REDACTED_JWT]", value)
        sanitized = EMAIL_RE.sub("[REDACTED_EMAIL]", sanitized)
        return sanitized[:512]

    if isinstance(value, (int, float, bool)) or value is None:
        return value

    return str(value)[:256]


class TelemetryRegistry:
    """Thread-safe in-memory telemetry aggregator for observability summary and unit assertions."""

    def __init__(self, max_latencies: int = 500):
        self._lock = threading.Lock()
        self._latencies = deque(maxlen=max_latencies)
        self._total_requests = 0
        self._status_counts: Dict[str, int] = {}
        self._funnel_counts: Dict[str, int] = {}
        self._source_counts: Dict[str, int] = {}
        self._recent_events: deque = deque(maxlen=100)

    def reset(self) -> None:
        with self._lock:
            self._latencies.clear()
            self._total_requests = 0
            self._status_counts.clear()
            self._funnel_counts.clear()
            self._source_counts.clear()
            self._recent_events.clear()

    def record(self, event: Dict[str, Any]) -> None:
        event_name = str(event.get("event_name") or "unknown")
        source = str(event.get("source") or "backend")
        status_code = event.get("status_code")
        duration_ms = event.get("duration_ms")

        with self._lock:
            self._source_counts[source] = self._source_counts.get(source, 0) + 1
            self._funnel_counts[event_name] = self._funnel_counts.get(event_name, 0) + 1
            if event_name == "http_request":
                self._total_requests += 1
            if isinstance(status_code, int):
                key = str(status_code)
                self._status_counts[key] = self._status_counts.get(key, 0) + 1
            if isinstance(duration_ms, (int, float)) and duration_ms >= 0:
                self._latencies.append(float(duration_ms))
            self._recent_events.append(event)

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            samples = sorted(self._latencies)
            count = len(samples)
            p50 = samples[int(0.50 * (count - 1))] if count else 0.0
            p95 = samples[int(0.95 * (count - 1))] if count else 0.0
            return {
                "total_requests": self._total_requests,
                "latency_ms": {
                    "samples": count,
                    "p50": round(p50, 2),
                    "p95": round(p95, 2),
                },
                "status_counts": dict(self._status_counts),
                "source_counts": dict(self._source_counts),
                "event_counts": dict(self._funnel_counts),
            }

    def recent(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._recent_events)


registry = TelemetryRegistry()


def sanitize_telemetry_path(path: str) -> str:
    """Replace UUIDs and long numeric IDs in URL paths before telemetry logging."""
    if not path:
        return "/"
    cleaned = path.split("?", 1)[0]
    cleaned = re.sub(
        r"/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
        "/:id",
        cleaned,
    )
    cleaned = re.sub(r"/\d+(?=/|$)", "/:id", cleaned)
    return cleaned[:200]


def _forward_otlp_best_effort(endpoint: str, payload: Dict[str, Any]) -> None:
    if not endpoint:
        return
    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=0.5).close()
    except Exception:
        # Telemetry transport failures must never interrupt requests.
        pass


def emit_telemetry_event(
    *,
    source: str,
    event_name: str,
    request_id: str = "",
    tenant_id: str = "",
    role: str = "",
    status_code: Optional[int] = None,
    duration_ms: Optional[float] = None,
    properties: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Scrub, record, and emit a structured JSON telemetry event."""
    safe_event: Dict[str, Any] = {
        "ts": round(time.time(), 3),
        "source": str(source)[:40],
        "event_name": str(event_name)[:80],
        "request_id": str(request_id or "")[:64],
        "tenant_id": str(tenant_id or "")[:64],
        "role": str(role or "")[:40],
        "status_code": status_code if isinstance(status_code, int) else None,
        "duration_ms": round(float(duration_ms), 2) if isinstance(duration_ms, (int, float)) else None,
        "properties": scrub_pii(properties or {}),
    }

    if not getattr(settings, "TELEMETRY_ENABLED", True):
        return safe_event

    registry.record(safe_event)
    telemetry_logger.info(json.dumps(safe_event, sort_keys=True))

    endpoint = getattr(settings, "TELEMETRY_OTLP_ENDPOINT", "") or ""
    if endpoint.startswith(("https://", "http://")):
        threading.Thread(
            target=_forward_otlp_best_effort,
            args=(endpoint, safe_event),
            daemon=True,
        ).start()

    return safe_event
