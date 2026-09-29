import uuid
import pytest
from datetime import date
from django.test import Client
from django.conf import settings
from jose import jwt

from core.models import Tenant, Student, Parent, EmergencyContact


@pytest.fixture
def test_students(tenant_a):
    s1 = Student.objects.create(
        tenant=tenant_a,
        student_number="OAK-2026-0001",
        name="Alice Walker",
        dob=date(2018, 1, 1),
        grade="Grade 3",
        status="Active"
    )
    s2 = Student.objects.create(
        tenant=tenant_a,
        student_number="OAK-2026-0002",
        name="Bob Martin",
        dob=date(2017, 5, 12),
        grade="Grade 4",
        status="Active"
    )
    Parent.objects.create(
        tenant=tenant_a,
        student=s1,
        name="Mary Walker",
        phone="555-0101",
        email="parent.alice@example.com"
    )
    return s1, s2


@pytest.mark.django_db
class TestStudentAccessControl:
    def setup_method(self):
        self.client = Client()

    def test_admin_sees_all_students_with_full_permissions(self, tenant_a, test_students, admin_token_tenant_a):
        response = self.client.get(
            "/api/v1/students",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert response.status_code == 200
        res = response.json()
        assert len(res["data"]) >= 2
        assert res["meta"]["permissions"]["can_edit"] is True
        assert res["meta"]["permissions"]["can_create"] is True

    def test_grade_filtering(self, tenant_a, test_students, admin_token_tenant_a):
        response = self.client.get(
            "/api/v1/students?grade=Grade 3",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert response.status_code == 200
        res = response.json()
        assert all(s["grade"] == "Grade 3" for s in res["data"])

    def test_board_gets_aggregate_kpis(self, tenant_a, test_students):
        token = jwt.encode(
            {"sub": str(uuid.uuid4()), "tenant_id": str(tenant_a.tenant_id), "role": "Board"},
            settings.JWT_SECRET_KEY,
            algorithm="HS256"
        )
        # /students returns 403 for board (not in list of allowed list roles)
        list_res = self.client.get("/api/v1/students", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert list_res.status_code == 403

        # /students/aggregate returns aggregate KPIs for board
        agg_res = self.client.get("/api/v1/students/aggregate", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert agg_res.status_code == 200
        data = agg_res.json()["data"]
        assert "total_enrolled" in data
        assert "by_grade" in data
        assert "retention_rate_pct" in data


    def test_single_student_fetch(self, tenant_a, test_students, admin_token_tenant_a):
        s1, _ = test_students
        response = self.client.get(
            f"/api/v1/students/{s1.student_id}",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["student_number"] == "OAK-2026-0001"
        assert data["name"] == "Alice Walker"

    def test_vendor_gets_403(self, tenant_a, test_students):
        token = jwt.encode(
            {"sub": str(uuid.uuid4()), "tenant_id": str(tenant_a.tenant_id), "role": "Vendor"},
            settings.JWT_SECRET_KEY,
            algorithm="HS256"
        )
        response = self.client.get("/api/v1/students", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert response.status_code == 403
