import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, StudentAttendance, StaffAttendance, LeaveRequest,
    AttendanceRoster, StudentHealth, HealthObservation, MedicationLog,
    Incident, SafetyDrill, AcademicCalendar, AuditLog
)
from core.business_objects.academic import AcademicCalendarBO


class AttendanceSheetBO(BaseBusinessObject):
    """
    BO-07: AttendanceSheet
    Domain: Attendance
    Source Entities: STUDENT_ATTENDANCE, ATTENDANCE_ROSTER, STUDENT
    """
    def __init__(self, record: Optional[StudentAttendance] = None, actor_role: str = 'Teacher'):
        self.record = record
        self.actor_role = actor_role

    # ── BR-03-01: 24-Hour Edit Lock Gate ─────────────────────────────
    def validate_BR_03_01(self) -> Optional[RuleViolation]:
        if not self.record or not self.record.pk:
            return None

        # Lock check: > 24 hours from attendance date
        cutoff = timezone.now().date() - timedelta(days=1)
        if self.record.date < cutoff and self.actor_role not in ['Principal', 'Owner']:
            return RuleViolation(
                rule_id="BR-03-01",
                message=f"Attendance record for {self.record.date} is locked for editing (>24h). Principal override required.",
                field="date"
            )
        return None

    @classmethod
    def mark_attendance(
        cls,
        tenant: Tenant,
        student: Student,
        class_id: uuid.UUID,
        att_date: date,
        status: str,
        marked_by: uuid.UUID,
        method: str = "Manual",
        period: str = "Full_Day",
        actor_role: str = "Teacher"
    ) -> StudentAttendance:
        with transaction.atomic():
            existing = StudentAttendance.objects.filter(
                tenant=tenant,
                student=student,
                class_id=class_id,
                date=att_date,
                period=period,
                is_deleted=False
            ).first()

            if existing:
                bo = cls(record=existing, actor_role=actor_role)
                bo.enforce_rules()  # Enforces 24-hour lock

                existing.status = status
                existing.method = method
                existing.marked_by = marked_by
                existing.save()
                record = existing
            else:
                record = StudentAttendance.objects.create(
                    tenant=tenant,
                    student=student,
                    class_id=class_id,
                    date=att_date,
                    period=period,
                    status=status,
                    method=method,
                    marked_by=marked_by
                )

            # BR-03-02: Check unexcused absence
            if status == 'Absent':
                has_approved_leave = LeaveRequest.objects.filter(
                    tenant=tenant,
                    requester_id=student.student_id,
                    requester_type='Student',
                    start_date__lte=att_date,
                    end_date__gte=att_date,
                    status='Approved',
                    is_deleted=False
                ).exists()

                if not has_approved_leave:
                    record.notified_parent = True
                    record.save(update_fields=['notified_parent', 'updated_at'])

            return record

    @classmethod
    def compute_student_summary(cls, tenant: Tenant, student: Student) -> Dict[str, Any]:
        records = StudentAttendance.objects.filter(
            tenant=tenant,
            student=student,
            is_deleted=False
        )
        total = records.count()
        present_count = records.filter(status__in=['Present', 'Late']).count()
        absent_count = records.filter(status='Absent').count()
        excused_count = records.filter(status='Excused').count()

        pct = float(round((present_count / total) * 100, 2)) if total > 0 else 100.0

        # BR-03-05: Low attendance flag (< 80%)
        flagged_for_counselor = (pct < 80.0 and total >= 5)

        return {
            "bo": "AttendanceSummary",
            "student_id": str(student.student_id),
            "student_name": student.name,
            "total_sessions": total,
            "present_count": present_count,
            "absent_count": absent_count,
            "excused_count": excused_count,
            "attendance_percentage": pct,
            "flagged_for_counselor": flagged_for_counselor
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "AttendanceSheet",
            "record": {
                "att_id": str(self.record.att_id),
                "student_id": str(self.record.student.student_id),
                "student_name": self.record.student.name,
                "class_id": str(self.record.class_id),
                "date": self.record.date.isoformat(),
                "status": self.record.status,
                "method": self.record.method,
                "notified_parent": self.record.notified_parent
            } if self.record else None
        }


class LeaveCaseBO(BaseBusinessObject):
    """
    BO-08: LeaveCase
    Domain: Attendance
    Source Entities: LEAVE_REQUEST, ACADEMIC_CALENDAR
    """
    def __init__(self, leave_request: LeaveRequest, calendar_bo: Optional[AcademicCalendarBO] = None, actor_role: str = 'Staff'):
        self.leave_request = leave_request
        self.calendar_bo = calendar_bo
        self.actor_role = actor_role

    # ── BR-03-04: Blackout Date Override Gate ────────────────────────
    def validate_BR_03_04(self) -> Optional[RuleViolation]:
        if not self.calendar_bo:
            return None

        # Check if start or end date falls in blackout date
        curr = self.leave_request.start_date
        has_blackout = False
        while curr <= self.leave_request.end_date:
            if self.calendar_bo.is_blackout_date(curr):
                has_blackout = True
                break
            curr += timedelta(days=1)

        if has_blackout and self.actor_role not in ['Principal', 'Vice_Principal', 'Owner']:
            return RuleViolation(
                rule_id="BR-03-04",
                message=f"Leave request ({self.leave_request.start_date} to {self.leave_request.end_date}) conflicts with calendar blackout dates. Principal approval required.",
                field="start_date"
            )
        return None

    @classmethod
    def create_leave_request(
        cls,
        tenant: Tenant,
        requester_id: uuid.UUID,
        requester_type: str,
        leave_type: str,
        start_date: date,
        end_date: date,
        days: Decimal,
        reason: str,
        calendar_bo: Optional[AcademicCalendarBO] = None,
        actor_role: str = 'Staff',
    ) -> LeaveRequest:
        leave = LeaveRequest(
            tenant=tenant,
            requester_id=requester_id,
            requester_type=requester_type,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days=days,
            reason=reason,
            status='Pending',
        )
        bo = cls(leave_request=leave, calendar_bo=calendar_bo, actor_role=actor_role)
        bo.enforce_rules()
        leave.save()
        return leave

    def approve(self, approver_id: uuid.UUID, actor_role: str = 'Admin') -> None:
        self.actor_role = actor_role
        self.enforce_rules()

        self.leave_request.status = 'Approved'
        self.leave_request.approved_by = approver_id
        self.leave_request.approval_date = timezone.now()
        self.leave_request.save(update_fields=['status', 'approved_by', 'approval_date', 'updated_at'])

    def reject(self) -> None:
        self.leave_request.status = 'Rejected'
        self.leave_request.save(update_fields=['status', 'updated_at'])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "LeaveCase",
            "leave_id": str(self.leave_request.leave_id),
            "requester_id": str(self.leave_request.requester_id),
            "requester_type": self.leave_request.requester_type,
            "leave_type": self.leave_request.leave_type,
            "start_date": self.leave_request.start_date.isoformat(),
            "end_date": self.leave_request.end_date.isoformat(),
            "days": float(self.leave_request.days),
            "status": self.leave_request.status,
            "reason": self.leave_request.reason
        }


class StaffRosterBO(BaseBusinessObject):
    """
    BO-09: StaffRoster
    Domain: Attendance / HR
    Source Entities: STAFF_ATTENDANCE, LEAVE_REQUEST, SCHEDULE
    """
    def __init__(self, tenant: Tenant, roster_date: date, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.roster_date = roster_date
        self.actor_role = actor_role

    # ── BR-03-06: Substitute Availability Gate ───────────────────────
    def validate_substitute_availability(self, substitute_id: uuid.UUID) -> Optional[RuleViolation]:
        # Check if substitute has approved leave on this date
        on_leave = LeaveRequest.objects.filter(
            tenant=self.tenant,
            requester_id=substitute_id,
            requester_type='Staff',
            start_date__lte=self.roster_date,
            end_date__gte=self.roster_date,
            status='Approved',
            is_deleted=False
        ).exists()

        if on_leave:
            return RuleViolation(
                rule_id="BR-03-06",
                message=f"Staff member {substitute_id} is on approved leave on {self.roster_date} and cannot be assigned as substitute.",
                field="substitute_id"
            )
        return None

    def assign_substitution(self, absent_staff_id: uuid.UUID, substitute_id: uuid.UUID) -> StaffAttendance:
        violation = self.validate_substitute_availability(substitute_id)
        if violation:
            raise BusinessRuleError([violation])

        with transaction.atomic():
            att, _ = StaffAttendance.objects.update_or_create(
                tenant=self.tenant,
                staff_id=absent_staff_id,
                date=self.roster_date,
                defaults={
                    "status": "Absent",
                    "substitute_id": substitute_id
                }
            )
        return att

    def to_dict(self) -> Dict[str, Any]:
        attendances = StaffAttendance.objects.filter(
            tenant=self.tenant,
            date=self.roster_date,
            is_deleted=False
        )
        return {
            "bo": "StaffRoster",
            "date": self.roster_date.isoformat(),
            "total_staff_logged": attendances.count(),
            "absent_count": attendances.filter(status='Absent').count(),
            "substitutions_count": attendances.filter(substitute_id__isnull=False).count()
        }


class HealthRecordBO(BaseBusinessObject):
    """
    BO-17: HealthRecord
    Domain: Health
    Source Entities: STUDENT_HEALTH, HEALTH_OBSERVATION, MEDICATION_LOG
    """
    def __init__(self, student: Student, actor_role: str = 'CareGiver'):
        self.student = student
        self.actor_role = actor_role
        self.health_profile = getattr(student, 'health_profile', None)

    # ── BR-07-01: Parental Consent for Medication Gate ───────────────
    def validate_medication_consent(self) -> Optional[RuleViolation]:
        if not self.health_profile or not self.health_profile.consent_flag:
            return RuleViolation(
                rule_id="BR-07-01",
                message=f"Cannot administer medication: no signed parental medical consent on record for student {self.student.name}.",
                field="consent_flag"
            )
        return None

    def log_medication(self, staff_id: uuid.UUID, medicine_name: str, dose: str, notes: str = "") -> MedicationLog:
        violation = self.validate_medication_consent()
        if violation:
            raise BusinessRuleError([violation])

        return MedicationLog.objects.create(
            tenant=self.student.tenant,
            student=self.student,
            staff_id=staff_id,
            medicine_name=medicine_name,
            dose=dose,
            time_administered=timezone.now(),
            parent_notified=True,
            notes=notes
        )

    def log_observation(
        self,
        staff_id: uuid.UUID,
        obs_date: date,
        mood: str,
        appetite: str,
        nap_duration_mins: int,
        feeding_notes: str = "",
        general_notes: str = "",
    ) -> HealthObservation:
        return HealthObservation.objects.create(
            tenant=self.student.tenant,
            student=self.student,
            staff_id=staff_id,
            date=obs_date,
            mood=mood,
            appetite=appetite,
            nap_duration_mins=nap_duration_mins,
            feeding_notes=feeding_notes,
            general_notes=general_notes,
        )

    def to_dict(self) -> Dict[str, Any]:
        obs = [
            {
                "obs_id": str(o.obs_id),
                "date": o.date.isoformat(),
                "mood": o.mood,
                "appetite": o.appetite,
                "nap_duration_mins": o.nap_duration_mins,
                "feeding_notes": o.feeding_notes
            }
            for o in self.student.health_observations.filter(is_deleted=False).order_by('-date')[:5]
        ]
        meds = [
            {
                "med_log_id": str(m.med_log_id),
                "medicine_name": m.medicine_name,
                "dose": m.dose,
                "time_administered": m.time_administered.isoformat()
            }
            for m in self.student.medication_logs.filter(is_deleted=False).order_by('-time_administered')[:5]
        ]
        return {
            "bo": "HealthRecord",
            "student_id": str(self.student.student_id),
            "student_name": self.student.name,
            "allergies": self.health_profile.allergies if self.health_profile else [],
            "conditions": self.health_profile.conditions if self.health_profile else [],
            "consent_flag": self.health_profile.consent_flag if self.health_profile else False,
            "doctor_name": self.health_profile.doctor_name if self.health_profile else "",
            "recent_observations": obs,
            "recent_medication_logs": meds
        }


class SafetyComplianceBO(BaseBusinessObject):
    """
    BO-18: SafetyCompliance
    Domain: Health & Safety
    Source Entities: INCIDENT, SAFETY_DRILL
    """
    def __init__(self, tenant: Tenant, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.actor_role = actor_role

    # ── BR-07-04: Safety Drill Immutability Gate ─────────────────────
    @classmethod
    def record_safety_drill(
        cls,
        tenant: Tenant,
        drill_type: str,
        scheduled_date: date,
        duration_seconds: int,
        participation_rate: Decimal,
        completed_by: uuid.UUID,
        issues_noted: List[str] = None
    ) -> SafetyDrill:
        return SafetyDrill.objects.create(
            tenant=tenant,
            drill_type=drill_type,
            scheduled_date=scheduled_date,
            duration_seconds=duration_seconds,
            participation_rate=participation_rate,
            completed_by=completed_by,
            issues_noted=issues_noted or [],
            signed_off=True
        )

    @classmethod
    def report_incident(
        cls,
        tenant: Tenant,
        incident_type: str,
        severity: str,
        incident_date: date,
        location: str,
        description: str,
        actions_taken: str,
        students: List[str] = None,
        staff: List[str] = None,
        actor_id: Optional[uuid.UUID] = None
    ) -> Incident:
        # BR-07-03: Automatic escalation for High/Critical or Allergic Reaction
        auto_escalate = (severity in ['High', 'Critical'] or incident_type in ['Allergic_Reaction', 'Injury'])

        incident = Incident.objects.create(
            tenant=tenant,
            incident_type=incident_type,
            severity=severity,
            date=incident_date,
            location=location,
            description=description,
            actions_taken=actions_taken,
            students=students or [],
            staff=staff or [],
            escalated_to_principal=auto_escalate,
            parent_notified=auto_escalate,
            created_by=actor_id
        )
        return incident

    def generate_compliance_report(self, period: str = "2026-08") -> Dict[str, Any]:
        drills = SafetyDrill.objects.filter(tenant=self.tenant, is_deleted=False)
        incidents = Incident.objects.filter(tenant=self.tenant, is_deleted=False)

        drills_count = drills.count()
        incidents_count = incidents.count()
        critical_incidents = incidents.filter(severity__in=['High', 'Critical']).count()
        avg_participation = float(sum(d.participation_rate for d in drills) / drills_count) if drills_count > 0 else 100.0

        return {
            "bo": "SafetyComplianceReport",
            "period": period,
            "drills_conducted": drills_count,
            "average_drill_participation": avg_participation,
            "total_incidents": incidents_count,
            "critical_incidents": critical_incidents,
            "compliance_status": "COMPLIANT" if drills_count >= 1 and critical_incidents == 0 else "ACTION_REQUIRED"
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.generate_compliance_report()
