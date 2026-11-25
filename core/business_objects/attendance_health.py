"""Domain business logic for student/staff attendance, lock windows, leave approvals, medical records, and incident escalations."""

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.hashers import check_password

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, StudentAttendance, StaffAttendance, LeaveRequest,
    AttendanceRoster, StudentHealth, HealthObservation, MedicationLog,
    Incident, SafetyDrill, AcademicCalendar, AuditLog, EmergencyContact, Message
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

    ALLOWED_LATE_REASONS = (
        "Traffic / Transit Delay",
        "Family / Morning Routine",
        "Medical / Appointment",
        "Weather / Road Conditions",
        "Other (Parent Notified)",
    )

    @staticmethod
    def _parse_hhmm(value: str, field_name: str):
        raw = (value or "").strip()
        try:
            return datetime.strptime(raw, "%H:%M").time()
        except ValueError:
            raise BusinessRuleError([
                RuleViolation(
                    rule_id="INVALID_TIME_FORMAT",
                    message=f"{field_name} must use 24-hour HH:MM format (e.g. 09:00).",
                    field=field_name,
                )
            ])

    @classmethod
    def get_attendance_config(cls, tenant: Tenant) -> Dict[str, Any]:
        cfg = (tenant.config or {}).get("attendance_config") or {}
        expected_start = str(cfg.get("expected_start_time") or "09:00")
        grace_minutes = int(cfg.get("grace_period_minutes") if cfg.get("grace_period_minutes") is not None else 15)
        is_configured = bool(cfg.get("is_configured", False))
        try:
            start_t = datetime.strptime(expected_start, "%H:%M").time()
        except ValueError:
            expected_start = "09:00"
            start_t = datetime.strptime("09:00", "%H:%M").time()
        computed_cutoff_dt = datetime.combine(date.today(), start_t) + timedelta(minutes=max(0, grace_minutes))
        computed_cutoff = computed_cutoff_dt.strftime("%H:%M")
        cutoff = str(cfg.get("late_check_in_cutoff") or computed_cutoff)
        return {
            "expected_start_time": expected_start,
            "grace_period_minutes": grace_minutes,
            "late_check_in_cutoff": cutoff,
            "effective_cutoff": cutoff,
            "is_configured": is_configured,
            "updated_at": cfg.get("updated_at"),
            "allowed_late_reasons": list(cls.ALLOWED_LATE_REASONS),
        }

    @classmethod
    def update_attendance_config(
        cls,
        *,
        tenant: Tenant,
        expected_start_time: str,
        grace_period_minutes: int,
        late_check_in_cutoff: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        start_t = cls._parse_hhmm(expected_start_time, "expected_start_time")
        if grace_period_minutes < 0 or grace_period_minutes > 240:
            raise BusinessRuleError([
                RuleViolation(
                    rule_id="INVALID_GRACE_PERIOD",
                    message="grace_period_minutes must be between 0 and 240 minutes.",
                    field="grace_period_minutes",
                )
            ])
        computed_cutoff = (datetime.combine(date.today(), start_t) + timedelta(minutes=grace_period_minutes)).strftime("%H:%M")
        if late_check_in_cutoff is not None and str(late_check_in_cutoff).strip():
            cutoff_t = cls._parse_hhmm(str(late_check_in_cutoff), "late_check_in_cutoff")
            resolved_cutoff = cutoff_t.strftime("%H:%M")
        else:
            resolved_cutoff = computed_cutoff

        with transaction.atomic():
            config_copy = dict(tenant.config or {})
            previous = dict(config_copy.get("attendance_config") or {})
            new_cfg = {
                "expected_start_time": start_t.strftime("%H:%M"),
                "grace_period_minutes": int(grace_period_minutes),
                "late_check_in_cutoff": resolved_cutoff,
                "is_configured": True,
                "updated_at": timezone.now().isoformat(),
                "updated_by": str(actor_id) if actor_id else None,
            }
            config_copy["attendance_config"] = new_cfg
            tenant.config = config_copy
            tenant.save(update_fields=["config", "updated_at"])
            AuditLog.objects.create(
                tenant=tenant,
                actor_id=actor_id,
                action="UPDATE",
                entity="TenantConfig",
                entity_id=str(tenant.tenant_id),
                old_values=previous,
                new_values=new_cfg,
            )
        return cls.get_attendance_config(tenant)

    @classmethod
    def resolve_planned_check_in_time(cls, tenant: Tenant, att_date: date) -> datetime:
        cfg = cls.get_attendance_config(tenant)
        start_t = datetime.strptime(cfg["expected_start_time"], "%H:%M").time()
        naive_dt = datetime.combine(att_date, start_t)
        return timezone.make_aware(naive_dt, timezone.get_current_timezone())

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
    def check_in(
        cls,
        tenant: Tenant,
        student: Student,
        class_id: Optional[uuid.UUID],
        att_date: date,
        actor_id: uuid.UUID,
        actor_role: str = "CareGiver",
        late_reason: Optional[str] = None,
    ) -> StudentAttendance:
        """Idempotently check in a student and persist check_in_at with cutoff + late_reason enforcement."""
        resolved_class_id = class_id or student.class_id or DEFAULT_ATTENDANCE_CLASS_ID
        cleaned_reason = late_reason.strip() if isinstance(late_reason, str) and late_reason.strip() else None
        if cleaned_reason and cleaned_reason not in cls.ALLOWED_LATE_REASONS:
            raise BusinessRuleError([
                RuleViolation(
                    rule_id="INVALID_LATE_REASON",
                    message=f"Late check-in reason must be one of: {', '.join(cls.ALLOWED_LATE_REASONS)}.",
                    field="late_reason",
                )
            ])

        cfg = cls.get_attendance_config(tenant)
        now_local = timezone.localtime(timezone.now())
        is_past_cutoff = False
        if cfg["is_configured"] and att_date == now_local.date():
            cutoff_t = datetime.strptime(cfg["effective_cutoff"], "%H:%M").time()
            if now_local.time().replace(tzinfo=None) > cutoff_t:
                is_past_cutoff = True

        with transaction.atomic():
            existing = StudentAttendance.objects.filter(
                tenant=tenant,
                student=student,
                class_id=resolved_class_id,
                date=att_date,
                period='Full_Day',
                is_deleted=False,
            ).first()
            if existing:
                cls(record=existing, actor_role=actor_role).enforce_rules()
                if existing.status in ('Present', 'Late') and existing.check_in_at is not None:
                    return existing
                if is_past_cutoff and not cleaned_reason:
                    raise BusinessRuleError([
                        RuleViolation(
                            rule_id="LATE_REASON_REQUIRED",
                            message="Check-in past the attendance cutoff requires selecting a Late Check-In Reason.",
                            field="late_reason",
                        )
                    ])
                next_status = 'Late' if (is_past_cutoff or cleaned_reason) else 'Present'
                existing.status = next_status
                existing.check_in_at = existing.check_in_at or timezone.now()
                existing.late_reason = cleaned_reason
                existing.marked_by = actor_id
                existing.save()
                cls._apply_absence_notification(existing)
                return existing

            if is_past_cutoff and not cleaned_reason:
                raise BusinessRuleError([
                    RuleViolation(
                        rule_id="LATE_REASON_REQUIRED",
                        message="Check-in past the attendance cutoff requires selecting a Late Check-In Reason.",
                        field="late_reason",
                    )
                ])

            next_status = 'Late' if (is_past_cutoff or cleaned_reason) else 'Present'
            record = StudentAttendance.objects.create(
                tenant=tenant,
                student=student,
                class_id=resolved_class_id,
                date=att_date,
                period='Full_Day',
                status=next_status,
                method='Web',
                marked_by=actor_id,
                check_in_at=timezone.now(),
                late_reason=cleaned_reason,
            )
            return record

    @classmethod
    def check_out(
        cls,
        tenant: Tenant,
        student: Student,
        class_id: Optional[uuid.UUID],
        att_date: date,
        actor_id: uuid.UUID,
        actor_role: str = "CareGiver",
    ) -> StudentAttendance:
        """Record check_out_at for an already checked-in student (US-CG-01, BR-03-01)."""
        resolved_class_id = class_id or student.class_id or DEFAULT_ATTENDANCE_CLASS_ID
        with transaction.atomic():
            existing = StudentAttendance.objects.filter(
                tenant=tenant,
                student=student,
                class_id=resolved_class_id,
                date=att_date,
                period='Full_Day',
                is_deleted=False,
            ).first()
            if not existing or existing.status not in ('Present', 'Late') or existing.check_in_at is None:
                raise BusinessRuleError([
                    RuleViolation(
                        rule_id="CHECK_OUT_BEFORE_CHECK_IN",
                        message="Cannot check out a student who has not checked in.",
                        field="check_in_at",
                    )
                ])
            cls(record=existing, actor_role=actor_role).enforce_rules()
            if existing.check_out_at is None:
                existing.check_out_at = timezone.now()
                existing.marked_by = actor_id
                existing.save(update_fields=['check_out_at', 'marked_by', 'updated_at'])
            return existing

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

    @classmethod
    def supervisor_override_attendance(
        cls,
        *,
        tenant: Tenant,
        student: Student,
        att_date: date,
        status: str,
        override_reason: str,
        actor_id: Optional[uuid.UUID] = None,
        actor_role: str = 'Admin',
        late_reason: Optional[str] = None,
    ) -> StudentAttendance:
        cleaned_reason = (override_reason or '').strip()
        if not cleaned_reason:
            raise BusinessRuleError([
                RuleViolation(
                    rule_id="OVERRIDE_REASON_REQUIRED",
                    message="Supervisor historical override requires a non-empty override_reason.",
                    field="override_reason",
                )
            ])
        resolved_class_id = student.class_id or DEFAULT_ATTENDANCE_CLASS_ID
        with transaction.atomic():
            existing = StudentAttendance.objects.filter(
                tenant=tenant,
                student=student,
                class_id=resolved_class_id,
                date=att_date,
                period='Full_Day',
                is_deleted=False,
            ).first()
            old_status = existing.status if existing else None
            if existing:
                existing.status = status
                existing.late_reason = late_reason if status == 'Late' else None
                existing.marked_by = actor_id or existing.marked_by
                if status in ('Present', 'Late') and not existing.check_in_at:
                    existing.check_in_at = timezone.now()
                cls._apply_absence_notification(existing)
                existing.save()
                record = existing
            else:
                record = StudentAttendance.objects.create(
                    tenant=tenant,
                    student=student,
                    class_id=resolved_class_id,
                    date=att_date,
                    status=status,
                    method='Manual',
                    period='Full_Day',
                    marked_by=actor_id or uuid.uuid4(),
                    check_in_at=timezone.now() if status in ('Present', 'Late') else None,
                    late_reason=late_reason if status == 'Late' else None,
                    notified_parent=(status == 'Absent'),
                    created_by=actor_id,
                )
            AuditLog.objects.create(
                tenant=tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='StudentAttendance',
                entity_id=str(record.att_id),
                old_values={'status': old_status, 'date': att_date.isoformat()},
                new_values={
                    'event': 'OVERRIDE_PAST_CARE_LOG',
                    'student_id': str(student.student_id),
                    'student_name': student.name,
                    'date': att_date.isoformat(),
                    'status': status,
                    'override_reason': cleaned_reason,
                    'actor_role': actor_role,
                },
            )
        return record

    @classmethod
    def build_roll_audit_trail(
        cls,
        *,
        tenant: Tenant,
        students_qs,
        att_date: date,
        actor_role: str = 'CareGiver',
        class_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        from core.models import PortalRoleMembership

        students = list(students_qs.order_by('grade', 'name'))
        student_map = {s.student_id: s for s in students}
        student_ids = list(student_map.keys())
        student_id_strs = {str(sid) for sid in student_ids}

        records = list(
            StudentAttendance.objects.filter(
                tenant=tenant,
                student_id__in=student_ids,
                date=att_date,
                period='Full_Day',
                is_deleted=False,
            ).select_related('student')
        )
        records_by_student: Dict[uuid.UUID, StudentAttendance] = {}
        att_ids_strs = set()
        for r in records:
            expected_cid = r.student.class_id or DEFAULT_ATTENDANCE_CLASS_ID
            if r.class_id == expected_cid or r.student_id not in records_by_student:
                records_by_student[r.student_id] = r
            att_ids_strs.add(str(r.att_id))

        total_enrolled = len(students)
        present_on_time = 0
        late_arrivals = 0
        checked_out = 0
        unexcused_absent = 0
        excused_count = 0
        not_checked_in = 0

        for s in students:
            rec = records_by_student.get(s.student_id)
            if not rec:
                not_checked_in += 1
            elif rec.check_out_at is not None:
                checked_out += 1
            elif rec.status == 'Late':
                late_arrivals += 1
            elif rec.status == 'Present':
                present_on_time += 1
            elif rec.status == 'Absent':
                unexcused_absent += 1
            elif rec.status in ('Excused', 'On Leave', 'Holiday'):
                excused_count += 1
            else:
                not_checked_in += 1

        accounted_count = total_enrolled - not_checked_in
        completion_percent = int(round((accounted_count / total_enrolled) * 100)) if total_enrolled else 100

        cfg = cls.get_attendance_config(tenant)
        cutoff_str = cfg.get('effective_cutoff') or '09:15'
        try:
            cutoff_t = datetime.strptime(cutoff_str, '%H:%M').time()
        except ValueError:
            cutoff_t = datetime.strptime('09:15', '%H:%M').time()
        tz = timezone.get_current_timezone()
        locks_at = timezone.make_aware(datetime.combine(att_date + timedelta(days=1), cutoff_t), tz)
        now = timezone.now()
        remaining_seconds = max(0, int((locks_at - now).total_seconds()))
        is_locked = (att_date < timezone.localdate() - timedelta(days=1)) or (remaining_seconds == 0)
        locked_in_hours = max(0, int(round(remaining_seconds / 3600)))

        raw_audits = list(
            AuditLog.objects.filter(
                tenant=tenant,
                is_deleted=False,
                entity__in=['StudentAttendance', 'AttendanceRoll', 'EmergencyContact'],
            ).order_by('-timestamp')[:200]
        )
        scoped_audits: List[AuditLog] = []
        for log in raw_audits:
            nv = log.new_values if isinstance(log.new_values, dict) else {}
            if log.entity == 'StudentAttendance':
                if (log.entity_id in att_ids_strs) or (str(nv.get('student_id') or '') in student_id_strs and nv.get('date') == att_date.isoformat()):
                    scoped_audits.append(log)
            elif log.entity == 'EmergencyContact':
                if str(nv.get('student_id') or '') in student_id_strs and timezone.localtime(log.timestamp).date() == att_date:
                    scoped_audits.append(log)
            elif log.entity == 'AttendanceRoll':
                if nv.get('date') == att_date.isoformat():
                    scoped_audits.append(log)

        actor_ids = {r.marked_by for r in records if r.marked_by}
        actor_ids.update({log.actor_id for log in scoped_audits if log.actor_id})
        actor_labels: Dict[str, str] = {}
        if actor_ids:
            for m in PortalRoleMembership.objects.filter(
                tenant=tenant,
                user_id__in=list(actor_ids),
                is_active=True,
            ).select_related('user'):
                full = m.user.get_full_name().strip() or m.user.username
                actor_labels[str(m.user_id)] = f"{full} ({m.role})"

        events: List[Dict[str, Any]] = []
        for r in records:
            actor_label = actor_labels.get(str(r.marked_by), 'Classroom Staff')
            if r.check_in_at:
                is_late = r.status == 'Late'
                events.append({
                    'event_id': f"att-in-{r.att_id}",
                    'category': 'late' if is_late else 'checkin',
                    'timestamp': r.check_in_at.isoformat(),
                    'student_id': str(r.student_id),
                    'student_name': r.student.name,
                    'student_number': r.student.student_number,
                    'grade': r.student.grade,
                    'status': 'Late' if is_late else 'Present',
                    'action_label': 'Late Arrival Check-In' if is_late else 'On-Time Check-In',
                    'actor_label': actor_label,
                    'detail': r.late_reason or f"Arrived before {cutoff_str} cutoff",
                    'notified_parent': bool(r.notified_parent),
                })
            if r.check_out_at:
                events.append({
                    'event_id': f"att-out-{r.att_id}",
                    'category': 'checkout',
                    'timestamp': r.check_out_at.isoformat(),
                    'student_id': str(r.student_id),
                    'student_name': r.student.name,
                    'student_number': r.student.student_number,
                    'grade': r.student.grade,
                    'status': 'Checked Out',
                    'action_label': 'Guardian Check-Out',
                    'actor_label': actor_label,
                    'detail': 'Verified departure logged',
                    'notified_parent': bool(r.notified_parent),
                })
            if r.status == 'Absent' or (not r.check_in_at and not r.check_out_at):
                cat = 'absent' if r.status == 'Absent' else 'checkin'
                events.append({
                    'event_id': f"att-mark-{r.att_id}",
                    'category': cat,
                    'timestamp': r.updated_at.isoformat(),
                    'student_id': str(r.student_id),
                    'student_name': r.student.name,
                    'student_number': r.student.student_number,
                    'grade': r.student.grade,
                    'status': r.status,
                    'action_label': 'Unexcused Absence Alert (BR-03-02)' if r.status == 'Absent' else f"Marked {r.status}",
                    'actor_label': actor_label,
                    'detail': 'Guardian outreach flagged (BR-03-02)' if r.notified_parent else 'Attendance mark recorded',
                    'notified_parent': bool(r.notified_parent),
                })

        overrides_count = 0
        for log in scoped_audits:
            nv = log.new_values if isinstance(log.new_values, dict) else {}
            if log.entity == 'StudentAttendance':
                overrides_count += 1
                sid_val = str(nv.get('student_id') or '')
                stu = student_map.get(uuid.UUID(sid_val)) if sid_val in student_id_strs else None
                events.append({
                    'event_id': f"audit-{log.log_id}",
                    'category': 'override',
                    'timestamp': log.timestamp.isoformat(),
                    'student_id': sid_val,
                    'student_name': nv.get('student_name') or (stu.name if stu else 'Student'),
                    'student_number': stu.student_number if stu else '',
                    'grade': stu.grade if stu else '',
                    'status': nv.get('status') or 'Override',
                    'action_label': f"Supervisor {log.action} Override",
                    'actor_label': actor_labels.get(str(log.actor_id), nv.get('actor_role') or 'Supervisor'),
                    'detail': nv.get('override_reason') or f"Audited attendance change on {nv.get('date', att_date.isoformat())}",
                    'notified_parent': False,
                })
            elif log.entity == 'EmergencyContact':
                sid_val = str(nv.get('student_id') or '')
                stu = student_map.get(uuid.UUID(sid_val)) if sid_val in student_id_strs else None
                events.append({
                    'event_id': f"audit-{log.log_id}",
                    'category': 'checkout',
                    'timestamp': log.timestamp.isoformat(),
                    'student_id': sid_val,
                    'student_name': stu.name if stu else 'Student',
                    'student_number': stu.student_number if stu else '',
                    'grade': stu.grade if stu else '',
                    'status': 'Verified',
                    'action_label': 'Pickup PIN Verification',
                    'actor_label': actor_labels.get(str(log.actor_id), 'Caregiver'),
                    'detail': f"Verified by {nv.get('contact_name', 'Guardian')}",
                    'notified_parent': False,
                })
            elif log.entity == 'AttendanceRoll':
                events.append({
                    'event_id': f"audit-{log.log_id}",
                    'category': 'override',
                    'timestamp': log.timestamp.isoformat(),
                    'student_id': '',
                    'student_name': nv.get('scope_label') or 'Room Roll',
                    'student_number': '',
                    'grade': '',
                    'status': 'Verified',
                    'action_label': 'Roll Audit Confirmed',
                    'actor_label': actor_labels.get(str(log.actor_id), nv.get('role') or 'Staff'),
                    'detail': nv.get('note') or 'Attendance roll verified against classroom roster',
                    'notified_parent': False,
                })

        events.sort(key=lambda item: item['timestamp'], reverse=True)
        is_room_scoped = actor_role in ('CareGiver', 'Caregiver', 'Teacher')
        return {
            'date': att_date.isoformat(),
            'scope_label': 'Room 1A Only' if is_room_scoped else 'All Classrooms (Tenant Scope)',
            'planned_check_in_time': cfg.get('expected_start_time', '09:00'),
            'effective_cutoff': cutoff_str,
            'is_locked': is_locked,
            'locks_at': locks_at.isoformat(),
            'locked_in_hours': locked_in_hours,
            'remaining_seconds': remaining_seconds,
            'total_enrolled': total_enrolled,
            'accounted_count': accounted_count,
            'completion_percent': completion_percent,
            'kpis': {
                'present_on_time': present_on_time,
                'late_arrivals': late_arrivals,
                'checked_out': checked_out,
                'unexcused_absent': unexcused_absent,
                'excused': excused_count,
                'not_checked_in': not_checked_in,
                'overrides_count': overrides_count,
            },
            'events': events,
        }

    @classmethod
    def confirm_roll_audit(
        cls,
        *,
        tenant: Tenant,
        att_date: date,
        actor_id: Optional[uuid.UUID],
        actor_role: str,
        class_id: Optional[uuid.UUID] = None,
        note: str = '',
    ) -> Dict[str, Any]:
        scope_label = 'Room 1A Only' if actor_role in ('CareGiver', 'Caregiver', 'Teacher') else 'All Classrooms'
        audit = AuditLog.objects.create(
            tenant=tenant,
            actor_id=actor_id,
            action='CREATE',
            entity='AttendanceRoll',
            entity_id=f"{att_date.isoformat()}:{class_id or 'scoped'}",
            new_values={
                'event': 'ATTENDANCE_ROLL_VERIFIED',
                'date': att_date.isoformat(),
                'class_id': str(class_id) if class_id else None,
                'role': actor_role,
                'scope_label': scope_label,
                'note': (note or '').strip() or 'Verified live classroom roll lock ledger.',
            },
        )
        return {
            'log_id': str(audit.log_id),
            'date': att_date.isoformat(),
            'verified': True,
            'timestamp': audit.timestamp.isoformat(),
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

    @staticmethod
    def _parse_admin_timestamp(raw_value: Optional[Any]) -> Optional[datetime]:
        if raw_value is None:
            return None
        if isinstance(raw_value, datetime):
            dt = raw_value
        else:
            raw_str = str(raw_value).strip()
            if not raw_str:
                return None
            if len(raw_str) == 5 and ":" in raw_str:
                try:
                    parsed_time = datetime.strptime(raw_str, "%H:%M").time()
                    dt = datetime.combine(timezone.localdate(), parsed_time)
                except ValueError:
                    raise BusinessRuleError([
                        RuleViolation(
                            rule_id="INVALID_TIMESTAMP",
                            message="time_administered must be ISO datetime or HH:MM.",
                            field="time_administered",
                        )
                    ])
            else:
                try:
                    dt = datetime.fromisoformat(raw_str.replace("Z", "+00:00"))
                except ValueError:
                    raise BusinessRuleError([
                        RuleViolation(
                            rule_id="INVALID_TIMESTAMP",
                            message="time_administered must be a valid ISO-8601 datetime or HH:MM.",
                            field="time_administered",
                        )
                    ])
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    def log_medication(
        self,
        staff_id: uuid.UUID,
        medicine_name: str,
        dose: str,
        notes: str = "",
        force: bool = False,
        time_administered: Optional[Any] = None,
        parent_notified: bool = True,
        actor_id: Optional[uuid.UUID] = None,
    ) -> MedicationLog:
        violation = self.validate_medication_consent()
        if violation:
            raise BusinessRuleError([violation])

        admin_dt = self._parse_admin_timestamp(time_administered) or timezone.now()
        target_date = timezone.localtime(admin_dt).date()
        today = timezone.localdate()

        is_admin_override = self.actor_role in ('Admin', 'Administrator', 'Principal', 'Owner')
        if not (is_admin_override and (force or target_date != today)):
            is_absent = StudentAttendance.objects.filter(
                tenant=self.student.tenant,
                student=self.student,
                date=target_date,
                status='Absent',
                is_deleted=False,
            ).exists()
            if is_absent:
                raise BusinessRuleError([
                    RuleViolation(
                        rule_id="BR-07-01-ABSENT",
                        message=f"Skipped (absent): {self.student.name} is marked Absent today.",
                        field="student_id",
                    )
                ])

        if not force:
            already_given = MedicationLog.objects.filter(
                tenant=self.student.tenant,
                student=self.student,
                medicine_name__iexact=medicine_name,
                time_administered__date=target_date,
                is_deleted=False,
            ).exists()
            if already_given:
                raise BusinessRuleError([
                    RuleViolation(
                        rule_id="BR-07-01-DUPLICATE",
                        message=f"{medicine_name} has already been administered to {self.student.name} today.",
                        field="medicine_name",
                    )
                ])

        with transaction.atomic():
            med_log = MedicationLog.objects.create(
                tenant=self.student.tenant,
                student=self.student,
                staff_id=staff_id,
                medicine_name=medicine_name,
                dose=dose,
                time_administered=admin_dt,
                parent_notified=parent_notified,
                notes=notes,
                created_by=actor_id or staff_id,
            )
            AuditLog.objects.create(
                tenant=self.student.tenant,
                actor_id=actor_id or staff_id,
                action='CREATE',
                entity='MedicationLog',
                entity_id=str(med_log.med_log_id),
                new_values={
                    'student_id': str(self.student.student_id),
                    'medicine_name': med_log.medicine_name,
                    'dose': med_log.dose,
                    'time_administered': med_log.time_administered.isoformat(),
                    'parent_notified': med_log.parent_notified,
                },
            )
        return med_log

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
            "medications": self.health_profile.medications if self.health_profile else [],
            "vaccinations": self.health_profile.vaccinations if self.health_profile else [],
            "consent_flag": self.health_profile.consent_flag if self.health_profile else False,
            "consent_date": self.health_profile.consent_date.isoformat() if (self.health_profile and self.health_profile.consent_date) else None,
            "photo_consent": bool(self.health_profile.photo_consent) if self.health_profile else False,
            "topical_consent": bool(self.health_profile.topical_consent) if self.health_profile else False,
            "doctor_name": self.health_profile.doctor_name if self.health_profile else "",
            "doctor_phone": self.health_profile.doctor_phone if self.health_profile else "",
            "recent_observations": obs,
            "recent_medication_logs": meds
        }

    def upsert_health_record(self, data: Dict[str, Any], actor_id: Optional[uuid.UUID] = None) -> StudentHealth:
        with transaction.atomic():
            defaults = {}
            for field in (
                'allergies',
                'conditions',
                'medications',
                'vaccinations',
                'doctor_name',
                'doctor_phone',
                'consent_flag',
                'photo_consent',
                'topical_consent',
            ):
                if field in data and data[field] is not None:
                    defaults[field] = data[field]
            if data.get('consent_flag') is True:
                defaults['consent_date'] = timezone.now()
            elif 'consent_flag' in data and data.get('consent_flag') is False:
                defaults['consent_date'] = None
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
                new_values={
                    'consent_flag': profile.consent_flag,
                    'consent_date': profile.consent_date.isoformat() if profile.consent_date else None,
                    'photo_consent': profile.photo_consent,
                    'topical_consent': profile.topical_consent,
                    'doctor_name': profile.doctor_name,
                },
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
        old_values = {
            'medicine_name': med_log.medicine_name,
            'dose': med_log.dose,
            'notes': med_log.notes,
            'parent_notified': med_log.parent_notified,
            'time_administered': med_log.time_administered.isoformat(),
        }
        with transaction.atomic():
            for field in ('medicine_name', 'dose', 'notes', 'parent_notified'):
                if field in data and data[field] is not None:
                    setattr(med_log, field, data[field])
            if 'time_administered' in data and data['time_administered'] is not None:
                parsed_dt = self._parse_admin_timestamp(data['time_administered'])
                if parsed_dt is not None:
                    med_log.time_administered = parsed_dt
            med_log.save()
            AuditLog.objects.create(
                tenant=med_log.tenant,
                actor_id=actor_id,
                action='UPDATE',
                entity='MedicationLog',
                entity_id=str(med_log.med_log_id),
                old_values=old_values,
                new_values={
                    'medicine_name': med_log.medicine_name,
                    'dose': med_log.dose,
                    'notes': med_log.notes,
                    'parent_notified': med_log.parent_notified,
                    'time_administered': med_log.time_administered.isoformat(),
                },
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

    @staticmethod
    def delete_medication_log(med_log: MedicationLog, actor_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        with transaction.atomic():
            med_log.is_deleted = True
            med_log.save(update_fields=['is_deleted', 'updated_at'])
            AuditLog.objects.create(
                tenant=med_log.tenant,
                actor_id=actor_id,
                action='DELETE',
                entity='MedicationLog',
                entity_id=str(med_log.med_log_id),
                old_values={
                    'student_id': str(med_log.student_id),
                    'medicine_name': med_log.medicine_name,
                    'dose': med_log.dose,
                },
                new_values={'is_deleted': True, 'medicine_name': med_log.medicine_name},
            )
        return {'med_log_id': str(med_log.med_log_id), 'is_deleted': True}


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
        student_name_map = {
            str(s.student_id): s.name
            for s in Student.objects.filter(tenant_id=tenant_id, is_deleted=False)
        }
        now = timezone.now()
        results = []
        for inc in qs:
            sla_breached = (not inc.acknowledged_at) and ((now - inc.created_at) > timedelta(hours=1))
            resolved_students = [
                student_name_map.get(str(s), str(s))
                for s in (inc.students if isinstance(inc.students, list) else [])
            ]
            results.append({
                "incident_id": str(inc.incident_id),
                "incident_type": inc.incident_type,
                "severity": inc.severity,
                "date": inc.date.isoformat(),
                "time": inc.time,
                "location": inc.location,
                "body_part": inc.body_part,
                "students": resolved_students,
                "staff": inc.staff if isinstance(inc.staff, list) else [],
                "description": inc.description,
                "actions_taken": inc.actions_taken,
                "acknowledged_by": str(inc.acknowledged_by) if inc.acknowledged_by else None,
                "acknowledged_at": inc.acknowledged_at.isoformat() if inc.acknowledged_at else None,
                "escalated_to_principal": inc.escalated_to_principal,
                "parent_notified": inc.parent_notified,
                "sla_breached": sla_breached,
                "created_at": inc.created_at.isoformat(),
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

    @staticmethod
    def delete_incident(
        incident: Incident,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        with transaction.atomic():
            incident.is_deleted = True
            incident.save(update_fields=['is_deleted', 'updated_at'])
            AuditLog.objects.create(
                tenant=incident.tenant,
                actor_id=actor_id,
                action='DELETE',
                entity='Incident',
                entity_id=str(incident.incident_id),
                new_values={'is_deleted': True, 'incident_type': incident.incident_type},
            )
        return {'incident_id': str(incident.incident_id), 'is_deleted': True}

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
        actor_id: Optional[uuid.UUID] = None,
        body_part: str = "",
        incident_time: str = "",
    ) -> Incident:
        # BR-07-03: Automatic escalation for High/Critical or Allergic Reaction
        auto_escalate = (severity in ['High', 'Critical'] or incident_type in ['Allergic_Reaction', 'Injury'])
        resolved_time = (incident_time or timezone.localtime().strftime("%H:%M"))[:10]

        incident = Incident.objects.create(
            tenant=tenant,
            incident_type=incident_type,
            severity=severity,
            date=incident_date,
            time=resolved_time,
            location=location,
            body_part=body_part or "",
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


class PickupVerificationError(BusinessRuleError):
    """Domain error for pickup verification gates with explicit HTTP status code."""
    def __init__(self, code: str, message: str, status_code: int = 422, field: str = "pin"):
        self.code = code
        self.status_code = status_code
        super().__init__([RuleViolation(rule_id=code, message=message, field=field)])


class PickupVerificationBO(BaseBusinessObject):
    """
    BO-24: PickupVerification
    Domain: Safeguarding / Pickup Authorization (US-CG-02, BR-01-03)
    """

    @staticmethod
    def list_pickup_contacts(student: Student) -> List[Dict[str, Any]]:
        """Return authorized/restricted pickup contacts for a student, strictly omitting pickup_pin_hash."""
        contacts = EmergencyContact.objects.filter(
            tenant=student.tenant,
            student=student,
            is_deleted=False,
        ).order_by('custody_restricted', 'name')
        now = timezone.now()
        return [
            {
                "contact_id": str(c.contact_id),
                "name": c.name,
                "phone": c.phone,
                "relationship": c.relationship,
                "is_authorized_pickup": c.is_authorized_pickup,
                "photo_url": c.photo_url or "",
                "has_pin": bool(c.pickup_pin_hash),
                "id_check_required": c.id_check_required,
                "custody_restricted": c.custody_restricted,
                "restriction_note": c.restriction_note or "",
                "is_locked": bool(c.pickup_locked_until and c.pickup_locked_until > now),
                "pickup_locked_until": c.pickup_locked_until.isoformat() if c.pickup_locked_until else None,
            }
            for c in contacts
        ]

    @staticmethod
    def verify_pickup(
        student: Student,
        contact_id: uuid.UUID,
        pin: Optional[str] = None,
        id_verified: bool = False,
        admin_override: bool = False,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Verify pickup adult PIN / ID / custody status and log audit trail."""
        contact = EmergencyContact.objects.filter(
            tenant=student.tenant,
            student=student,
            contact_id=contact_id,
            is_deleted=False,
        ).first()
        if not contact:
            raise PickupVerificationError(
                code="CONTACT_NOT_FOUND",
                message="Pickup contact not found for this student.",
                status_code=404,
                field="contact_id",
            )

        if contact.custody_restricted and not admin_override:
            AuditLog.objects.create(
                tenant=student.tenant,
                actor_id=actor_id,
                action='BLOCKED_PICKUP',
                entity='EmergencyContact',
                entity_id=str(contact.contact_id),
                new_values={
                    "student_id": str(student.student_id),
                    "reason": "custody_restricted",
                    "restriction_note": contact.restriction_note,
                },
            )
            raise PickupVerificationError(
                code="CUSTODY_RESTRICTED",
                message=contact.restriction_note or f"Pickup blocked: {contact.name} has a custody restriction.",
                status_code=403,
                field="contact_id",
            )

        if not contact.is_authorized_pickup and not admin_override:
            raise PickupVerificationError(
                code="UNAUTHORIZED_PICKUP",
                message=f"{contact.name} is not listed as an authorized pickup contact.",
                status_code=403,
                field="contact_id",
            )

        now = timezone.now()
        if contact.pickup_locked_until and contact.pickup_locked_until > now and not admin_override:
            raise PickupVerificationError(
                code="PICKUP_LOCKED",
                message="Pickup verification is temporarily locked due to repeated failed PIN attempts. Admin override required.",
                status_code=423,
                field="pin",
            )

        if contact.pickup_pin_hash and not admin_override:
            if not pin or not check_password(pin, contact.pickup_pin_hash):
                contact.failed_pin_attempts = (contact.failed_pin_attempts or 0) + 1
                if contact.failed_pin_attempts >= 3:
                    contact.pickup_locked_until = now + timedelta(minutes=30)
                    contact.save(update_fields=['failed_pin_attempts', 'pickup_locked_until', 'updated_at'])
                    Message.objects.create(
                        tenant=student.tenant,
                        recipient_role='Admin',
                        channel='In_App',
                        trigger_event='PICKUP_PIN_LOCKED',
                        opt_out_ignored=True,
                        subject=f"Pickup PIN Locked: {student.name}",
                        body=(
                            f"3 consecutive failed pickup PIN attempts for {contact.name} "
                            f"({contact.relationship} of {student.name}). Verification locked for 30 minutes."
                        ),
                        created_by=actor_id,
                    )
                    raise PickupVerificationError(
                        code="PICKUP_PIN_LOCKED",
                        message="3 consecutive invalid PIN attempts. Verification locked for 30 minutes and Admin alerted.",
                        status_code=423,
                        field="pin",
                    )
                contact.save(update_fields=['failed_pin_attempts', 'updated_at'])
                raise PickupVerificationError(
                    code="INVALID_PICKUP_PIN",
                    message=f"Invalid pickup PIN ({contact.failed_pin_attempts}/3 attempts).",
                    status_code=403,
                    field="pin",
                )

        if contact.id_check_required and not id_verified and not admin_override and not contact.pickup_pin_hash:
            raise PickupVerificationError(
                code="ID_VERIFICATION_REQUIRED",
                message="Photo ID verification confirmation is required for this pickup contact.",
                status_code=422,
                field="id_verified",
            )

        contact.failed_pin_attempts = 0
        contact.pickup_locked_until = None
        contact.save(update_fields=['failed_pin_attempts', 'pickup_locked_until', 'updated_at'])

        AuditLog.objects.create(
            tenant=student.tenant,
            actor_id=actor_id,
            action='PICKUP_VERIFIED',
            entity='EmergencyContact',
            entity_id=str(contact.contact_id),
            new_values={
                "student_id": str(student.student_id),
                "contact_name": contact.name,
                "admin_override": admin_override,
                "id_verified": id_verified,
            },
        )
        return {
            "verified": True,
            "student_id": str(student.student_id),
            "contact_id": str(contact.contact_id),
            "contact_name": contact.name,
            "relationship": contact.relationship,
            "verified_at": now.isoformat(),
            "admin_override": admin_override,
        }
