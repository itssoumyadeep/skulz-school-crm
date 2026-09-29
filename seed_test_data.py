"""
Sprint 1 Test Seed Script
--------------------------
Creates a test Tenant in the DB and prints a valid JWT token for that tenant.
Run with: .venv/bin/python seed_test_data.py

Use the printed token in Swagger UI (http://localhost:8000/api/docs)
or copy the curl commands below to test directly.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import uuid
from jose import jwt
from core.models import Tenant
from django.conf import settings

# 1. Create (or get) a test Tenant
tenant, created = Tenant.objects.get_or_create(
    subdomain='demo-school',
    defaults={
        'name': 'The Purple Cubby Demo School',
        'type': 'K-12',
        'subscription_tier': 'Basic',
        'region': 'Canada',
    }
)

if created:
    print(f"✅ Created Tenant: {tenant.name}")
else:
    print(f"ℹ️  Tenant already exists: {tenant.name}")

print(f"   tenant_id = {tenant.tenant_id}")

# 2. Generate a JWT for Admin role
admin_user_id = uuid.uuid4()
token = jwt.encode({
    'sub': str(admin_user_id),
    'tenant_id': str(tenant.tenant_id),
    'role': 'Admin'
}, settings.JWT_SECRET_KEY, algorithm='HS256')

print()
print("=" * 70)
print("JWT TOKEN (Admin role)")
print("=" * 70)
print(token)
print()

# 3. Print ready-to-use curl commands
print("=" * 70)
print("CURL COMMANDS — copy & paste to test")
print("=" * 70)

print("""
# 1. CREATE ENROLLMENT (POST)
curl -X POST http://localhost:8000/api/v1/enrollments \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "student_name": "Alice Smith",
    "student_dob": "2015-06-15",
    "grade": "Grade 1",
    "parent_name": "Bob Smith",
    "parent_email": "bob@example.com",
    "parent_phone": "+1-416-555-0101"
  }}'
""".format(token=token))

APPLICATION_ID = "<application_id from step 1>"

print(f"""
# 2. GET ENROLLMENT STATUS (GET) — replace the application_id with UUID from step 1
curl -X GET "http://localhost:8000/api/v1/enrollments/{APPLICATION_ID}/status" \\
  -H "Authorization: Bearer {token}"
""")

print(f"""
# 3. UPDATE DECISION (PUT) — replace the application_id with UUID from step 1
curl -X PUT "http://localhost:8000/api/v1/enrollments/{APPLICATION_ID}/decision" \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{{"decision": "Offered"}}'
""")
