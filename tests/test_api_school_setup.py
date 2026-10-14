import pytest
from django.test import Client

from core.models import (
    Curriculum,
    EmergencyContact,
    LeaveRequest,
    LessonPlan,
    Parent,
    Student,
)


@pytest.mark.django_db
class TestSchoolSetupImportAPI:
    def setup_method(self):
        self.client = Client()

    def test_admin_setup_config_is_scoped_to_session_tenant(
        self, tenant_a, admin_token_tenant_a, parent_token_tenant_a
    ):
        response = self.client.get(
            "/api/v1/school-setup/config",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["school"]["tenant_id"] == str(tenant_a.tenant_id)
        assert data["school"]["school_code"] == tenant_a.subdomain
        assert {item["key"] for item in data["datasets"]} >= {
            "students",
            "teachers",
            "parents",
            "attendance",
            "messages",
        }

        forbidden = self.client.get(
            "/api/v1/school-setup/config",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert forbidden.status_code == 403

    def test_import_students_creates_tenant_scoped_inactive_records(
        self, tenant_a, tenant_b, admin_token_tenant_a
    ):
        response = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "students",
                "records": [
                    {
                        "first_name": "Ava",
                        "last_name": "Collins",
                        "dob": "2018-06-01",
                        "grade": "Pre-K",
                        "parent_name": "Sarah Collins",
                        "parent_email": "sarah@example.com",
                        "parent_phone": "+1-555-0100",
                    }
                ],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 201, response.json()
        data = response.json()["data"]
        assert data["dataset"] == "students"
        assert data["imported_count"] == 1
        assert data["records"][0]["student_number"].startswith("OAK-")

        student = Student.objects.get(student_id=data["records"][0]["student_id"])
        assert student.tenant_id == tenant_a.tenant_id
        assert student.status == "Inactive"
        assert not student.applications.filter(is_deleted=False).exists()
        parent = Parent.objects.get(tenant=tenant_a, student=student)
        assert parent.name == "Sarah Collins"
        assert parent.email == "sarah@example.com"
        assert not EmergencyContact.objects.filter(tenant=tenant_a, student=student).exists()
        assert not Student.objects.filter(tenant=tenant_b, name="Ava Collins").exists()

    def test_failed_dataset_rolls_back_all_its_rows(
        self, tenant_a, admin_token_tenant_a
    ):
        response = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "students",
                "records": [
                    {
                        "first_name": "Valid",
                        "last_name": "Student",
                        "grade": "Pre-K",
                        "parent_name": "Jordan Student",
                    },
                    {"first_name": "Missing", "last_name": "Grade", "grade": ""},
                ],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 422
        assert "students row 2" in response.json()["errors"][0]["message"]
        assert not Student.objects.filter(tenant=tenant_a, name="Valid Student").exists()

    def test_leave_import_resolves_student_number_in_current_tenant(
        self, tenant_a, admin_token_tenant_a
    ):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0099",
            name="Jordan Rivera",
            grade="Grade 2",
        )

        response = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "leave-plans",
                "records": [{
                    "student_number": student.student_number,
                    "requester_type": "Student",
                    "leave_type": "Sick",
                    "start_date": "2026-10-12",
                    "end_date": "2026-10-12",
                    "days": "1",
                    "reason": "Medical appointment",
                }],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 201, response.json()
        leave = LeaveRequest.objects.get(leave_id=response.json()["data"]["records"][0]["leave_id"])
        assert leave.tenant_id == tenant_a.tenant_id
        assert leave.requester_id == student.student_id

    def test_leave_import_rejects_requester_from_another_tenant(
        self, tenant_a, tenant_b, admin_token_tenant_a
    ):
        foreign_student = Student.objects.create(
            tenant=tenant_b,
            student_number="PINE-2026-0001",
            name="Foreign Student",
            grade="Grade 2",
        )

        response = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "leave-plans",
                "records": [{
                    "requester_id": str(foreign_student.student_id),
                    "requester_type": "Student",
                    "leave_type": "Sick",
                    "start_date": "2026-10-12",
                    "end_date": "2026-10-12",
                    "reason": "Medical appointment",
                }],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 422
        assert not LeaveRequest.objects.filter(tenant=tenant_a).exists()

    def test_lesson_plan_import_resolves_curriculum_by_grade_and_version(
        self, tenant_a, admin_token_tenant_a
    ):
        Curriculum.objects.create(
            tenant=tenant_a,
            grade="Grade 3",
            version="1.0",
            subjects=[],
            learning_outcomes=["Counting"],
        )

        response = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "lesson-plans",
                "records": [{
                    "curriculum_grade": "Grade 3",
                    "curriculum_version": "1.0",
                    "class_id": "20000000-0000-0000-0000-000000000001",
                    "week": "1",
                    "topic": "Counting",
                    "learning_outcomes": '["Counting"]',
                }],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 201, response.json()
        lesson = LessonPlan.objects.get(plan_id=response.json()["data"]["records"][0]["plan_id"])
        assert lesson.tenant_id == tenant_a.tenant_id
