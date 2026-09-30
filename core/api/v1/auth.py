import time
import uuid
from uuid import UUID

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, password_validation
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from jose import jwt
from ninja import Router

from core.models import PortalRoleMembership, Student, Tenant
from core.schemas.auth import LoginSchema, SignupSchema
from core.schemas.base import build_error, build_response

router = Router(tags=["Authentication"])

ROLE_CLAIMS = {
    "Admin": "admin",
    "Principal": "principal",
    "Vice_Principal": "vice_principal",
    "Teacher": "teacher",
    "CareGiver": "caregiver",
    "Parent": "parent",
    "Vendor": "vendor",
    "Owner": "owner",
    "Board": "board",
    "Trustee": "trustee",
    "Staff": "staff",
}


def _error(request, status: int, code: str, message: str):
    return JsonResponse(
        build_error(
            errors=[{"code": code, "field": "credentials", "message": message}],
            role=None,
        ),
        status=status,
    )


@router.post("/auth/login")
def login(request, payload: LoginSchema):
    try:
        tenant_uuid = UUID(payload.tenant)
    except (ValueError, TypeError):
        tenant_uuid = None

    tenant_query = Tenant.objects.filter(is_deleted=False) if hasattr(Tenant, "is_deleted") else Tenant.objects.all()
    tenant = (
        tenant_query.filter(tenant_id=tenant_uuid).first()
        if tenant_uuid
        else tenant_query.filter(subdomain__iexact=payload.tenant.strip()).first()
    )
    if tenant is None:
        return _error(request, 401, "AUTH_INVALID", "Invalid username, password, or school.")

    user = authenticate(
        request,
        username=payload.username.strip(),
        password=payload.password,
    )
    if user is None or not user.is_active:
        return _error(request, 401, "AUTH_INVALID", "Invalid username, password, or school.")

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('app.current_tenant_id', %s, FALSE)",
            [str(tenant.tenant_id)],
        )

    membership = PortalRoleMembership.objects.select_related("group").filter(
        user=user,
        tenant=tenant,
        is_active=True,
    ).first()
    if membership is None or membership.role not in ROLE_CLAIMS:
        return _error(request, 403, "ROLE_MEMBERSHIP_REQUIRED", "This user has no active role in the selected school.")

    role_claim = ROLE_CLAIMS[membership.role]
    subject = uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"school-crm:{tenant.tenant_id}:{user.pk}",
    )
    linked_student_ids = []
    if membership.role == "Parent" and user.email:
        linked_student_ids = [
            str(student_id)
            for student_id in Student.objects.filter(
                tenant=tenant,
                parents__email__iexact=user.email,
                is_deleted=False,
            ).values_list("student_id", flat=True).distinct()
        ]

    claims = {
        "sub": str(subject),
        "user_id": str(subject),
        "user_name": user.get_full_name() or user.username,
        "email": user.email,
        "tenant_id": str(tenant.tenant_id),
        "role": role_claim,
        "exp": int(time.time()) + 60 * 60 * 8,
        "linked_student_ids": linked_student_ids,
    }
    access_token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm="HS256")

    return JsonResponse(
        build_response(
            data={
                "access_token": access_token,
                "token_type": "Bearer",
                "expires_in": 60 * 60 * 8,
                "role": role_claim,
                "tenant_id": str(tenant.tenant_id),
                "user": {
                    "id": str(user.pk),
                    "username": user.username,
                    "name": user.get_full_name() or user.username,
                    "email": user.email,
                },
            },
            tenant_id=tenant.tenant_id,
            role=role_claim,
        ),
        status=200,
    )


@router.post("/auth/signup")
def signup(request, payload: SignupSchema):
    try:
        tenant_uuid = UUID(payload.tenant)
    except (ValueError, TypeError):
        tenant_uuid = None

    tenant_query = Tenant.objects.filter(is_deleted=False) if hasattr(Tenant, "is_deleted") else Tenant.objects.all()
    tenant = (
        tenant_query.filter(tenant_id=tenant_uuid).first()
        if tenant_uuid
        else tenant_query.filter(subdomain__iexact=payload.tenant.strip()).first()
    )
    if tenant is None:
        return JsonResponse(
            build_error(
                errors=[{"code": "SCHOOL_NOT_FOUND", "field": "tenant", "message": "Enter a valid school code."}],
                role=None,
            ),
            status=400,
        )

    user_model = get_user_model()
    email = str(payload.email).strip().lower()
    first_name, _, last_name = payload.full_name.partition(" ")
    candidate = user_model(
        username=email,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    try:
        password_validation.validate_password(payload.password, user=candidate)
    except ValidationError as exc:
        return JsonResponse(
            build_error(
                errors=[{"code": "WEAK_PASSWORD", "field": "password", "message": message} for message in exc.messages],
                tenant_id=tenant.tenant_id,
                role=None,
            ),
            status=400,
        )

    try:
        with transaction.atomic():
            if user_model.objects.filter(username__iexact=email).exists() or user_model.objects.filter(email__iexact=email).exists():
                return JsonResponse(
                    build_error(
                        errors=[{"code": "ACCOUNT_EXISTS", "field": "email", "message": "An account with this email already exists."}],
                        tenant_id=tenant.tenant_id,
                        role=None,
                    ),
                    status=409,
                )

            user = user_model.objects.create_user(
                username=email,
                email=email,
                password=payload.password,
                first_name=first_name,
                last_name=last_name,
                is_active=False,
            )
            parent_group, _ = Group.objects.get_or_create(name="Parent")
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT set_config('app.current_tenant_id', %s, FALSE)",
                    [str(tenant.tenant_id)],
                )
            PortalRoleMembership.objects.create(
                user=user,
                tenant=tenant,
                group=parent_group,
                role="Parent",
                is_active=True,
            )
    except IntegrityError:
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCOUNT_EXISTS", "field": "email", "message": "An account with this email already exists."}],
                tenant_id=tenant.tenant_id,
                role=None,
            ),
            status=409,
        )

    return JsonResponse(
        build_response(
            data={
                "username": user.username,
                "email": user.email,
                "name": user.get_full_name() or user.username,
                "role": "parent",
                "status": "pending_activation",
            },
            tenant_id=tenant.tenant_id,
            role="parent",
        ),
        status=201,
    )
