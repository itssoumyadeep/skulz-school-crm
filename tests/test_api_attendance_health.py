import uuid
import pytest
from datetime import date
from decimal import Decimal
from django.test import Client
from django.conf import settings
from jose import jwt

from core.models import (
    Tenant, Student, StudentAttendance, StaffAttendance,
    LeaveRequest, StudentHealth, HealthObservation, Incident, SafetyDrill
)

@pytest.fixture
def caregiver_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "CareGiver"
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

@pytest.fixture
def staff_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "tenant_id": str(tenant_a.tenant_id),
        "role": "Staff"
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


@pytest.mark.django_db
class TestAttendanceAndHealthAPI:
    def setup_method(self):
        self.client = Client()

    def test_mark_attendance_api(self, tenant_a, caregiver_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0060",
            name="Zoe Saldana",
            dob=date(2018, 8, 8),
            grade="Grade 3",
            status="Active"
        )
        class_id = str(uuid.uuid4())
        payload = {
            "student_id": str(student.student_id),
            "class_id": class_id,
            "date": "2026-08-29",
            "status": "Present",
            "method": "QR"
        }

        response = self.client.post(
            "/api/v1/attendance/mark",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {caregiver_token_tenant_a}"
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["bo"] == "AttendanceSheet"
        assert data["record"]["status"] == "Present"

    def test_teacher_can_update_student_absence_record(self, tenant_a, teacher_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0090",
            name="Liam Carter",
            dob=date(2018, 1, 18),
            grade="Grade 6",
            status="Active"
        )
        class_id = uuid.uuid4()
        record = StudentAttendance.objects.create(
            tenant=tenant_a,
            student=student,
            class_id=class_id,
            date=date.today(),
            status="Absent",
            method="Manual",
            marked_by=uuid.uuid4(),
            notified_parent=True,
        )

        response = self.client.patch(
            f"/api/v1/attendance/{record.att_id}",
            data={"status": "Present", "method": "Manual"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )

        assert response.status_code == 200
        record.refresh_from_db()
        assert record.status == "Present"
        assert record.notified_parent is False

    def test_teacher_cannot_edit_attendance_older_than_the_lock_window(
        self, tenant_a, teacher_token_tenant_a
    ):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0091",
            name="Locked Attendance Student",
            grade="Grade 6",
            status="Active",
        )
        record = StudentAttendance.objects.create(
            tenant=tenant_a,
            student=student,
            class_id=uuid.uuid4(),
            date=date(2026, 1, 1),
            status="Present",
            method="Manual",
            marked_by=uuid.uuid4(),
        )

        response = self.client.patch(
            f"/api/v1/attendance/{record.att_id}",
            data={"status": "Absent"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}",
        )

        assert response.status_code == 422
        record.refresh_from_db()
        assert record.status == "Present"

    def test_medication_log_blocked_without_consent_returns_422(self, tenant_a, caregiver_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0061",
            name="Leo Messi",
            dob=date(2018, 9, 9),
            grade="Grade 3",
            status="Active"
        )
        # Create health profile without consent
        StudentHealth.objects.create(tenant=tenant_a, student=student, consent_flag=False)

        payload = {
            "student_id": str(student.student_id),
            "medicine_name": "Paracetamol",
            "dose": "5ml",
            "notes": "Fever"
        }

        response = self.client.post(
            "/api/v1/health/medication-log",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {caregiver_token_tenant_a}"
        )
        assert response.status_code == 422
        res_json = response.json()
        assert any(e["rule"] == "BR-07-01" for e in res_json["errors"])

    def test_log_incident_and_auto_escalation(self, tenant_a, staff_token_tenant_a):
        payload = {
            "incident_type": "Injury",
            "severity": "High",
            "date": "2026-08-29",
            "time": "14:15",
            "location": "Science Lab",
            "description": "Chemical spill minor burn",
            "actions_taken": "First aid applied, washed area",
            "students": ["Leo Messi"],
            "staff": ["Mr. Henderson"]
        }

        response = self.client.post(
            "/api/v1/incidents",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {staff_token_tenant_a}"
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["bo"] == "Incident"
        assert data["escalated_to_principal"] is True
        assert data["parent_notified"] is True

    def test_compliance_report_api(self, tenant_a, admin_token_tenant_a):
        SafetyDrill.objects.create(
            tenant=tenant_a,
            drill_type="Lockdown",
            scheduled_date=date(2026, 8, 20),
            duration_seconds=180,
            participation_rate=Decimal("99.00"),
            completed_by=uuid.uuid4(),
            signed_off=True
        )

        response = self.client.get(
            "/api/v1/safety/compliance-report/2026-08",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["bo"] == "SafetyComplianceReport"
        assert data["drills_conducted"] == 1
        assert data["compliance_status"] == "COMPLIANT"

    def test_student_attendance_roster_is_tenant_scoped_for_shared_editor_roles(
        self,
        tenant_a,
        tenant_b,
        admin_token_tenant_a,
        teacher_token_tenant_a,
        owner_token_tenant_a,
    ):
        class_id = uuid.uuid4()
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0301",
            name="Avery Student",
            grade="Pre-K",
            class_id=class_id,
            status="Active",
        )
        Student.objects.create(
            tenant=tenant_b,
            student_number="MLA-2026-0301",
            name="Other Tenant Student",
            grade="Pre-K",
            status="Active",
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=student,
            class_id=class_id,
            date=date(2026, 9, 30),
            status="On Leave",
            method="Manual",
            marked_by=uuid.uuid4(),
        )
        principal_token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "tenant_id": str(tenant_a.tenant_id),
                "role": "Principal",
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

        for token in (
            admin_token_tenant_a,
            teacher_token_tenant_a,
            owner_token_tenant_a,
            principal_token,
        ):
            response = self.client.get(
                "/api/v1/attendance/students/2026-09-30",
                HTTP_AUTHORIZATION=f"Bearer {token}",
            )
            assert response.status_code == 200
            rows = response.json()["data"]
            assert len(rows) == 1
            assert rows[0]["student_id"] == str(student.student_id)
            assert rows[0]["status"] == "On Leave"

    def test_bulk_attendance_marks_all_supported_student_statuses(
        self, tenant_a, teacher_token_tenant_a
    ):
        students = [
            Student.objects.create(
                tenant=tenant_a,
                student_number=f"OAK-2026-031{index}",
                name=f"Attendance Student {index}",
                grade="Grade 1",
                status="Active",
            )
            for index in range(4)
        ]
        statuses = ["Present", "Absent", "On Leave", "Holiday"]

        response = self.client.post(
            "/api/v1/attendance/bulk-mark",
            data={
                "date": "2026-09-30",
                "records": [
                    {"student_id": str(student.student_id), "status": status}
                    for student, status in zip(students, statuses)
                ],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}",
        )

        assert response.status_code == 200, response.json()
        saved = {
            str(record.student_id): record.status
            for record in StudentAttendance.objects.filter(
                tenant=tenant_a,
                date=date(2026, 9, 30),
                is_deleted=False,
            )
        }
        assert saved == {
            str(student.student_id): status
            for student, status in zip(students, statuses)
        }
        assert StudentAttendance.objects.get(
            tenant=tenant_a,
            student=students[1],
            date=date(2026, 9, 30),
        ).notified_parent is True
        assert StudentAttendance.objects.get(
            tenant=tenant_a,
            student=students[2],
            date=date(2026, 9, 30),
        ).notified_parent is False
