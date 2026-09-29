from functools import wraps
from django.http import JsonResponse
from core.schemas.base import build_error

def require_roles(*allowed_roles: str):
    """
    Decorator for Django Ninja endpoints enforcing RBAC against request.user_role.
    Returns HTTP 403 with standard envelope on failure.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            role = getattr(request, 'user_role', None)
            if role not in allowed_roles:
                tenant_id = getattr(request, 'tenant_id', None)
                error_payload = build_error(
                    errors=[{
                        "code": "RBAC_DENIED",
                        "field": "role",
                        "message": f"Role '{role}' is not permitted to perform this action. Required: {list(allowed_roles)}"
                    }],
                    tenant_id=tenant_id,
                    role=role
                )
                return JsonResponse(error_payload, status=403)
            return func(request, *args, **kwargs)
        return wrapper
    return decorator
