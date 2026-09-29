import uuid
import pytest
from datetime import date
from decimal import Decimal
from django.test import Client
from django.conf import settings
from jose import jwt

from core.models import (
    Tenant, Student, Curriculum, AcademicCalendar,
    LessonPlan, Assignment, Exam, MarksRecord, ReportCard
)

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
def principal_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Principal"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


@pytest.mark.django_db
class TestAcademicsAPI:
    def setup_method(self):
        self.client = Client()

    def test_get_current_calendar(self, tenant_a, admin_token_tenant_a):
        AcademicCalendar.objects.create(
            tenant=tenant_a,
            academic_year="2025-2026",
            terms=[{"name": "Term 1", "start_date": "2025-09-01", "end_date": "2025-12-15"}],
            holidays=["2025-10-14"]
        )

        response = self.client.get(
            "/api/v1/calendar/current",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["bo"] == "AcademicCalendar"
        assert data["academic_year"] == "2025-2026"

    def test_create_lesson_plan_passes_and_returns_bo(self, tenant_a, teacher_token_tenant_a):
        curr = Curriculum.objects.create(
            tenant=tenant_a,
            grade="Grade 4",
            subjects=[{"code": "MATH", "name": "Math", "topics": ["Multiplication", "Division"]}],
            learning_outcomes=["Master 12x12 tables"]
        )
        class_id = str(uuid.uuid4())

        payload = {
            "curriculum_id": str(curr.curriculum_id),
            "class_id": class_id,
            "week": 2,
            "topic": "Multiplication",
            "learning_outcomes": ["Master 12x12 tables"]
        }

        response = self.client.post(
            "/api/v1/lesson-plans",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )
        assert response.status_code == 201
        res_json = response.json()
        assert res_json["data"]["bo"] == "ClassroomPlan"
        assert res_json["data"]["lesson_plan"]["topic"] == "Multiplication"

    def test_create_assignment_blocked_on_holiday(self, tenant_a, teacher_token_tenant_a):
        AcademicCalendar.objects.create(
            tenant=tenant_a,
            academic_year="2025-2026",
            holidays=["2025-12-25"]
        )

        payload = {
            "class_id": str(uuid.uuid4()),
            "subject": "Math",
            "title": "Winter Break Homework",
            "due_date": "2025-12-25",  # Holiday!
            "max_marks": 50.0
        }

        response = self.client.post(
            "/api/v1/assignments",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )
        assert response.status_code == 422
        res_json = response.json()
        assert res_json["data"] is None
        assert any(e["rule"] == "BR-04-02" for e in res_json["errors"])

    def test_record_marks_and_moderation_flow(self, tenant_a, teacher_token_tenant_a, admin_token_tenant_a):
        cal = AcademicCalendar.objects.create(tenant=tenant_a, academic_year="2025-2026")
        student = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0030", name="Finn Hudson",
            dob=date(2018, 6, 6), grade="Grade 4", status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a, calendar=cal, class_id=uuid.uuid4(),
            name="Geography Midterm", date=date(2025, 11, 10)
        )

        # 1. Teacher records marks
        payload = {
            "student_id": str(student.student_id),
            "subject": "Geography",
            "marks": 94.0,
            "max_marks": 100.0
        }
        res_marks = self.client.post(
            f"/api/v1/exams/{exam.exam_id}/marks",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )
        assert res_marks.status_code == 200
        assert res_marks.json()["data"]["grade"] == "A+"

        # 2. Moderate the mark record
        mr = MarksRecord.objects.get(student=student, exam=exam)
        mr.moderated_by = uuid.uuid4()
        mr.save()

        # 3. Generate Report Card & Publish
        rc = ReportCard.objects.create(
            tenant=tenant_a, student=student, calendar=cal,
            term="Term 1", year=2025, overall_grade="A+", gpa=Decimal("3.80"),
            published_date=date(2025, 11, 1), is_published=False,
            attendance_percentage=Decimal("95.00")
        )

        res_pub = self.client.post(
            f"/api/v1/academic-records/{rc.report_id}/publish",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert res_pub.status_code == 200
        assert res_pub.json()["data"]["report_card"]["is_published"] is True
