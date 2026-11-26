"""API v1 endpoints for system metadata, trial policy, health probes, and privacy-safe telemetry."""

from typing import Any, Dict, List, Literal, Optional

from django.db import connection
from django.http import JsonResponse
from ninja import Router
from pydantic import BaseModel, Field

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.business_objects.data_catalog import build_data_catalog
from core.business_objects.trial import TrialSignupBO
from core.schemas.base import build_error, build_response
from core.telemetry import emit_telemetry_event, registry

router = Router(tags=["Administrative Metadata & Telemetry"])


class TelemetryEventItem(BaseModel):
    event_name: str = Field(min_length=1, max_length=80)
    path: Optional[str] = Field(default=None, max_length=200)
    status_code: Optional[int] = Field(default=None, ge=0, le=999)
    duration_ms: Optional[float] = Field(default=None, ge=0.0, le=600000.0)
    properties: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TelemetryBatchSchema(BaseModel):
    app: Literal["skulz_marketing", "skool_crm_web"]
    events: List[TelemetryEventItem] = Field(min_length=1, max_length=25)


@router.get("/metadata/data-classification", auth=JWTAuthBearer())
@require_roles("Admin")
def get_data_classification(request):
    return JsonResponse(
        build_response(
            data=build_data_catalog(),
            tenant_id=request.tenant_id,
            role=getattr(request, "user_role", "Admin"),
        ),
        status=200,
    )


@router.get("/metadata/trial-policy")
def get_trial_policy(request):
    return JsonResponse(
        build_response(
            data={
                "default_trial_days": TrialSignupBO.get_default_trial_days(),
                "allowed_roles": ["Admin", "Owner", "Teacher"],
                "requires_credit_card": False,
            },
            role=None,
        ),
        status=200,
    )


@router.get("/healthz")
def healthz(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "skool_crm",
            "request_id": getattr(request, "request_id", ""),
        },
        status=200,
    )


@router.get("/readyz")
def readyz(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse(
            build_error(
                errors=[{
                    "code": "DATABASE_UNAVAILABLE",
                    "field": "database",
                    "message": "Database connectivity check failed.",
                }],
                role=None,
            ),
            status=503,
        )
    return JsonResponse(
        {
            "status": "ready",
            "database": "ok",
            "request_id": getattr(request, "request_id", ""),
        },
        status=200,
    )


@router.post("/telemetry/events")
def ingest_telemetry_events(request, payload: TelemetryBatchSchema):
    request_id = str(getattr(request, "request_id", "") or "")
    for item in payload.events:
        props = dict(item.properties or {})
        if item.path:
            props["path"] = item.path
        emit_telemetry_event(
            source=payload.app,
            event_name=item.event_name,
            request_id=request_id,
            status_code=item.status_code,
            duration_ms=item.duration_ms,
            properties=props,
        )
    return JsonResponse(
        build_response(
            data={
                "accepted": len(payload.events),
                "request_id": request_id,
            },
            role=None,
        ),
        status=202,
    )


@router.get("/telemetry/summary", auth=JWTAuthBearer())
@require_roles("Admin", "Owner")
def get_telemetry_summary(request):
    actor_role = getattr(request, "user_role", "Admin")
    return JsonResponse(
        build_response(
            data=registry.snapshot(),
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )
