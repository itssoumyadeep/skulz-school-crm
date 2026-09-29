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
        payload = None
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        except JWTError:
            # Fallback for dev/mock tokens: header.payload.sig
            try:
                parts = token.split('.')
                if len(parts) >= 2:
                    padded = parts[1] + '=' * ((4 - len(parts[1]) % 4) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            except Exception:
                return None

        if not payload or not isinstance(payload, dict):
            return None

        raw_user_id = payload.get("sub") or payload.get("user_id")
        try:
            request.user_id = str(UUID(str(raw_user_id)))
        except (ValueError, TypeError):
            request.user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_user_id or "default-user")))

        raw_tenant_id = payload.get("tenant_id")
        try:
            tenant_uuid = UUID(str(raw_tenant_id))
        except (ValueError, TypeError):
            tenant_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_tenant_id or "demo-tenant"))

        request.tenant_id = tenant_uuid
        request.user_email = payload.get("email")
        request.user_name = payload.get("user_name")
        raw_linked = payload.get("linked_student_ids") or []
        request.linked_student_ids = [str(sid) for sid in raw_linked]
        request.vendor_id = payload.get("vendor_id")

        # Ensure tenant exists in DB for foreign key / RLS constraints
        Tenant.objects.get_or_create(
            tenant_id=tenant_uuid,
            defaults={
                'name': 'The Purple Cubby Demo School',
                'subdomain': f'tenant-{str(tenant_uuid)[:8]}',
                'type': 'K-12',
                'subscription_tier': 'Basic',
                'region': 'Canada',
            }
        )

        raw_role = payload.get("role", "Parent")
        request.user_role = ROLE_MAP.get(str(raw_role).lower(), str(raw_role))

        # Immediately inject tenant context into PostgreSQL connection for RLS
        if request.tenant_id:
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('app.current_tenant_id', %s, TRUE)", [str(request.tenant_id)])

        return payload

