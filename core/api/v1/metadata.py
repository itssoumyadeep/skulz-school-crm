from django.http import JsonResponse
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.business_objects.data_catalog import build_data_catalog
from core.schemas.base import build_response

router = Router(tags=["Administrative Metadata"])


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