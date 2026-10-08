import base64
import json
import uuid
from uuid import UUID
from ninja.security import HttpBearer
from jose import jwt, JWTError
from django.conf import settings
from django.db import connection
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


class JWTAuthBearer(HttpBearer):
    def authenticate(self, request, token):
        used_insecure_dev_token = False
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
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
        request.vendor_id = payload.get("vendor_id")

        raw_role = payload.get("role", "Parent")
        request.user_role = ROLE_MAP.get(str(raw_role).lower(), str(raw_role))
        if request.user_role not in ROLE_MAP.values():
            return None

        # A signed token must refer to an existing tenant. The opt-in demo
        # mode can create its isolated local tenant for the session emulator.
        if used_insecure_dev_token:
            Tenant.objects.get_or_create(
                tenant_id=tenant_uuid,
                defaults={
                    'name': 'The Purple Cubby Demo School',
                    'subdomain': f'tenant-{str(tenant_uuid)[:8]}',
                    'type': 'K-12',
                    'subscription_tier': 'Basic',
                    'region': 'Canada',
                },
            )
        elif not Tenant.objects.filter(tenant_id=tenant_uuid).exists():
            return None

        # Immediately inject tenant context into PostgreSQL connection for RLS
        if request.tenant_id:
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('app.current_tenant_id', %s, FALSE)", [str(request.tenant_id)])

        return payload
