from django.db import connection
from django.http import HttpResponse


class CorsMiddleware:
    """
    Enables CORS for Next.js frontend during development and local testing.
    Handles OPTIONS preflight requests immediately.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Tenant-Id, Accept, Origin, X-Requested-With"
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Tenant-Id, Accept, Origin, X-Requested-With"
        return response


class TenantSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract tenant info from request (e.g. from JWT auth parsed request)
        tenant_id = getattr(request, 'tenant_id', None)

        if tenant_id:
            with connection.cursor() as cursor:
                # Set tenant context in PostgreSQL session safely
                cursor.execute("SELECT set_config('app.current_tenant_id', %s, FALSE)", [str(tenant_id)])
        else:
            with connection.cursor() as cursor:
                cursor.execute("RESET app.current_tenant_id;")

        response = self.get_response(request)
        return response

