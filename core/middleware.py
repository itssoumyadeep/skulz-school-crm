"""Middlewares for CORS, X-Request-ID telemetry, security headers, rate limiting, and tenant RLS reset."""

import re
import time
import uuid

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse, JsonResponse

from core.telemetry import emit_telemetry_event, sanitize_telemetry_path

REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{8,64}$")


def _extract_client_ip(request) -> str:
    xff = request.headers.get("X-Forwarded-For", "").strip()
    if xff:
        return xff.split(",")[0].strip()[:64]
    return (request.META.get("REMOTE_ADDR") or "unknown")[:64]


def _allowed_origin(request) -> str | None:
    origin = request.headers.get("Origin", "").rstrip("/")
    return origin if origin in settings.CORS_ALLOWED_ORIGINS else None


class CorsMiddleware:
    """
    Enables CORS for Next.js frontend and Skulz marketing site during development and local testing.
    Handles OPTIONS preflight requests immediately.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed_origin = _allowed_origin(request)

        if request.method == "OPTIONS":
            response = HttpResponse()
            if allowed_origin:
                response["Access-Control-Allow-Origin"] = allowed_origin
                response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, Accept, Origin, X-Requested-With, X-Request-ID"
            )
            response["Access-Control-Expose-Headers"] = (
                "X-Request-ID, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining"
            )
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        if allowed_origin:
            response["Access-Control-Allow-Origin"] = allowed_origin
            response["Vary"] = "Origin"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, Accept, Origin, X-Requested-With, X-Request-ID"
        )
        response["Access-Control-Expose-Headers"] = (
            "X-Request-ID, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining"
        )
        return response


class RequestTelemetryMiddleware:
    """Propagates X-Request-ID and emits redacted JSON latency/status telemetry per request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = request.headers.get("X-Request-ID", "").strip()
        request_id = incoming_id if REQUEST_ID_RE.match(incoming_id) else str(uuid.uuid4())
        request.request_id = request_id

        started = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - started) * 1000.0

        response["X-Request-ID"] = request_id

        tenant_id = str(getattr(request, "tenant_id", "") or "")
        role = str(getattr(request, "user_role", "") or "")
        safe_path = sanitize_telemetry_path(getattr(request, "path", "/"))
        emit_telemetry_event(
            source="skool_crm_api",
            event_name="http_request",
            request_id=request_id,
            tenant_id=tenant_id,
            role=role,
            status_code=getattr(response, "status_code", 200),
            duration_ms=duration_ms,
            properties={
                "method": getattr(request, "method", "GET"),
                "path": safe_path,
            },
        )
        return response


class SecurityHeadersMiddleware:
    """Applies baseline VAPT security headers across API and Django admin responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("X-Frame-Options", "DENY")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()",
        )
        if getattr(request, "path", "").startswith("/api/v1/auth/"):
            response["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response["Pragma"] = "no-cache"
        if "Server" in response:
            del response["Server"]
        return response


class RateLimitMiddleware:
    """Fixed-window per-IP throttle protecting auth, trial signup, public apply, checkout, and telemetry ingestion."""

    def __init__(self, get_response):
        self.get_response = get_response

    def _rule_for_request(self, request):
        if getattr(request, "method", "") != "POST":
            return None
        path = getattr(request, "path", "")
        if path in ("/api/v1/auth/login", "/api/v1/auth/signup", "/api/v1/auth/recover-school-code"):
            return ("auth", int(getattr(settings, "RATE_LIMIT_AUTH_PER_MIN", 60)))
        if path in ("/api/v1/auth/trial-signup", "/api/v1/enrollments/public-apply"):
            return ("trial", int(getattr(settings, "RATE_LIMIT_TRIAL_PER_MIN", 20)))
        if path == "/api/v1/parent/billing/checkout":
            return ("checkout", int(getattr(settings, "RATE_LIMIT_TRIAL_PER_MIN", 20)))
        if path == "/api/v1/telemetry/events":
            return ("telemetry", int(getattr(settings, "RATE_LIMIT_TELEMETRY_PER_MIN", 240)))
        return None

    def __call__(self, request):
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return self.get_response(request)

        rule = self._rule_for_request(request)
        if rule is None:
            return self.get_response(request)

        bucket_name, limit = rule
        client_ip = _extract_client_ip(request)
        window = int(time.time() // 60)
        cache_key = f"rl:{bucket_name}:{client_ip}:{window}"

        try:
            current = cache.get(cache_key)
            if current is None:
                cache.set(cache_key, 1, timeout=65)
                current = 1
            else:
                current = int(current) + 1
                cache.set(cache_key, current, timeout=65)
        except Exception:
            # Fail open only on transient cache backend outage so legitimate users are not locked out.
            return self.get_response(request)

        remaining = max(0, limit - current)
        if current > limit:
            retry_after = max(1, 60 - int(time.time() % 60))
            emit_telemetry_event(
                source="skool_crm_api",
                event_name="rate_limit_blocked",
                request_id=str(getattr(request, "request_id", "") or ""),
                status_code=429,
                properties={"bucket": bucket_name, "path": sanitize_telemetry_path(request.path)},
            )
            resp = JsonResponse(
                {
                    "data": None,
                    "errors": [
                        {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "field": "rate_limit",
                            "message": "Too many requests. Please wait before trying again.",
                        }
                    ],
                },
                status=429,
            )
            resp["Retry-After"] = str(retry_after)
            resp["X-RateLimit-Limit"] = str(limit)
            resp["X-RateLimit-Remaining"] = "0"
            return resp

        response = self.get_response(request)
        response["X-RateLimit-Limit"] = str(limit)
        response["X-RateLimit-Remaining"] = str(remaining)
        return response


class TenantSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Authentication happens inside Django Ninja after middleware. Clear
        # connection state here; JWTAuthBearer establishes it after validation.
        self._clear_context()
        try:
            return self.get_response(request)
        finally:
            # Database connections may be reused, so never let request context
            # leak into the next request.
            self._clear_context()

    @staticmethod
    def _clear_context():
        with connection.cursor() as cursor:
            cursor.execute("RESET app.current_tenant_id;")
            cursor.execute("RESET app.current_user_id;")
