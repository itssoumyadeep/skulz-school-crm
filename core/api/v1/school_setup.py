from uuid import UUID

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.business_objects.school_setup import (
    DATASET_TEMPLATES,
    SchoolSetupImportBO,
    SchoolSetupImportError,
)
from core.models import Tenant
from core.schemas.base import build_error, build_response
from core.schemas.school_setup import SchoolSetupImportSchema

router = Router(tags=["School Setup"])


@router.get("/school-setup/config", auth=JWTAuthBearer())
@require_roles("Admin")
def get_school_setup_config(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    return JsonResponse(
        build_response(
            data={
                "school": {
                    "tenant_id": str(tenant.tenant_id),
                    "name": tenant.name,
                    "school_code": tenant.subdomain,
                    "region": tenant.region,
                    "type": tenant.type,
                },
                "datasets": DATASET_TEMPLATES,
            },
            tenant_id=request.tenant_id,
            role="Admin",
        ),
        status=200,
    )


@router.post("/school-setup/import", auth=JWTAuthBearer())
@require_roles("Admin")
def import_school_setup_dataset(request, payload: SchoolSetupImportSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, "user_id", None) else None
    try:
        result = SchoolSetupImportBO.import_dataset(
            tenant=tenant,
            dataset=payload.dataset,
            records=payload.records,
            actor_id=actor_id,
            actor_role=getattr(request, "user_role", "Admin"),
        )
    except SchoolSetupImportError as exc:
        return JsonResponse(
            build_error(
                errors=[{
                    "code": "IMPORT_VALIDATION_ERROR",
                    "field": f"records.{exc.row_number}",
                    "message": str(exc),
                }],
                tenant_id=request.tenant_id,
                role="Admin",
            ),
            status=422,
        )

    return JsonResponse(
        build_response(
            data=result,
            tenant_id=request.tenant_id,
            role="Admin",
        ),
        status=201,
    )