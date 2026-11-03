from uuid import UUID

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.business_objects.school_setup import (
    DATASET_TEMPLATES,
    SchoolSetupBO,
    SchoolSetupImportBO,
    SchoolSetupImportError,
)
from core.models import Tenant
from core.schemas.base import build_error, build_response
from core.schemas.school_setup import (
    SchoolSetupImportSchema,
    TenantConfigUpdateInput,
    TenantDeactivateInput,
)

router = Router(tags=["School Setup"])


@router.get("/school-setup/config", auth=JWTAuthBearer())
@require_roles("Admin", "Principal", "Owner")
def get_school_setup_config(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, "user_role", "Admin")
    return JsonResponse(
        build_response(
            data={
                "school": {
                    "tenant_id": str(tenant.tenant_id),
                    "name": tenant.name,
                    "school_code": tenant.subdomain,
                    "region": tenant.region,
                    "type": tenant.type,
                    "subscription_tier": tenant.subscription_tier,
                    "config": tenant.config or {},
                },
                "datasets": DATASET_TEMPLATES,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.patch("/school-setup/config", auth=JWTAuthBearer())
@require_roles("Admin", "Owner")
def update_school_setup_config(request, payload: TenantConfigUpdateInput):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, "user_id", None) else None
    actor_role = getattr(request, "user_role", "Admin")
    data = SchoolSetupBO.update_tenant_config(
        tenant=tenant,
        data=payload.model_dump(exclude_none=True),
        actor_id=actor_id,
    )
    return JsonResponse(
        build_response(data={"school": data}, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.post("/school-setup/deactivate", auth=JWTAuthBearer())
@require_roles("Owner")
def deactivate_school_tenant(request, payload: TenantDeactivateInput):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_id = UUID(request.user_id) if getattr(request, "user_id", None) else None
    data = SchoolSetupBO.deactivate_tenant(
        tenant=tenant,
        reason=payload.reason,
        actor_id=actor_id,
        force=payload.force,
    )
    return JsonResponse(
        build_response(data=data, tenant_id=request.tenant_id, role="Owner"),
        status=200,
    )


@router.get("/school-setup/sequences", auth=JWTAuthBearer())
@require_roles("Admin", "Owner")
def list_tenant_sequences(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, "user_role", "Admin")
    data = SchoolSetupBO.list_sequences(tenant=tenant)
    return JsonResponse(
        build_response(data=data, tenant_id=request.tenant_id, role=actor_role),
        status=200,
    )


@router.get("/audit-logs", auth=JWTAuthBearer())
@require_roles("Admin", "Owner")
def list_audit_logs(
    request,
    entity: str = None,
    action: str = None,
    actor_id: UUID = None,
    limit: int = 100,
):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, "user_role", "Admin")
    data = SchoolSetupBO.list_audit_logs(
        tenant=tenant,
        entity=entity,
        action=action,
        actor_id=actor_id,
        limit=limit,
    )
    return JsonResponse(
        build_response(data=data, tenant_id=request.tenant_id, role=actor_role),
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