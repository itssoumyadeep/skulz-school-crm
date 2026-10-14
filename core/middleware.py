from django.db import connection
from django.conf import settings
from django.http import HttpResponse


class CorsMiddleware:
    """
    Enables CORS for Next.js frontend during development and local testing.
    Handles OPTIONS preflight requests immediately.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "").rstrip("/")
        allowed_origin = origin if origin in settings.CORS_ALLOWED_ORIGINS else None

        if request.method == "OPTIONS":
            response = HttpResponse()
            if allowed_origin:
                response["Access-Control-Allow-Origin"] = allowed_origin
                response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        if allowed_origin:
            response["Access-Control-Allow-Origin"] = allowed_origin
            response["Vary"] = "Origin"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
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
