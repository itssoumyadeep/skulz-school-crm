"""Domain business logic for student/staff attendance, lock windows, leave approvals, medical records, and incident escalations."""

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

DEFAULT_ATTENDANCE_CLASS_ID = uuid.UUID('11111111-1111-4111-8111-111111111111')


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

            cls._apply_absence_notification(record)

            return record

    @classmethod
    def update_record(
        cls,
        *,
        record: StudentAttendance,
        actor_role: str,
        marked_by: uuid.UUID,
        status: Optional[str] = None,
        method: Optional[str] = None,
        period: Optional[str] = None,
        notified_parent: Optional[bool] = None,
    ) -> StudentAttendance:
        """Update attendance through the same rule gate as marking it."""
        with transaction.atomic():
            cls(record=record, actor_role=actor_role).enforce_rules()

            if status is not None:
                record.status = status
            if method is not None:
                record.method = method
            if period is not None:
                record.period = period
            if notified_parent is not None:
                record.notified_parent = notified_parent
            record.marked_by = marked_by
            record.save()
            cls._apply_absence_notification(record)
            return record

    @staticmethod
    def _apply_absence_notification(record: StudentAttendance) -> None:
        """Keep the notification flag consistent with the final absence state."""
        if record.status == 'Absent':
            has_approved_leave = LeaveRequest.objects.filter(
                tenant=record.tenant,
                requester_id=record.student_id,
                requester_type='Student',
                start_date__lte=record.date,
                end_date__gte=record.date,
                status='Approved',
                is_deleted=False,
            ).exists()
            if not has_approved_leave and not record.notified_parent:
                record.notified_parent = True
                record.save(update_fields=['notified_parent', 'updated_at'])
        elif record.notified_parent:
            record.notified_parent = False
            record.save(update_fields=['notified_parent', 'updated_at'])

    @classmethod
    def mark_roster(
        cls,
        *,
        tenant: Tenant,
        records: List[tuple[Student, str]],
        att_date: date,
        marked_by: uuid.UUID,
        actor_role: str,
    ) -> List[StudentAttendance]:
        with transaction.atomic():
            return [
                cls.mark_attendance(
                    tenant=tenant,
                    student=student,
                    class_id=student.class_id or DEFAULT_ATTENDANCE_CLASS_ID,
                    att_date=att_date,
                    status=status,
                    marked_by=marked_by,
                    method='Manual',
                    period='Full_Day',
                    actor_role=actor_role,
                )
                for student, status in records
            ]

    @classmethod
    def compute_student_summary(cls, tenant: Tenant, student: Student) -> Dict[str, Any]:
        records = StudentAttendance.objects.filter(
            tenant=tenant,
            student=student,
            is_deleted=False
        )
        sessions = records.exclude(status='Holiday')
        total = sessions.count()
        present_count = sessions.filter(status__in=['Present', 'Late']).count()
        absent_count = sessions.filter(status='Absent').count()
        excused_count = sessions.filter(status__in=['Excused', 'On Leave']).count()
        holiday_count = records.filter(status='Holiday').count()

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
            "holiday_count": holiday_count,
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

    @classmethod
    def delete_attendance(
        cls,
        record: StudentAttendance,
        actor_role: str = 'Teacher',
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        with transaction.atomic():
            cls(record=record, actor_role=actor_role).enforce_rules()
            record.is_deleted = True
            record.save(update_fields=['is_deleted', 'updated_at'])
            AuditLog.objects.create(
                tenant=record.tenant,
                actor_id=actor_id,
                action='DELETE',
                entity='StudentAttendance',
                entity_id=str(record.att_id),
                new_values={'is_deleted': True, 'date': record.date.isoformat(), 'actor_role': actor_role},
            )
        return {'att_id': str(record.att_id), 'is_deleted': True}


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

    @classmethod
    def list_leave_requests(
        cls,
        tenant_id: uuid.UUID,
        requester_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        qs = LeaveRequest.objects.filter(tenant_id=tenant_id, is_deleted=False).order_by('-start_date')
        if requester_id:
            qs = qs.filter(requester_id=requester_id)
        if status:
            qs = qs.filter(status__iexact=status)
        return [cls(leave_request=lr).to_dict() for lr in qs]

    def cancel_leave_request(self, actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        if self.leave_request.status == 'Approved' and self.actor_role not in ('Admin', 'Principal', 'Owner'):
            raise BusinessRuleError([
                RuleViolation(
                    rule_id='BR-03-04',
                    message="Approved leave requests can only be cancelled by Admin, Principal, or Owner.",
                    field='status',
                )
            ])
        with transaction.atomic():
            self.leave_request.status = 'Cancelled'
            self.leave_request.is_deleted = True
            self.leave_request.save(update_fields=['status', 'is_deleted', 'updated_at'])
            AuditLog.objects.create(
                tenant=self.leave_request.tenant,
                actor_id=actor_id,
                action='DELETE',
                entity='LeaveRequest',
                entity_id=str(self.leave_request.leave_id),
                new_values={'status': 'Cancelled', 'is_deleted': True},
            )
        return {'leave_id': str(self.leave_request.leave_id), 'status': 'Cancelled', 'is_deleted': True}


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

    @staticmethod
    def _serialize_staff_attendance(att: StaffAttendance, cover_alert: bool = False) -> Dict[str, Any]:
        return {
            "staff_att_id": str(att.staff_att_id),
            "staff_id": str(att.staff_id),
            "date": att.date.isoformat(),
            "check_in": att.check_in,
            "check_out": att.check_out,
            "method": att.method,
            "status": att.status,
            "substitute_id": str(att.substitute_id) if att.substitute_id else None,
            "geofence_verified": att.geofence_verified,
            "cover_alert_triggered": cover_alert,
        }

    def mark_staff_attendance(
        self,
        data: Dict[str, Any],
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        sub_id = data.get('substitute_id')
        if sub_id:
            violation = self.validate_substitute_availability(sub_id)
            if violation:
                raise BusinessRuleError([violation])

        status = data.get('status', 'Present')
        has_approved_leave = LeaveRequest.objects.filter(
            tenant=self.tenant,
            requester_id=data['staff_id'],
            requester_type='Staff',
            start_date__lte=self.roster_date,
            end_date__gte=self.roster_date,
            status='Approved',
            is_deleted=False,
        ).exists()
        # BR-03-03: Unexcused staff absence triggers cover alert if no substitute assigned
        cover_alert = (status == 'Absent' and not has_approved_leave and not sub_id)

        with transaction.atomic():
            att, _ = StaffAttendance.objects.update_or_create(
                tenant=self.tenant,
                staff_id=data['staff_id'],
                date=self.roster_date,
                defaults={
                    "check_in": data.get('check_in') or '',
                    "check_out": data.get('check_out') or '',
                    "method": data.get('method') or 'Manual',
                    "status": status,
                    "substitute_id": sub_id,
                    "geofence_verified": bool(data.get('geofence_verified', False)),
                    "created_by": actor_id,
                },
            )
            AuditLog.objects.create(
                tenant=self.tenant,
                actor_id=actor_id,
                action='CREATE',
                entity='StaffAttendance',
                entity_id=str(att.staff_att_id),
                new_values=self._serialize_staff_attendance(att, cover_alert=cover_alert),
            )
        return self._serialize_staff_attendance(att, cover_alert=cover_alert)

    @classmethod
    def list_staff_attendance(
        cls,
        tenant_id: uuid.UUID,
        staff_id: Optional[uuid.UUID] = None,
        att_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        qs = StaffAttendance.objects.filter(tenant_id=tenant_id, is_deleted=False).order_by('-date')
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if att_date:
            qs = qs.filter(date=att_date)
        return [cls._serialize_staff_attendance(a, cover_alert=(a.status == 'Absent' and not a.substitute_id)) for a in qs]

    def update_staff_attendance(
        self,
        att: StaffAttendance,
        data: Dict[str, Any],
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        if data.get('substitute_id'):
            violation = self.validate_substitute_availability(data['substitute_id'])
            if violation:
                raise BusinessRuleError([violation])
        with transaction.atomic():
            for field in ('check_in', 'check_out', 'method', 'status', 'substitute_id', 'geofence_verified'):
                if field in data and data[field] is not None:
                    setattr(att, field, data[field])
            att.save()
            cover_alert = (att.status == 'Absent' and not att.substitute_id)
            AuditLog.objects.create(
                tenant=self.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='StaffAttendance',
                entity_id=str(att.staff_att_id),
                new_values=self._serialize_staff_attendance(att, cover_alert=cover_alert),
            )
        return self._serialize_staff_attendance(att, cover_alert=cover_alert)

    @staticmethod
    def create_roster(tenant: Tenant, data: Dict[str, Any], actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        with transaction.atomic():
            roster, _ = AttendanceRoster.objects.update_or_create(
                tenant=tenant,
                class_id=data['class_id'],
                date=data['date'],
                defaults={
                    "window_start": data.get('window_start') or '08:00',
                    "window_end": data.get('window_end') or '10:00',
                    "created_by": actor_id,
                },
            )
        return {
            "roster_id": str(roster.roster_id),
            "class_id": str(roster.class_id),
            "date": roster.date.isoformat(),
            "window_start": roster.window_start,
            "window_end": roster.window_end,
        }

    @staticmethod
    def update_roster(roster: AttendanceRoster, data: Dict[str, Any]) -> Dict[str, Any]:
        for field in ('window_start', 'window_end'):
            if field in data and data[field] is not None:
                setattr(roster, field, data[field])
        roster.save()
        return {
            "roster_id": str(roster.roster_id),
            "class_id": str(roster.class_id),
            "date": roster.date.isoformat(),
            "window_start": roster.window_start,
            "window_end": roster.window_end,
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

    def upsert_health_record(self, data: Dict[str, Any], actor_id: Optional[uuid.UUID] = None) -> StudentHealth:
        with transaction.atomic():
            defaults = {}
            for field in ('allergies', 'conditions', 'medications', 'vaccinations', 'doctor_name', 'doctor_phone', 'consent_flag'):
                if field in data and data[field] is not None:
                    defaults[field] = data[field]
            if data.get('consent_flag') is True:
                defaults['consent_date'] = timezone.now()
            profile, _ = StudentHealth.objects.update_or_create(
                tenant=self.student.tenant,
                student=self.student,
                defaults={**defaults, 'is_deleted': False},
            )
            self.health_profile = profile
            AuditLog.objects.create(
                tenant=self.student.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='StudentHealth',
                entity_id=str(profile.health_id),
                new_values={'consent_flag': profile.consent_flag, 'doctor_name': profile.doctor_name},
            )
        return profile

    def list_observations(self) -> List[Dict[str, Any]]:
        return [
            {
                "obs_id": str(o.obs_id),
                "student_id": str(self.student.student_id),
                "staff_id": str(o.staff_id),
                "date": o.date.isoformat(),
                "mood": o.mood,
                "appetite": o.appetite,
                "nap_duration_mins": o.nap_duration_mins,
                "feeding_notes": o.feeding_notes,
                "general_notes": o.general_notes,
            }
            for o in self.student.health_observations.filter(is_deleted=False).order_by('-date')
        ]

    @staticmethod
    def update_observation(obs: HealthObservation, data: Dict[str, Any], actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        with transaction.atomic():
            for field in ('mood', 'appetite', 'nap_duration_mins', 'feeding_notes', 'general_notes'):
                if field in data and data[field] is not None:
                    setattr(obs, field, data[field])
            obs.save()
            AuditLog.objects.create(
                tenant=obs.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='HealthObservation',
                entity_id=str(obs.obs_id),
                new_values={'mood': obs.mood, 'appetite': obs.appetite},
            )
        return {
            "obs_id": str(obs.obs_id),
            "student_id": str(obs.student_id),
            "date": obs.date.isoformat(),
            "mood": obs.mood,
            "appetite": obs.appetite,
            "nap_duration_mins": obs.nap_duration_mins,
            "feeding_notes": obs.feeding_notes,
            "general_notes": obs.general_notes,
        }

    @staticmethod
    def delete_observation(obs: HealthObservation, actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        with transaction.atomic():
            obs.is_deleted = True
            obs.save(update_fields=['is_deleted', 'updated_at'])
            AuditLog.objects.create(
                tenant=obs.tenant,
                actor_id=actor_id,
                action='DELETE',
                entity='HealthObservation',
                entity_id=str(obs.obs_id),
                new_values={'is_deleted': True},
            )
        return {'obs_id': str(obs.obs_id), 'is_deleted': True}

    def list_medication_logs(self) -> List[Dict[str, Any]]:
        return [
            {
                "med_log_id": str(m.med_log_id),
                "student_id": str(self.student.student_id),
                "staff_id": str(m.staff_id),
                "medicine_name": m.medicine_name,
                "dose": m.dose,
                "time_administered": m.time_administered.isoformat(),
                "parent_notified": m.parent_notified,
                "notes": m.notes,
            }
            for m in self.student.medication_logs.filter(is_deleted=False).order_by('-time_administered')
        ]

    def update_medication_log(self, med_log: MedicationLog, data: Dict[str, Any], actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        violation = self.validate_medication_consent()
        if violation:
            raise BusinessRuleError([violation])
        with transaction.atomic():
            for field in ('medicine_name', 'dose', 'notes', 'parent_notified'):
                if field in data and data[field] is not None:
                    setattr(med_log, field, data[field])
            med_log.save()
            AuditLog.objects.create(
                tenant=med_log.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='MedicationLog',
                entity_id=str(med_log.med_log_id),
                new_values={'medicine_name': med_log.medicine_name, 'dose': med_log.dose},
            )
        return {
            "med_log_id": str(med_log.med_log_id),
            "student_id": str(med_log.student_id),
            "medicine_name": med_log.medicine_name,
            "dose": med_log.dose,
            "time_administered": med_log.time_administered.isoformat(),
            "parent_notified": med_log.parent_notified,
            "notes": med_log.notes,
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
        issues_noted: List[str] = None,
        signed_off: bool = True,
    ) -> SafetyDrill:
        return SafetyDrill.objects.create(
            tenant=tenant,
            drill_type=drill_type,
            scheduled_date=scheduled_date,
            duration_seconds=duration_seconds,
            participation_rate=participation_rate,
            completed_by=completed_by,
            issues_noted=issues_noted or [],
            signed_off=signed_off
        )

    @staticmethod
    def list_drills(tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
        qs = SafetyDrill.objects.filter(tenant_id=tenant_id, is_deleted=False).order_by('-scheduled_date')
        return [
            {
                "drill_id": str(d.drill_id),
                "drill_type": d.drill_type,
                "scheduled_date": d.scheduled_date.isoformat(),
                "duration_seconds": d.duration_seconds,
                "participation_rate": float(d.participation_rate),
                "issues_noted": d.issues_noted or [],
                "signed_off": d.signed_off,
            }
            for d in qs
        ]

    @staticmethod
    def update_or_signoff_drill(
        drill: SafetyDrill,
        data: Dict[str, Any],
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        # BR-07-04: Signed-off safety drills are strictly immutable
        if drill.signed_off:
            raise BusinessRuleError([
                RuleViolation(
                    rule_id='BR-07-04',
                    message="Safety drill record is signed off and strictly immutable. Create a superseding drill record for corrections.",
                    field='signed_off',
                )
            ])
        with transaction.atomic():
            for field in ('duration_seconds', 'participation_rate', 'issues_noted', 'signed_off'):
                if field in data and data[field] is not None:
                    setattr(drill, field, data[field])
            drill.save()
            AuditLog.objects.create(
                tenant=drill.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='SafetyDrill',
                entity_id=str(drill.drill_id),
                new_values={'signed_off': drill.signed_off},
            )
        return {
            "drill_id": str(drill.drill_id),
            "drill_type": drill.drill_type,
            "scheduled_date": drill.scheduled_date.isoformat(),
            "duration_seconds": drill.duration_seconds,
            "participation_rate": float(drill.participation_rate),
            "issues_noted": drill.issues_noted or [],
            "signed_off": drill.signed_off,
        }

    @staticmethod
    def list_incidents(tenant_id: uuid.UUID, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        qs = Incident.objects.filter(tenant_id=tenant_id, is_deleted=False).order_by('-date', '-created_at')
        if severity:
            qs = qs.filter(severity__iexact=severity)
        now = timezone.now()
        results = []
        for inc in qs:
            sla_breached = (not inc.acknowledged_at) and ((now - inc.created_at) > timedelta(hours=1))
            results.append({
                "incident_id": str(inc.incident_id),
                "incident_type": inc.incident_type,
                "severity": inc.severity,
                "date": inc.date.isoformat(),
                "location": inc.location,
                "description": inc.description,
                "actions_taken": inc.actions_taken,
                "acknowledged_by": str(inc.acknowledged_by) if inc.acknowledged_by else None,
                "acknowledged_at": inc.acknowledged_at.isoformat() if inc.acknowledged_at else None,
                "escalated_to_principal": inc.escalated_to_principal,
                "parent_notified": inc.parent_notified,
                "sla_breached": sla_breached,
            })
        return results

    @staticmethod
    def acknowledge_incident(
        incident: Incident,
        data: Dict[str, Any],
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        with transaction.atomic():
            if data.get('acknowledge', True) and not incident.acknowledged_at:
                incident.acknowledged_by = actor_id
                incident.acknowledged_at = timezone.now()
            for field in ('actions_taken', 'escalated_to_principal', 'parent_notified'):
                if field in data and data[field] is not None:
                    setattr(incident, field, data[field])
            incident.save()
            AuditLog.objects.create(
                tenant=incident.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='Incident',
                entity_id=str(incident.incident_id),
                new_values={
                    'acknowledged_by': str(incident.acknowledged_by) if incident.acknowledged_by else None,
                    'escalated_to_principal': incident.escalated_to_principal,
                },
            )
        return {
            "incident_id": str(incident.incident_id),
            "incident_type": incident.incident_type,
            "severity": incident.severity,
            "date": incident.date.isoformat(),
            "location": incident.location,
            "actions_taken": incident.actions_taken,
            "acknowledged_by": str(incident.acknowledged_by) if incident.acknowledged_by else None,
            "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None,
            "escalated_to_principal": incident.escalated_to_principal,
            "parent_notified": incident.parent_notified,
        }

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
