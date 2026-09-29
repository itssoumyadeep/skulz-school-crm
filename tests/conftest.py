import uuid
import pytest
from datetime import date
from django.conf import settings
from jose import jwt
from core.models import Tenant, Student, Application, Parent, EmergencyContact, Document

@pytest.fixture
def tenant_a(db):
    return Tenant.objects.create(
        tenant_id=uuid.uuid4(),
        name="Oakridge International",
        subdomain="oakridge",
        type="Private",
        subscription_tier="Enterprise",
        region="North America",
        config={"student_id_prefix": "OAK"}
    )

@pytest.fixture
def tenant_b(db):
    return Tenant.objects.create(
        tenant_id=uuid.uuid4(),
        name="Maple Leaf Academy",
        subdomain="maple",
        type="Private",
        subscription_tier="Standard",
        region="North America",
        config={"student_id_prefix": "MLA"}
    )

@pytest.fixture
def admin_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Admin"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

@pytest.fixture
def parent_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Parent"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

@pytest.fixture
def teacher_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Teacher"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

@pytest.fixture
def owner_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Owner"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

@pytest.fixture
def admin_token_tenant_b(tenant_b):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_b.tenant_id),
        "role": "Admin"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")
