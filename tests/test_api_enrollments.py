import uuid
import pytest
from datetime import date
from django.test import Client
from core.models import Student, Application, Document, Parent, EmergencyContact

@pytest.mark.django_db
class TestEnrollmentsAPI:
    def setup_method(self):
        self.client = Client()

    def test_create_enrollment_success(self, tenant_a, admin_token_tenant_a):
        payload = {
            "first_name": "Liam",
            "last_name": "Evans",
            "dob": "2019-10-15",
            "grade": "Grade 1",
            "parent_name": "David Evans",
            "parent_relationship": "Father",
            "parent_email": "david@example.com",
            "parent_phone": "+1-555-4433",
            "emergency_contact_name": "Helen Evans",
            "emergency_contact_phone": "+1-555-4422",
            "emergency_contact_relationship": "Mother",
            "medical_consent": True
        }

        response = self.client.post(
            "/api/v1/enrollments",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 201
        res_json = response.json()
        assert res_json["errors"] is None
        assert res_json["meta"]["tenant_id"] == str(tenant_a.tenant_id)
        assert res_json["data"]["bo"] == "EnrollmentCase"
        assert res_json["data"]["student"]["student_number"].startswith("OAK-")
        assert res_json["data"]["student"]["name"] == "Liam Evans"

    def test_decision_rbac_forbidden_for_parent_role(self, tenant_a, parent_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0099",
            name="Test Child",
            dob=date(2019, 1, 1),
            grade="Grade 1"
        )
        app = Application.objects.create(tenant=tenant_a, student=student, status="Pending")

        response = self.client.put(
            f"/api/v1/enrollments/{app.application_id}/decision",
            data={"decision": "Offered"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}"
        )

        assert response.status_code == 403
        res_json = response.json()
        assert res_json["data"] is None
        assert any(e["code"] == "RBAC_DENIED" for e in res_json["errors"])

    def test_decision_business_rule_violation_returns_422(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0098",
            name="Test Child 2",
            dob=date(2019, 1, 1),
            grade="Grade 1"
        )
        app = Application.objects.create(tenant=tenant_a, student=student, status="Pending")
        # No documents verified, trying to advance to Offered

        response = self.client.put(
            f"/api/v1/enrollments/{app.application_id}/decision",
            data={"decision": "Offered"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 422
        res_json = response.json()
        assert res_json["data"] is None
        assert any(e["code"] == "RULE_VIOLATION" and e["rule"] == "BR-01-01" for e in res_json["errors"])

    def test_pipeline_tenant_isolation(self, tenant_a, tenant_b, admin_token_tenant_a, admin_token_tenant_b):
        student_a = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0001", name="Student A",
            dob=date(2019, 1, 1), grade="Grade 1"
        )
        Application.objects.create(tenant=tenant_a, student=student_a, status="Pending")

        student_b = Student.objects.create(
            tenant=tenant_b, student_number="MLA-2026-0001", name="Student B",
            dob=date(2019, 1, 1), grade="Grade 1"
        )
        Application.objects.create(tenant=tenant_b, student=student_b, status="Pending")

        # Query pipeline with Tenant A token
        res_a = self.client.get(
            "/api/v1/enrollments/pipeline",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert res_a.status_code == 200
        data_a = res_a.json()["data"]
        assert len(data_a) == 1
        assert data_a[0]["student"]["name"] == "Student A"

        # Query pipeline with Tenant B token
        res_b = self.client.get(
            "/api/v1/enrollments/pipeline",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_b}"
        )
        assert res_b.status_code == 200
        data_b = res_b.json()["data"]
        assert len(data_b) == 1
        assert data_b[0]["student"]["name"] == "Student B"

    def test_get_student_profile_bo(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0100",
            name="Grace Hopper",
            dob=date(2019, 12, 9),
            grade="Grade 1",
            status="Active"
        )
        Parent.objects.create(
            tenant=tenant_a, student=student, name="Mary Hopper",
            relationship="Mother", phone="+1-555-1122", email="mary@example.com"
        )
        EmergencyContact.objects.create(
            tenant=tenant_a, student=student, name="Walter Hopper",
            phone="+1-555-3344", relationship="Father", medical_consent=True
        )

        response = self.client.get(
            f"/api/v1/students/{student.student_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 200
        res_json = response.json()
        assert res_json["data"]["bo"] == "StudentProfile"
        assert res_json["data"]["name"] == "Grace Hopper"
        assert res_json["data"]["student_number"] == "OAK-2026-0100"
        assert res_json["data"]["is_profile_complete"] is True

    def test_admin_can_update_student_record(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0200",
            name="Original Name",
            dob=date(2018, 2, 1),
            grade="Grade 2",
            status="Inquiry"
        )

        response = self.client.patch(
            f"/api/v1/students/{student.student_id}",
            data={
                "name": "Updated Name",
                "grade": "Grade 3",
                "status": "Active",
                "class_id": str(uuid.uuid4())
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 200
        student.refresh_from_db()
        assert student.name == "Updated Name"
        assert student.grade == "Grade 3"
        assert student.status == "Active"

    def test_teacher_can_update_student_record(self, tenant_a, teacher_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0205",
            name="Teacher Edit Name",
            dob=date(2018, 5, 1),
            grade="Grade 4",
            section="A",
            status="Active"
        )

        response = self.client.patch(
            f"/api/v1/students/{student.student_id}",
            data={
                "name": "Teacher Updated Name",
                "grade": "Grade 5",
                "section": "B",
                "status": "Active"
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )

        assert response.status_code == 200
        student.refresh_from_db()
        assert student.name == "Teacher Updated Name"
        assert student.grade == "Grade 5"
        assert student.section == "B"

    def test_admin_can_upload_document_for_application(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0201",
            name="Doc Student",
            dob=date(2018, 4, 4),
            grade="Grade 1",
            status="Active"
        )
        application = Application.objects.create(tenant=tenant_a, student=student, status="Accepted")

        response = self.client.post(
            f"/api/v1/enrollments/{application.application_id}/documents",
            data={
                "doc_type": "immunization",
                "file_path": "/tmp/immunization.pdf"
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 201
        assert Document.objects.filter(application=application, doc_type="immunization").exists()

    def test_parent_data_isolation_between_different_parents(self, tenant_a):
        from jose import jwt
        from django.conf import settings

        # Parent 1: Sarah Collins
        parent_1_id = str(uuid.uuid4())
        parent_1_token = jwt.encode({
            "sub": parent_1_id,
            "user_id": parent_1_id,
            "tenant_id": str(tenant_a.tenant_id),
            "role": "Parent",
            "email": "sarah.collins@example.com",
            "linked_student_ids": []
        }, settings.JWT_SECRET_KEY, algorithm="HS256")

        # Parent 2: David Miller
        parent_2_id = str(uuid.uuid4())
        parent_2_token = jwt.encode({
            "sub": parent_2_id,
            "user_id": parent_2_id,
            "tenant_id": str(tenant_a.tenant_id),
            "role": "Parent",
            "email": "david.miller@example.com",
            "linked_student_ids": []
        }, settings.JWT_SECRET_KEY, algorithm="HS256")

        # 1. Parent 1 creates an application for Ava Collins
        res1 = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Ava",
                "last_name": "Collins",
                "dob": "2019-05-12",
                "grade": "Grade 2",
                "parent_name": "Sarah Collins",
                "parent_email": "sarah.collins@example.com",
                "parent_phone": "+1-555-0199",
                "medical_consent": True
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert res1.status_code == 201
        app1_data = res1.json()["data"]
        app1_id = app1_data["application_id"]
        student1_id = app1_data["student"]["student_id"]

        # 2. Parent 2 creates an application for Lucas Miller
        res2 = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Lucas",
                "last_name": "Miller",
                "dob": "2019-08-20",
                "grade": "Grade 1",
                "parent_name": "David Miller",
                "parent_email": "david.miller@example.com",
                "parent_phone": "+1-555-0244",
                "medical_consent": True
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert res2.status_code == 201
        app2_data = res2.json()["data"]
        app2_id = app2_data["application_id"]
        student2_id = app2_data["student"]["student_id"]

        # 3. Parent 1 queries /my-applications -> MUST only see Ava Collins
        p1_apps = self.client.get(
            "/api/v1/enrollments/my-applications",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert p1_apps.status_code == 200
        p1_list = p1_apps.json()["data"]
        assert len(p1_list) == 1
        assert p1_list[0]["application_id"] == app1_id
        assert p1_list[0]["student"]["name"] == "Ava Collins"

        # 4. Parent 2 queries /my-applications -> MUST only see Lucas Miller
        p2_apps = self.client.get(
            "/api/v1/enrollments/my-applications",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_apps.status_code == 200
        p2_list = p2_apps.json()["data"]
        assert len(p2_list) == 1
        assert p2_list[0]["application_id"] == app2_id
        assert p2_list[0]["student"]["name"] == "Lucas Miller"

        # 5. Parent 2 attempts to query Parent 1's student profile -> MUST be 403 Forbidden!
        p2_hack_profile = self.client.get(
            f"/api/v1/students/{student1_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_hack_profile.status_code == 403
        assert p2_hack_profile.json()["errors"][0]["code"] == "ACCESS_DENIED"

        # 6. Parent 2 attempts to query Parent 1's application status -> MUST be 403 Forbidden!
        p2_hack_app = self.client.get(
            f"/api/v1/enrollments/{app1_id}/status",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_hack_app.status_code == 403
        assert p2_hack_app.json()["errors"][0]["code"] == "ACCESS_DENIED"

        # 7. Parent 1 queries her own student profile -> Allowed (200 OK)
        p1_profile = self.client.get(
            f"/api/v1/students/{student1_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert p1_profile.status_code == 200
        assert p1_profile.json()["data"]["name"] == "Ava Collins"

