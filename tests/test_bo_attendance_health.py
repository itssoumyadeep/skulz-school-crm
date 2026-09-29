import uuid
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone

from core.models import (
    Tenant, Student, StudentAttendance, StaffAttendance, LeaveRequest,
    AttendanceRoster, StudentHealth, HealthObservation, MedicationLog,
    Incident, SafetyDrill, AcademicCalendar
)
from core.business_objects.attendance_health import (
    AttendanceSheetBO,
    LeaveCaseBO,
    StaffRosterBO,
    HealthRecordBO,
    SafetyComplianceBO
)
from core.business_objects.academic import AcademicCalendarBO
from core.business_objects.base import BusinessRuleError


@pytest.fixture
def active_student(tenant_a):
    return Student.objects.create(
        tenant=tenant_a,
        student_number="OAK-2026-0050",
        name="Maya Lin",
        dob=date(2018, 7, 10),
        grade="Grade 3",
        status="Active"
    )


@pytest.fixture
def calendar_with_blackout(tenant_a):
    return AcademicCalendar.objects.create(
        tenant=tenant_a,
        academic_year="2025-2026",
        blackout_dates=["2025-11-01", "2025-11-02"]
    )


@pytest.mark.django_db
class TestAttendanceSheetBO:
    # ── BR-03-01: 24-Hour Edit Lock Gate ─────────────────────────────
    def test_br_03_01_blocks_editing_past_24_hours(self, tenant_a, active_student):
        old_date = timezone.now().date() - timedelta(days=3)
        class_id = uuid.uuid4()
        teacher_id = uuid.uuid4()

        # Create record 3 days ago
        record = StudentAttendance.objects.create(
            tenant=tenant_a,
            student=active_student,
            class_id=class_id,
            date=old_date,
            status="Present",
            marked_by=teacher_id
        )

        # Teacher trying to edit locked attendance record -> fails with BR-03-01
        with pytest.raises(BusinessRuleError) as exc:
            AttendanceSheetBO.mark_attendance(
                tenant=tenant_a,
                student=active_student,
                class_id=class_id,
                att_date=old_date,
                status="Absent",
                marked_by=teacher_id,
                actor_role="Teacher"
            )
        assert any(v.rule_id == "BR-03-01" for v in exc.value.violations)

        # Principal CAN override
        updated = AttendanceSheetBO.mark_attendance(
            tenant=tenant_a,
            student=active_student,
            class_id=class_id,
            att_date=old_date,
            status="Absent",
            marked_by=teacher_id,
            actor_role="Principal"
        )
        assert updated.status == "Absent"

    # ── BR-03-02: Unexcused Absence Parent Notification ──────────────
    def test_br_03_02_flags_unexcused_absence_for_notification(self, tenant_a, active_student):
        today = timezone.now().date()
        class_id = uuid.uuid4()

        # Mark absent without approved leave -> notified_parent becomes True
        rec = AttendanceSheetBO.mark_attendance(
            tenant=tenant_a,
            student=active_student,
            class_id=class_id,
            att_date=today,
            status="Absent",
            marked_by=uuid.uuid4()
        )
        assert rec.notified_parent is True

    # ── BR-03-05: Low Attendance Threshold Counselor Flag ────────────
    def test_br_03_05_flags_student_with_low_attendance(self, tenant_a, active_student):
        class_id = uuid.uuid4()
        today = timezone.now().date()

        # Create 10 attendance records: 3 Present, 7 Absent (30% attendance)
        for i in range(10):
            d = today - timedelta(days=i + 1)
            StudentAttendance.objects.create(
                tenant=tenant_a,
                student=active_student,
                class_id=class_id,
                date=d,
                status="Present" if i < 3 else "Absent",
                marked_by=uuid.uuid4()
            )

        summary = AttendanceSheetBO.compute_student_summary(tenant=tenant_a, student=active_student)
        assert summary["attendance_percentage"] == 30.0
        assert summary["flagged_for_counselor"] is True


@pytest.mark.django_db
class TestLeaveCaseBO:
    # ── BR-03-04: Blackout Date Conflict Gate ────────────────────────
    def test_br_03_04_blocks_leave_on_blackout_date_for_regular_staff(self, tenant_a, calendar_with_blackout):
        staff_id = uuid.uuid4()
        leave = LeaveRequest(
            tenant=tenant_a,
            requester_id=staff_id,
            requester_type='Staff',
            start_date=date(2025, 11, 1),  # Blackout date!
            end_date=date(2025, 11, 2),
            days=Decimal("2.0"),
            reason="Vacation"
        )
        cal_bo = AcademicCalendarBO(calendar=calendar_with_blackout)
        bo = LeaveCaseBO(leave_request=leave, calendar_bo=cal_bo, actor_role='Staff')

        with pytest.raises(BusinessRuleError) as exc:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-03-04" for v in exc.value.violations)

        # Principal approval passes
        bo_principal = LeaveCaseBO(leave_request=leave, calendar_bo=cal_bo, actor_role='Principal')
        bo_principal.approve(approver_id=uuid.uuid4(), actor_role='Principal')
        assert leave.status == 'Approved'


@pytest.mark.django_db
class TestStaffRosterBO:
    # ── BR-03-06: Substitute Availability Gate ───────────────────────
    def test_br_03_06_fails_if_substitute_is_on_leave(self, tenant_a):
        absent_teacher_id = uuid.uuid4()
        substitute_id = uuid.uuid4()
        roster_date = date(2025, 11, 15)

        # Substitute has approved leave
        LeaveRequest.objects.create(
            tenant=tenant_a,
            requester_id=substitute_id,
            requester_type='Staff',
            start_date=date(2025, 11, 15),
            end_date=date(2025, 11, 16),
            status='Approved'
        )

        bo = StaffRosterBO(tenant=tenant_a, roster_date=roster_date)
        with pytest.raises(BusinessRuleError) as exc:
            bo.assign_substitution(absent_staff_id=absent_teacher_id, substitute_id=substitute_id)

        assert any(v.rule_id == "BR-03-06" for v in exc.value.violations)

    def test_assign_substitution_success_when_substitute_available(self, tenant_a):
        absent_teacher_id = uuid.uuid4()
        substitute_id = uuid.uuid4()
        roster_date = date(2025, 11, 15)

        bo = StaffRosterBO(tenant=tenant_a, roster_date=roster_date)
        att = bo.assign_substitution(absent_staff_id=absent_teacher_id, substitute_id=substitute_id)
        assert att.status == "Absent"
        assert att.substitute_id == substitute_id


@pytest.mark.django_db
class TestHealthRecordBO:
    # ── BR-07-01: Parental Consent Gate for Medication ───────────────
    def test_br_07_01_fails_without_parental_consent(self, tenant_a, active_student):
        # Create health profile WITHOUT consent (consent_flag=False)
        StudentHealth.objects.create(
            tenant=tenant_a,
            student=active_student,
            consent_flag=False
        )

        bo = HealthRecordBO(student=active_student)
        with pytest.raises(BusinessRuleError) as exc:
            bo.log_medication(
                staff_id=uuid.uuid4(),
                medicine_name="Amoxicillin",
                dose="5ml"
            )

        assert any(v.rule_id == "BR-07-01" for v in exc.value.violations)

    def test_br_07_01_passes_with_parental_consent(self, tenant_a, active_student):
        StudentHealth.objects.create(
            tenant=tenant_a,
            student=active_student,
            consent_flag=True,
            consent_date=timezone.now()
        )

        bo = HealthRecordBO(student=active_student)
        log = bo.log_medication(
            staff_id=uuid.uuid4(),
            medicine_name="Inhaler",
            dose="2 puffs"
        )
        assert log.medicine_name == "Inhaler"
        assert log.parent_notified is True


@pytest.mark.django_db
class TestSafetyComplianceBO:
    # ── BR-07-03: Auto-Escalation of Serious Incidents ────────────────
    def test_br_07_03_auto_escalates_critical_incident(self, tenant_a):
        incident = SafetyComplianceBO.report_incident(
            tenant=tenant_a,
            incident_type="Allergic_Reaction",
            severity="Critical",
            incident_date=timezone.now().date(),
            location="Playground",
            description="Peanut exposure",
            actions_taken="Administered EpiPen and called paramedic"
        )
        assert incident.escalated_to_principal is True
        assert incident.parent_notified is True

    def test_generate_compliance_report(self, tenant_a):
        SafetyComplianceBO.record_safety_drill(
            tenant=tenant_a,
            drill_type="Fire",
            scheduled_date=timezone.now().date(),
            duration_seconds=110,
            participation_rate=Decimal("98.50"),
            completed_by=uuid.uuid4()
        )

        bo = SafetyComplianceBO(tenant=tenant_a)
        report = bo.generate_compliance_report(period="2026-08")
        assert report["drills_conducted"] == 1
        assert report["compliance_status"] == "COMPLIANT"
