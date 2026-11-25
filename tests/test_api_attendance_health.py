import uuid
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
from django.test import Client
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from jose import jwt

from core.models import (
    Tenant, Student, StudentAttendance, StaffAttendance,
    LeaveRequest, StudentHealth, HealthObservation, Incident, SafetyDrill,
    EmergencyContact, AuditLog, Message, MedicationLog,
    CareEvent, LearningObservation,
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


@pytest.mark.django_db
class TestCaregiverMVP1API:
    def setup_method(self):
        self.client = Client()

    def _room_caregiver_token(self, tenant, class_id):
        return jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "tenant_id": str(tenant.tenant_id),
                "role": "CareGiver",
                "assigned_class_ids": [str(class_id)],
                "assigned_grades": ["Toddler & Pre-K"],
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

    def test_us_cg_01_room_scoping_and_checkin_checkout_flow(self, tenant_a):
        room_1a = uuid.uuid4()
        grade_4b = uuid.uuid4()
        toddler = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-CG-01",
            name="Noah Parker",
            grade="Toddler & Pre-K",
            class_id=room_1a,
            status="Active",
        )
        other_student = Student.objects.create(
            tenant=tenant_a,
            student_number="GR4-CG-01",
            name="Grade 4B Student",
            grade="Grade 4",
            class_id=grade_4b,
            status="Active",
        )
        token = self._room_caregiver_token(tenant_a, room_1a)
        today_str = timezone.localdate().isoformat()

        # 1. Roster only includes Room 1A toddler
        roster_res = self.client.get(
            f"/api/v1/attendance/students/{today_str}",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert roster_res.status_code == 200
        ids = [r["student_id"] for r in roster_res.json()["data"]]
        assert str(toddler.student_id) in ids
        assert str(other_student.student_id) not in ids

        # 2. Check-out before check-in returns HTTP 422
        co_early = self.client.post(
            "/api/v1/attendance/check-out",
            data={"student_id": str(toddler.student_id), "date": today_str},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert co_early.status_code == 422

        # 3. Cross-room check-in returns HTTP 403
        ci_cross = self.client.post(
            "/api/v1/attendance/check-in",
            data={"student_id": str(other_student.student_id), "date": today_str},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert ci_cross.status_code == 403

        # 4. Check-in is idempotent and persists check_in_at
        ci_res = self.client.post(
            "/api/v1/attendance/check-in",
            data={"student_id": str(toddler.student_id), "date": today_str},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert ci_res.status_code == 200
        first_ts = ci_res.json()["data"]["check_in_at"]
        assert first_ts is not None

        ci_again = self.client.post(
            "/api/v1/attendance/check-in",
            data={"student_id": str(toddler.student_id), "date": today_str},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert ci_again.status_code == 200
        assert ci_again.json()["data"]["check_in_at"] == first_ts

        # 5. Check-out persists check_out_at
        co_res = self.client.post(
            "/api/v1/attendance/check-out",
            data={"student_id": str(toddler.student_id), "date": today_str},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert co_res.status_code == 200
        assert co_res.json()["data"]["check_out_at"] is not None

    def test_us_cg_02_pickup_verification_pin_lock_and_custody_block(self, tenant_a):
        room_1a = uuid.uuid4()
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-CG-02",
            name="Maya Lin",
            grade="Toddler & Pre-K",
            class_id=room_1a,
            status="Active",
        )
        auth_contact = EmergencyContact.objects.create(
            tenant=tenant_a,
            student=student,
            name="Grandmother Maria R.",
            phone="416-555-0142",
            relationship="Grandmother",
            is_authorized_pickup=True,
            pickup_pin_hash=make_password("8841"),
        )
        restricted_contact = EmergencyContact.objects.create(
            tenant=tenant_a,
            student=student,
            name="Restricted Uncle",
            phone="416-555-0195",
            relationship="Uncle",
            is_authorized_pickup=False,
            custody_restricted=True,
            restriction_note="Court custody restriction on file.",
        )
        token = self._room_caregiver_token(tenant_a, room_1a)

        # 1. List contacts strictly omits pickup_pin_hash
        list_res = self.client.get(
            f"/api/v1/students/{student.student_id}/pickup-contacts",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert list_res.status_code == 200
        raw_text = str(list_res.json())
        assert "pickup_pin_hash" not in raw_text
        assert "8841" not in raw_text

        # 2. Valid PIN succeeds and writes AuditLog
        ok_res = self.client.post(
            f"/api/v1/students/{student.student_id}/pickup-verify",
            data={"contact_id": str(auth_contact.contact_id), "pin": "8841"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert ok_res.status_code == 200
        assert ok_res.json()["data"]["verified"] is True
        assert AuditLog.objects.filter(
            tenant=tenant_a, action="PICKUP_VERIFIED", entity_id=str(auth_contact.contact_id)
        ).exists()

        # 3. Custody-restricted contact returns 403 and logs BLOCKED_PICKUP
        custody_res = self.client.post(
            f"/api/v1/students/{student.student_id}/pickup-verify",
            data={"contact_id": str(restricted_contact.contact_id)},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert custody_res.status_code == 403
        assert AuditLog.objects.filter(
            tenant=tenant_a, action="BLOCKED_PICKUP", entity_id=str(restricted_contact.contact_id)
        ).exists()

        # 4. 3 failed PIN attempts lock verification (423) and alert Admin
        for attempt in range(2):
            bad_res = self.client.post(
                f"/api/v1/students/{student.student_id}/pickup-verify",
                data={"contact_id": str(auth_contact.contact_id), "pin": "0000"},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {token}",
            )
            assert bad_res.status_code == 403

        lock_res = self.client.post(
            f"/api/v1/students/{student.student_id}/pickup-verify",
            data={"contact_id": str(auth_contact.contact_id), "pin": "0000"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert lock_res.status_code == 423
        assert Message.objects.filter(
            tenant=tenant_a, recipient_role="Admin", trigger_event="PICKUP_PIN_LOCKED"
        ).exists()

    def test_us_cg_03_04_05_live_allergies_medications_and_incidents(self, tenant_a):
        room_1a = uuid.uuid4()
        toddler = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-CG-03",
            name="Zoe Zhao",
            grade="Toddler & Pre-K",
            class_id=room_1a,
            status="Active",
        )
        absent_toddler = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-CG-04",
            name="Charlotte Taylor",
            grade="Toddler & Pre-K",
            class_id=room_1a,
            status="Active",
        )
        StudentHealth.objects.create(
            tenant=tenant_a,
            student=toddler,
            allergies=[
                {"name": "Sesame", "severity": "Critical"},
                {"name": "Pollen", "severity": "Low"},
            ],
            medications=[
                {"name": "Amoxicillin", "dosage": "5mL", "scheduled_time": "11:30 AM"}
            ],
            consent_flag=True,
        )
        StudentHealth.objects.create(
            tenant=tenant_a,
            student=absent_toddler,
            medications=[{"name": "Vitamin D", "dosage": "1 drop", "scheduled_time": "12:00 PM"}],
            consent_flag=False,
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=absent_toddler,
            class_id=room_1a,
            date=timezone.localdate(),
            status="Absent",
            marked_by=uuid.uuid4(),
        )
        token = self._room_caregiver_token(tenant_a, room_1a)
        today_str = timezone.localdate().isoformat()

        # US-CG-03: Highest severity + count on roster
        roster_res = self.client.get(
            f"/api/v1/attendance/students/{today_str}",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert roster_res.status_code == 200
        zoe_row = next(r for r in roster_res.json()["data"] if r["student_id"] == str(toddler.student_id))
        assert zoe_row["medical_severity"] == "Critical"
        assert "Sesame" in zoe_row["medical_badge"]
        assert "+1 more" in zoe_row["medical_badge"]

        # US-CG-04: Classroom medications schedule & consent/duplicate/absent gates
        meds_res = self.client.get(
            "/api/v1/health/classroom-medications",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert meds_res.status_code == 200
        meds = meds_res.json()["data"]
        assert len(meds) == 2
        charlotte_med = next(m for m in meds if m["student_id"] == str(absent_toddler.student_id))
        assert charlotte_med["status"] == "Skipped (absent)"
        assert charlotte_med["consent_flag"] is False

        # Consent=False -> 422
        unconsented_res = self.client.post(
            "/api/v1/health/medication-log",
            data={"student_id": str(absent_toddler.student_id), "medicine_name": "Vitamin D", "dose": "1 drop"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert unconsented_res.status_code == 422

        # Consented dose -> 201, duplicate same-day -> 422
        ok_dose = self.client.post(
            "/api/v1/health/medication-log",
            data={"student_id": str(toddler.student_id), "medicine_name": "Amoxicillin", "dose": "5mL"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert ok_dose.status_code == 201

        dup_dose = self.client.post(
            "/api/v1/health/medication-log",
            data={"student_id": str(toddler.student_id), "medicine_name": "Amoxicillin", "dose": "5mL"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert dup_dose.status_code == 422

        # US-CG-05: Incident create-to-list resolves student UUIDs & body_part
        inc_post = self.client.post(
            "/api/v1/incidents",
            data={
                "incident_type": "Injury",
                "severity": "Low",
                "date": today_str,
                "time": "14:05",
                "location": "Room 1A",
                "body_part": "Left Elbow",
                "description": "Minor bump on mat.",
                "actions_taken": "Applied cold pack 5 mins.",
                "students": [str(toddler.student_id)],
                "staff": ["Clara Gomez"],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert inc_post.status_code == 201
        inc_list = self.client.get(
            "/api/v1/incidents",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert inc_list.status_code == 200
        inc = inc_list.json()["data"][0]
        assert inc["students"] == ["Zoe Zhao"]
        assert inc["body_part"] == "Left Elbow"
        assert inc["time"] == "14:05"

    def test_us_p2_01b_attendance_config_late_reason_health_and_care_history(self, tenant_a):
        room_1a = uuid.uuid4()
        room_2b = uuid.uuid4()
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-P2-01",
            name="Ari Patel",
            grade="Toddler & Pre-K",
            class_id=room_1a,
            status="Active",
        )
        other_student = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-P2-02",
            name="Samir Khan",
            grade="Senior K",
            class_id=room_2b,
            status="Active",
        )
        admin_token = jwt.encode(
            {"sub": str(uuid.uuid4()), "tenant_id": str(tenant_a.tenant_id), "role": "Admin"},
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )
        cg_token = self._room_caregiver_token(tenant_a, room_1a)

        # 1. CareGiver cannot mutate attendance config (403); Admin can read & update
        cg_put = self.client.put(
            "/api/v1/attendance/config",
            data={"expected_start_time": "09:00", "grace_period_minutes": 15, "late_check_in_cutoff": "09:15"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert cg_put.status_code == 403

        admin_put = self.client.put(
            "/api/v1/attendance/config",
            data={"expected_start_time": "08:45", "grace_period_minutes": 20, "late_check_in_cutoff": "09:05"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert admin_put.status_code == 200
        assert admin_put.json()["data"]["effective_cutoff"] == "09:05"
        assert admin_put.json()["data"]["is_configured"] is True

        cfg_get = self.client.get(
            "/api/v1/attendance/config",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert cfg_get.status_code == 200
        assert cfg_get.json()["data"]["expected_start_time"] == "08:45"

        # 2. Past-cutoff check-in without late_reason returns HTTP 422; valid reason returns Late
        today_local = timezone.localdate()
        past_cutoff_dt = timezone.make_aware(
            timezone.datetime.combine(today_local, timezone.datetime.strptime("10:30", "%H:%M").time()),
            timezone.get_current_timezone(),
        )
        with patch("core.business_objects.attendance_health.timezone.now", return_value=past_cutoff_dt), \
             patch("core.business_objects.attendance_health.timezone.localdate", return_value=today_local):
            missing_reason = self.client.post(
                "/api/v1/attendance/check-in",
                data={"student_id": str(student.student_id), "date": today_local.isoformat()},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {cg_token}",
            )
            assert missing_reason.status_code == 422

            invalid_reason = self.client.post(
                "/api/v1/attendance/check-in",
                data={"student_id": str(student.student_id), "date": today_local.isoformat(), "late_reason": "Unknown"},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {cg_token}",
            )
            assert invalid_reason.status_code == 422

            late_ok = self.client.post(
                "/api/v1/attendance/check-in",
                data={"student_id": str(student.student_id), "date": today_local.isoformat(), "late_reason": "Traffic / Transit Delay"},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {cg_token}",
            )
            assert late_ok.status_code == 200
            assert late_ok.json()["data"]["status"] == "Late"
            assert late_ok.json()["data"]["late_reason"] == "Traffic / Transit Delay"

        roster_res = self.client.get(
            f"/api/v1/attendance/students/{today_local.isoformat()}",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert roster_res.status_code == 200
        ari_row = next(r for r in roster_res.json()["data"] if r["student_id"] == str(student.student_id))
        assert ari_row["late_reason"] == "Traffic / Transit Delay"

        # 3. Health record upsert supports photo_consent & topical_consent + classroom medication-logs endpoint
        health_put = self.client.put(
            f"/api/v1/students/{student.student_id}/health-record",
            data={
                "allergies": [{"name": "Sesame", "severity": "High"}],
                "conditions": ["Asthma"],
                "medications": [{"name": "Ventolin", "dosage": "2 puffs", "scheduled_time": "11:30"}],
                "consent_flag": True,
                "photo_consent": True,
                "topical_consent": True,
                "doctor_name": "Dr. Lee",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert health_put.status_code == 200
        h_data = health_put.json()["data"]
        assert h_data["photo_consent"] is True
        assert h_data["topical_consent"] is True
        assert len(h_data["medications"]) == 1

        MedicationLog.objects.create(
            tenant=tenant_a,
            student=student,
            staff_id=uuid.uuid4(),
            medicine_name="Ventolin",
            dose="2 puffs",
            time_administered=timezone.now(),
            parent_notified=True,
        )
        meds_logs_res = self.client.get(
            "/api/v1/health/medication-logs",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert meds_logs_res.status_code == 200
        assert any(m["student_id"] == str(student.student_id) and m["medicine_name"] == "Ventolin" for m in meds_logs_res.json()["data"])

        # 4. Child daily care history aggregates records, enforces room RBAC (403), and handles empty dates cleanly
        CareEvent.objects.create(
            tenant=tenant_a,
            student=student,
            event_type="meal",
            occurred_at=timezone.now(),
            payload={"meal_type": "Lunch", "portion": "Most"},
            logged_by=uuid.uuid4(),
            parent_visible=True,
        )
        LearningObservation.objects.create(
            tenant=tenant_a,
            student=student,
            framework="ELECT",
            domains=["Social"],
            note="Shared blocks cooperatively.",
            observed_on=today_local,
            logged_by=uuid.uuid4(),
            shared_with_family=True,
        )
        hist_ok = self.client.get(
            f"/api/v1/students/{student.student_id}/care-history?target_date={today_local.isoformat()}",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert hist_ok.status_code == 200
        hist = hist_ok.json()["data"]
        assert hist["summary"]["care_events"] >= 1
        assert hist["summary"]["medications"] >= 1
        assert hist["summary"]["learning_observations"] >= 1
        assert hist["attendance"]["late_reason"] == "Traffic / Transit Delay"

        hist_empty = self.client.get(
            f"/api/v1/students/{student.student_id}/care-history?target_date={(today_local - timedelta(days=30)).isoformat()}",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert hist_empty.status_code == 200
        assert hist_empty.json()["data"]["summary"]["total_items"] == 0

        hist_forbidden = self.client.get(
            f"/api/v1/students/{other_student.student_id}/care-history",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert hist_forbidden.status_code == 403

    def test_us_ad_09_10_cg_17_19_consent_med_crud_supervisor_override_and_roll_audit(
        self, tenant_a, admin_token_tenant_a
    ):
        room1a_id = uuid.uuid4()
        grade4b_id = uuid.uuid4()
        toddler = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-AD-101",
            name="Maya Lin",
            grade="Toddler & Pre-K",
            class_id=room1a_id,
            status="Active",
        )
        elem = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-AD-201",
            name="Lucas Vance",
            grade="Grade 4B",
            class_id=grade4b_id,
            status="Active",
        )
        cg_token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "tenant_id": str(tenant_a.tenant_id),
                "role": "CareGiver",
                "assigned_class_ids": [str(room1a_id)],
                "assigned_grades": ["Toddler & Pre-K"],
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

        # US-AD-10: Check consent=True stamps consent_date; un-check resets consent_date=None & blocks Caregiver
        grant_res = self.client.put(
            f"/api/v1/students/{toddler.student_id}/health-record",
            data={
                "medications": [{"name": "Amoxicillin", "dosage": "5mL", "scheduled_time": "11:00 AM"}],
                "consent_flag": True,
                "photo_consent": True,
                "topical_consent": True,
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert grant_res.status_code == 200
        assert grant_res.json()["data"]["consent_date"] is not None

        revoke_res = self.client.put(
            f"/api/v1/students/{toddler.student_id}/health-record",
            data={"consent_flag": False},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert revoke_res.status_code == 200
        assert revoke_res.json()["data"]["consent_flag"] is False
        assert revoke_res.json()["data"]["consent_date"] is None

        blocked_sched = self.client.get(
            "/api/v1/health/classroom-medications",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert blocked_sched.status_code == 200
        maya_row = next(r for r in blocked_sched.json()["data"] if r["student_id"] == str(toddler.student_id))
        assert maya_row["status"] == "Blocked (Consent Missing)"
        assert maya_row["consent_flag"] is False

        blocked_dose = self.client.post(
            "/api/v1/health/medication-log",
            data={"student_id": str(toddler.student_id), "medicine_name": "Amoxicillin", "dose": "5mL"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert blocked_dose.status_code == 422

        # Re-grant consent for US-AD-09 CRUD
        regrant = self.client.put(
            f"/api/v1/students/{toddler.student_id}/health-record",
            data={"consent_flag": True},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert regrant.status_code == 200

        # US-AD-09: Admin CREATE, PATCH, and DELETE MedicationLog + AuditLog + Caregiver 403 on DELETE
        create_med = self.client.post(
            "/api/v1/health/medication-log",
            data={
                "student_id": str(toddler.student_id),
                "medicine_name": "Amoxicillin",
                "dose": "5mL",
                "notes": "Initial dose",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert create_med.status_code == 201
        med_log_id = create_med.json()["data"]["created_med_log_id"]

        patch_med = self.client.patch(
            f"/api/v1/health/medication-log/{med_log_id}",
            data={"dose": "7.5mL", "notes": "Updated per Rx"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert patch_med.status_code == 200
        assert patch_med.json()["data"]["dose"] == "7.5mL"

        cg_del_med = self.client.delete(
            f"/api/v1/health/medication-log/{med_log_id}",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert cg_del_med.status_code == 403

        admin_del_med = self.client.delete(
            f"/api/v1/health/medication-log/{med_log_id}",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert admin_del_med.status_code == 200
        assert MedicationLog.objects.get(med_log_id=med_log_id).is_deleted is True
        assert AuditLog.objects.filter(
            tenant=tenant_a, entity="MedicationLog", entity_id=med_log_id, action="DELETE"
        ).exists()

        # US-CG-17: Supervisor historical override (422 blank reason -> 200 + AuditLog)
        past_date = timezone.localdate() - timedelta(days=5)
        bad_override = self.client.post(
            "/api/v1/attendance/supervisor-override",
            data={
                "student_id": str(toddler.student_id),
                "date": past_date.isoformat(),
                "status": "Present",
                "override_reason": "   ",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert bad_override.status_code == 422

        ok_override = self.client.post(
            "/api/v1/attendance/supervisor-override",
            data={
                "student_id": str(toddler.student_id),
                "date": past_date.isoformat(),
                "status": "Present",
                "override_reason": "Parent confirmed drop-off sign-in sheet",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert ok_override.status_code == 200
        assert AuditLog.objects.filter(
            tenant=tenant_a,
            entity="StudentAttendance",
            action="UPDATE",
            new_values__event="OVERRIDE_PAST_CARE_LOG",
        ).exists()

        # US-CG-19: Live Roll Audit Trail (scoped Room 1A for CareGiver, 403 on Grade 4B, 200 confirm)
        today_str = timezone.localdate().isoformat()
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=toddler,
            class_id=room1a_id,
            date=timezone.localdate(),
            status="Absent",
            notified_parent=True,
            marked_by=uuid.uuid4(),
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=elem,
            class_id=grade4b_id,
            date=timezone.localdate(),
            status="Present",
            marked_by=uuid.uuid4(),
        )

        cg_audit = self.client.get(
            f"/api/v1/attendance/roll-audit/{today_str}",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert cg_audit.status_code == 200
        audit_data = cg_audit.json()["data"]
        assert audit_data["scope_label"] == "Room 1A Only"
        assert audit_data["kpis"]["unexcused_absent"] == 1
        assert all(ev["student_id"] != str(elem.student_id) for ev in audit_data["events"])

        cg_forbidden_grade4b = self.client.get(
            f"/api/v1/attendance/roll-audit/{today_str}?class_id={grade4b_id}",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert cg_forbidden_grade4b.status_code == 403

        admin_audit = self.client.get(
            f"/api/v1/attendance/roll-audit/{today_str}",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert admin_audit.status_code == 200
        assert admin_audit.json()["data"]["total_enrolled"] == 2

        confirm_res = self.client.post(
            f"/api/v1/attendance/roll-audit/{today_str}/confirm",
            data={"note": "Morning roll verified."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {cg_token}",
        )
        assert confirm_res.status_code == 200
        assert AuditLog.objects.filter(
            tenant=tenant_a, entity="AttendanceRoll", action="CREATE"
        ).exists()
