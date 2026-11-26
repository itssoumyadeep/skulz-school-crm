"""Root NinjaAPI router initialization and v1 API aggregator."""

from django.conf import settings
from django.http import JsonResponse
from ninja import NinjaAPI
from core.api.v1.enrollments import router as enrollments_router
from core.api.v1.auth import router as auth_router
from core.api.v1.academics import router as academics_router
from core.api.v1.attendance import router as attendance_router
from core.api.v1.health import router as health_router
from core.api.v1.billing import router as billing_router
from core.api.v1.sprint5 import router as sprint5_router
from core.api.v1.analytics import router as analytics_router
from core.api.v1.metadata import router as metadata_router
from core.api.v1.school_setup import router as school_setup_router
from core.api.v1.care_events import router as care_events_router
from core.business_objects.base import BusinessRuleError
from core.business_objects.trial import TrialExpiredError
from core.schemas.base import build_error

api = NinjaAPI(
    title="The Purple Cubby CRM API",
    version="1.0.0",
    description="Multi-Tenant CRM for Educational Institutions — 3-Layer Architecture"
)

# Global Business Rule Exception Handler -> HTTP 422
@api.exception_handler(BusinessRuleError)
def business_rule_exception_handler(request, exc: BusinessRuleError):
    tenant_id = getattr(request, 'tenant_id', None)
    role = getattr(request, 'user_role', None)
    return JsonResponse(
        build_error(
            errors=[v.to_dict() for v in exc.violations],
            tenant_id=tenant_id,
            role=role
        ),
        status=422
    )


@api.exception_handler(TrialExpiredError)
def trial_expired_exception_handler(request, exc: TrialExpiredError):
    tenant_id = getattr(request, 'tenant_id', None)
    role = getattr(request, 'user_role', None)
    return JsonResponse(
        build_error(
            errors=[{
                "code": exc.code,
                "field": "tenant",
                "message": exc.message,
                "trial_ends_at": exc.trial_ends_at,
            }],
            tenant_id=tenant_id,
            role=role,
        ),
        status=exc.status,
    )


@api.exception_handler(Exception)
def sanitized_unhandled_exception_handler(request, exc: Exception):
    if settings.DEBUG:
        raise exc
    request_id = getattr(request, 'request_id', None)
    return JsonResponse(
        build_error(
            errors=[{
                "code": "INTERNAL_SERVER_ERROR",
                "field": "server",
                "message": "An internal server error occurred.",
                "request_id": request_id,
            }],
            tenant_id=getattr(request, 'tenant_id', None),
            role=getattr(request, 'user_role', None),
        ),
        status=500,
    )

# Mount Routers
api.add_router("/v1/", auth_router)
api.add_router("/v1/", enrollments_router)
api.add_router("/v1/", academics_router)
api.add_router("/v1/", attendance_router)
api.add_router("/v1/", health_router)
api.add_router("/v1/", billing_router)
api.add_router("/v1/", sprint5_router)
api.add_router("/v1/", analytics_router)
api.add_router("/v1/", metadata_router)
api.add_router("/v1/", school_setup_router)
api.add_router("/v1/", care_events_router)

__all__ = ['api']
