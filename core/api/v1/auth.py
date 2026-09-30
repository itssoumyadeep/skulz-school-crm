import hashlib
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
from core.business_objects.trial import TrialSignupBO, TrialSignupError
from core.schemas.auth import LoginSchema, SignupSchema, TrialSignupSchema
from core.schemas.base import build_error, build_response

router = Router(tags=["Authentication"])

TRIAL_ROLE_CLAIMS = {
    "Admin": "admin",
    "Teacher": "teacher",
    "Owner": "owner",
}

TRIAL_ROLE_PORTALS = {
    "Admin": "/admin",
    "Teacher": "/teacher",
    "Owner": "/governance/owner",
}

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

GROUP_ROLE_MAP = {
    "Admin": "Admin",
    "Principal": "Principal",
    "Vice Principal": "Vice_Principal",
    "Vice_Principal": "Vice_Principal",
    "Teacher": "Teacher",
    "Caregiver": "CareGiver",
    "CareGiver": "CareGiver",
    "Parent": "Parent",
    "Vendor": "Vendor",
    "Owner": "Owner",
    "Board": "Board",
    "Trustee": "Trustee",
    "Staff": "Staff",
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
    username = payload.username.strip()
    username_prefix, separator, tenant_code = username.rpartition("_")
    if not separator or not username_prefix or not tenant_code:
        return _error(
            request,
            400,
            "SCHOOL_CODE_REQUIRED",
            "Enter your username followed by an underscore and your school code.",
        )

    tenant = Tenant.objects.filter(subdomain__iexact=tenant_code).first()
    if tenant is None:
        return _error(request, 401, "AUTH_INVALID", "Invalid username or password.")

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('app.current_tenant_id', %s, FALSE)",
            [str(tenant.tenant_id)],
        )

    user_model = get_user_model()
    user = user_model.objects.filter(username__iexact=username).first()
    if user is None:
        return _error(request, 401, "AUTH_INVALID", "Invalid username or password.")

    user = authenticate(
        request,
        username=user.username,
        password=payload.password,
    )
    if user is None or not user.is_active:
        return _error(request, 401, "AUTH_INVALID", "Invalid username or password.")

    membership = PortalRoleMembership.objects.select_related("group").filter(
        user=user,
        tenant=tenant,
    ).first()
    if membership is not None and not membership.is_active:
        return _error(request, 403, "ROLE_MEMBERSHIP_REQUIRED", "This user has no active school role.")

    role_groups = list(
        user.groups.filter(name__in=GROUP_ROLE_MAP.keys()).order_by("name")
    )
    if len(role_groups) == 1:
        group = role_groups[0]
        role_name = GROUP_ROLE_MAP[group.name]
        if membership is None:
            membership = PortalRoleMembership.objects.create(
                user=user,
                tenant=tenant,
                group=group,
                role=role_name,
                is_active=True,
            )
        elif membership.role != role_name or membership.group_id != group.pk:
            membership.group = group
            membership.role = role_name
            membership.save(update_fields=["group", "role"])

    if membership is None or membership.role not in ROLE_CLAIMS:
        return _error(request, 403, "ROLE_MEMBERSHIP_REQUIRED", "This user has no active school role.")

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
                "tenant_code": tenant.subdomain,
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


@router.post("/auth/trial-signup")
def trial_signup(request, payload: TrialSignupSchema):
    try:
        tenant, user, membership = TrialSignupBO.create_trial(
            daycare_name=payload.daycare_name,
            email=str(payload.email),
            role=payload.role,
            password=payload.password,
        )
    except TrialSignupError as exc:
        return _error(request, exc.status, exc.code, exc.message)

    role_claim = TRIAL_ROLE_CLAIMS[membership.role]
    return JsonResponse(
        build_response(
            data={
                "status": "trial_started",
                "tenant": {
                    "id": str(tenant.tenant_id),
                    "name": tenant.name,
                    "code": tenant.subdomain,
                },
                "user": {
                    "id": str(user.pk),
                    "username": user.username,
                    "email": user.email,
                    "role": membership.role,
                },
                "portal_path": TRIAL_ROLE_PORTALS[membership.role],
            },
            tenant_id=tenant.tenant_id,
            role=role_claim,
        ),
        status=201,
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
    username_suffix = f"_{tenant.subdomain}"
    username_prefix = email
    if len(username_prefix) + len(username_suffix) > 150:
        digest = hashlib.sha256(email.encode()).hexdigest()[:8]
        max_prefix_length = 150 - len(username_suffix) - len(digest) - 1
        username_prefix = f"{email[:max_prefix_length]}_{digest}"
    username = f"{username_prefix}{username_suffix}"
    first_name, _, last_name = payload.full_name.partition(" ")
    candidate = user_model(
        username=username,
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
            if user_model.objects.filter(username__iexact=username).exists() or user_model.objects.filter(email__iexact=email).exists():
                return JsonResponse(
                    build_error(
                        errors=[{"code": "ACCOUNT_EXISTS", "field": "email", "message": "An account with this email already exists."}],
                        tenant_id=tenant.tenant_id,
                        role=None,
                    ),
                    status=409,
                )

            user = user_model.objects.create_user(
                username=username,
                email=email,
                password=payload.password,
                first_name=first_name,
                last_name=last_name,
                is_active=False,
            )
            parent_group, _ = Group.objects.get_or_create(name="Parent")
            user.groups.add(parent_group)
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
