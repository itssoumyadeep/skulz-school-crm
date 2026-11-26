"""JWT bearer token authentication handler, algorithm hardening, and trial-expiry enforcement."""

import base64
import json
import uuid
from uuid import UUID

from django.conf import settings
from django.db import connection
from jose import JWTError, jwt
from ninja.security import HttpBearer

from core.business_objects.trial import TrialExpiredError, TrialSignupBO
from core.models import Tenant

ROLE_MAP = {
    'admin': 'Admin',
    'principal': 'Principal',
    'vice_principal': 'Vice_Principal',
    'teacher': 'Teacher',
    'caregiver': 'CareGiver',
    'parent': 'Parent',
    'vendor': 'Vendor',
    'owner': 'Owner',
    'board': 'Board',
    'trustee': 'Trustee',
    'staff': 'Staff',
}

TRIAL_WRITE_EXEMPT_PREFIXES = (
    '/api/v1/school-setup/trial',
    '/api/v1/auth/',
    '/api/v1/billing/',
    '/api/v1/parent/billing/',
    '/api/v1/stripe/',
    '/api/v1/telemetry/',
)


class JWTAuthBearer(HttpBearer):
    def authenticate(self, request, token):
        used_insecure_dev_token = False
        require_exp = bool(getattr(settings, 'REQUIRE_JWT_EXP', False))
        try:
            header = jwt.get_unverified_header(token)
            alg = str(header.get('alg') or '').strip()
            if alg != 'HS256':
                raise JWTError('Disallowed JWT algorithm.')
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=['HS256'],
                options={'require_exp': require_exp},
            )
        except JWTError:
            if not settings.ALLOW_INSECURE_DEV_TOKENS:
                return None
            # Explicitly opt-in local-demo compatibility for the session emulator.
            try:
                parts = token.split('.')
                if len(parts) >= 2:
                    padded = parts[1] + '=' * ((4 - len(parts[1]) % 4) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
                    used_insecure_dev_token = True
                else:
                    return None
            except Exception:
                return None

        if not payload or not isinstance(payload, dict):
            return None

        raw_user_id = payload.get("sub") or payload.get("user_id")
        try:
            request.user_id = str(UUID(str(raw_user_id)))
        except (ValueError, TypeError):
            # Signed identity providers may use a non-UUID subject. The CRM
            # stores audit actors as UUIDs, so derive a stable internal value.
            request.user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, str(raw_user_id)))

        raw_tenant_id = payload.get("tenant_id")
        try:
            tenant_uuid = UUID(str(raw_tenant_id))
        except (ValueError, TypeError):
            return None

        request.tenant_id = tenant_uuid
        request.user_email = payload.get("email")
        request.user_name = payload.get("user_name")
        raw_linked = payload.get("linked_student_ids") or []
        request.linked_student_ids = [str(sid) for sid in raw_linked]
        raw_classes = payload.get("assigned_class_ids") or []
        request.assigned_class_ids = [str(cid) for cid in raw_classes]
        raw_grades = payload.get("assigned_grades") or payload.get("assigned_care_groups") or []
        request.assigned_grades = [str(g) for g in raw_grades]
        request.vendor_id = payload.get("vendor_id")

        raw_role = payload.get("role", "Parent")
        request.user_role = ROLE_MAP.get(str(raw_role).lower(), str(raw_role))
        if request.user_role not in ROLE_MAP.values():
            return None

        # A signed token must refer to an existing tenant. The opt-in demo
        # mode can create its isolated local tenant for the session emulator.
        if used_insecure_dev_token:
            tenant, _ = Tenant.objects.get_or_create(
                tenant_id=tenant_uuid,
                defaults={
                    'name': 'The Purple Cubby Demo School',
                    'subdomain': f'tenant-{str(tenant_uuid)[:8]}',
                    'type': 'K-12',
                    'subscription_tier': 'Basic',
                    'region': 'Canada',
                },
            )
        else:
            tenant = Tenant.objects.filter(tenant_id=tenant_uuid).first()
            if tenant is None:
                return None

        # Immediately inject tenant context into PostgreSQL connection for RLS
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('app.current_tenant_id', %s, FALSE)", [str(request.tenant_id)])

        trial_info = TrialSignupBO.evaluate_trial_status(tenant)
        request.trial_status = trial_info
        req_path = getattr(request, 'path', '') or ''
        req_method = getattr(request, 'method', 'GET') or 'GET'
        if (
            trial_info['is_expired']
            and req_method in ('POST', 'PUT', 'PATCH', 'DELETE')
            and not req_path.startswith(TRIAL_WRITE_EXEMPT_PREFIXES)
        ):
            raise TrialExpiredError(trial_ends_at=trial_info.get('trial_ends_at'))

        return payload
