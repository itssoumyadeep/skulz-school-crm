import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, Curriculum, AcademicCalendar,
    LessonPlan, Assignment, Exam, MarksRecord, ReportCard, AuditLog
)


def calculate_grade_letter(percentage: float) -> str:
    if percentage >= 90:
        return "A+"
    elif percentage >= 80:
        return "A"
    elif percentage >= 70:
        return "B"
    elif percentage >= 60:
        return "C"
    elif percentage >= 50:
        return "D"
    else:
        return "F"


def calculate_gpa(percentage: float) -> Decimal:
    # 4.0 scale
    gpa = min(Decimal("4.00"), Decimal(str(round((percentage / 100) * 4.0, 2))))
    return gpa


class AcademicCalendarBO(BaseBusinessObject):
    """
    BO-03: AcademicCalendar
    Domain: Academic
    Single source of truth for date validation across all 10 processes.
    """
    def __init__(self, calendar: AcademicCalendar, actor_role: str = 'Admin'):
        self.calendar = calendar
        self.actor_role = actor_role

    def is_holiday(self, target_date: date) -> bool:
        date_str = target_date.isoformat() if isinstance(target_date, (date, datetime)) else str(target_date)
        return date_str in (self.calendar.holidays or [])

    def is_blackout_date(self, target_date: date) -> bool:
        date_str = target_date.isoformat() if isinstance(target_date, (date, datetime)) else str(target_date)
        return date_str in (self.calendar.blackout_dates or [])

    def validate_date_window(self, target_date: date, context: str = "operation") -> Optional[RuleViolation]:
        if self.is_holiday(target_date):
            return RuleViolation(
                rule_id="BR-04-02",
                message=f"Cannot schedule {context}: {target_date} is a configured school holiday.",
                field="date"
            )
        if self.is_blackout_date(target_date):
            return RuleViolation(
                rule_id="BR-04-02",
                message=f"Cannot schedule {context}: {target_date} falls in a calendar blackout period.",
                field="date"
            )
        return None

    def validate_exam_overlap(self, class_id: uuid.UUID, exam_date: date, start_time: str, end_time: str, exclude_exam_id: Optional[uuid.UUID] = None) -> Optional[RuleViolation]:
        existing_exams = Exam.objects.filter(
            calendar=self.calendar,
            class_id=class_id,
            date=exam_date,
            is_deleted=False
        )
        if exclude_exam_id:
            existing_exams = existing_exams.exclude(exam_id=exclude_exam_id)

        for exam in existing_exams:
            # Check time overlap: (StartA < EndB) and (EndA > StartB)
            if (start_time < exam.end_time) and (end_time > exam.start_time):
                return RuleViolation(
                    rule_id="BR-04-03",
                    message=f"Exam time conflict: '{exam.name}' is already scheduled on {exam_date} ({exam.start_time} - {exam.end_time}) for this class.",
                    field="time"
                )
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "AcademicCalendar",
            "calendar_id": str(self.calendar.calendar_id),
            "academic_year": self.calendar.academic_year,
            "terms": self.calendar.terms,
            "holidays": self.calendar.holidays,
            "exam_weeks": self.calendar.exam_weeks,
            "blackout_dates": self.calendar.blackout_dates
        }


class ClassroomPlanBO(BaseBusinessObject):
    """
    BO-05: ClassroomPlan
    Domain: Academic
    Source Entities: LESSON_PLAN, ASSIGNMENT, CURRICULUM
    """
    def __init__(self, lesson_plan: Optional[LessonPlan] = None, assignment: Optional[Assignment] = None, actor_role: str = 'Teacher'):
        self.lesson_plan = lesson_plan
        self.assignment = assignment
        self.actor_role = actor_role

    # ── BR-04-01: Lesson Plan Mapping Gate ───────────────────────────
    def validate_BR_04_01(self) -> Optional[RuleViolation]:
        if not self.lesson_plan:
            return None

        curriculum = self.lesson_plan.curriculum
        valid_topics = []
        for s in (curriculum.subjects or []):
            valid_topics.extend(s.get('topics', []))

        all_valid = set(valid_topics + (curriculum.learning_outcomes or []))

        # Check if topic or any outcome matches curriculum
        matched = (self.lesson_plan.topic in all_valid) or any(
            outcome in all_valid for outcome in (self.lesson_plan.learning_outcomes or [])
        )
        if not matched and all_valid:
            return RuleViolation(
                rule_id="BR-04-01",
                message=f"Lesson plan topic '{self.lesson_plan.topic}' must map to an approved curriculum topic or learning outcome.",
                field="topic"
            )
        return None

    @classmethod
    def create_lesson_plan(
        cls,
        tenant: Tenant,
        teacher_id: uuid.UUID,
        curriculum: Curriculum,
        class_id: uuid.UUID,
        week: int,
        topic: str,
        learning_outcomes: List[str],
        actor_role: str = 'Teacher',
    ) -> LessonPlan:
        lesson_plan = LessonPlan(
            tenant=tenant,
            teacher_id=teacher_id,
            class_id=class_id,
            curriculum=curriculum,
            week=week,
            topic=topic,
            learning_outcomes=learning_outcomes,
            status='Draft',
        )
        bo = cls(lesson_plan=lesson_plan, actor_role=actor_role)
        bo.enforce_rules()
        lesson_plan.save()
        return lesson_plan

    @classmethod
    def create_assignment(
        cls,
        tenant: Tenant,
        teacher_id: uuid.UUID,
        class_id: uuid.UUID,
        subject: str,
        title: str,
        description: str,
        due_date: date,
        max_marks: Decimal,
        calendar: Optional[AcademicCalendar] = None,
        actor_role: str = 'Teacher',
    ) -> Assignment:
        if calendar:
            cal_bo = AcademicCalendarBO(calendar, actor_role=actor_role)
            date_violation = cal_bo.validate_date_window(due_date, context='assignment')
            if date_violation:
                raise BusinessRuleError([date_violation])

        assignment = Assignment.objects.create(
            tenant=tenant,
            teacher_id=teacher_id,
            class_id=class_id,
            subject=subject,
            title=title,
            description=description,
            due_date=due_date,
            max_marks=max_marks,
        )
        return assignment

    def to_dict(self) -> Dict[str, Any]:
        res = {"bo": "ClassroomPlan"}
        if self.lesson_plan:
            res["lesson_plan"] = {
                "plan_id": str(self.lesson_plan.plan_id),
                "week": self.lesson_plan.week,
                "topic": self.lesson_plan.topic,
                "learning_outcomes": self.lesson_plan.learning_outcomes,
                "status": self.lesson_plan.status,
                "curriculum_version": self.lesson_plan.curriculum.version
            }
        if self.assignment:
            res["assignment"] = {
                "assignment_id": str(self.assignment.assignment_id),
                "subject": self.assignment.subject,
                "title": self.assignment.title,
                "due_date": self.assignment.due_date.isoformat(),
                "max_marks": float(self.assignment.max_marks)
            }
        return res


class ExamPackageBO(BaseBusinessObject):
    """
    BO-06: ExamPackage
    Domain: Academic
    Source Entities: EXAM, ACADEMIC_CALENDAR, MARKS_RECORD
    """
    def __init__(self, exam: Exam, calendar_bo: Optional[AcademicCalendarBO] = None, actor_role: str = 'Teacher'):
        self.exam = exam
        self.calendar_bo = calendar_bo or AcademicCalendarBO(exam.calendar, actor_role=actor_role)
        self.actor_role = actor_role

    # ── BR-04-03: Exam Schedule Conflict & Holiday Check ─────────────
    def validate_BR_04_03(self) -> Optional[List[RuleViolation]]:
        violations = []
        date_violation = self.calendar_bo.validate_date_window(self.exam.date, context=f"exam '{self.exam.name}'")
        if date_violation:
            violations.append(RuleViolation(
                rule_id="BR-04-03",
                message=date_violation.message,
                field="date"
            ))

        overlap_violation = self.calendar_bo.validate_exam_overlap(
            class_id=self.exam.class_id,
            exam_date=self.exam.date,
            start_time=self.exam.start_time,
            end_time=self.exam.end_time,
            exclude_exam_id=self.exam.exam_id if self.exam.pk else None
        )
        if overlap_violation:
            violations.append(overlap_violation)

        return violations if violations else None

    @classmethod
    def create_exam(
        cls,
        tenant: Tenant,
        calendar: AcademicCalendar,
        class_id: uuid.UUID,
        name: str,
        exam_type: str,
        exam_date: date,
        start_time: str,
        end_time: str,
        duration_mins: int,
        room: str,
        max_marks: Decimal,
        actor_role: str = 'Admin',
    ) -> Exam:
        exam = Exam(
            tenant=tenant,
            calendar=calendar,
            class_id=class_id,
            name=name,
            exam_type=exam_type,
            date=exam_date,
            start_time=start_time,
            end_time=end_time,
            duration_mins=duration_mins,
            room=room,
            max_marks=max_marks,
            status='Scheduled',
        )
        bo = cls(exam=exam, actor_role=actor_role)
        bo.enforce_rules()
        exam.save()
        return exam

    def generate_hall_tickets(self) -> List[Dict[str, Any]]:
        # Enrolled / Active students
        students = Student.objects.filter(
            tenant=self.exam.tenant,
            status='Active',
            is_deleted=False
        )
        return [
            {
                "student_id": str(s.student_id),
                "student_number": s.student_number,
                "student_name": s.name,
                "exam_id": str(self.exam.exam_id),
                "exam_name": self.exam.name,
                "date": self.exam.date.isoformat(),
                "start_time": self.exam.start_time,
                "end_time": self.exam.end_time,
                "room": self.exam.room
            }
            for s in students
        ]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "ExamPackage",
            "exam_id": str(self.exam.exam_id),
            "name": self.exam.name,
            "exam_type": self.exam.exam_type,
            "date": self.exam.date.isoformat(),
            "start_time": self.exam.start_time,
            "end_time": self.exam.end_time,
            "duration_mins": self.exam.duration_mins,
            "room": self.exam.room,
            "max_marks": float(self.exam.max_marks),
            "status": self.exam.status,
            "marks_count": self.exam.marks_records.filter(is_deleted=False).count()
        }


class AcademicRecordBO(BaseBusinessObject):
    """
    BO-04: AcademicRecord
    Domain: Academic
    Source Entities: MARKS_RECORD, REPORT_CARD, ASSIGNMENT, CURRICULUM
    """
    def __init__(
        self,
        student: Student,
        calendar: AcademicCalendar,
        report_card: Optional[ReportCard] = None,
        actor_role: str = 'Admin'
    ):
        self.student = student
        self.calendar = calendar
        self.report_card = report_card
        self.actor_role = actor_role

    # ── BR-04-04: Moderation Sign-off Gate ───────────────────────────
    def validate_BR_04_04(self) -> Optional[RuleViolation]:
        if not self.report_card or not self.report_card.is_published:
            return None

        # Check that all associated marks records have been moderated
        unmoderated = MarksRecord.objects.filter(
            student=self.student,
            exam__calendar=self.calendar,
            moderated_by__isnull=True,
            is_deleted=False
        ).exists()
        if unmoderated:
            return RuleViolation(
                rule_id="BR-04-04",
                message="Cannot publish report card: one or more marks records have not received Principal/VP moderation sign-off.",
                field="moderation"
            )
        return None

    # ── BR-04-05: Release Date Gate ──────────────────────────────────
    def validate_BR_04_05(self) -> Optional[RuleViolation]:
        if not self.report_card or not self.report_card.is_published:
            return None

        current_date = timezone.now().date()
        if self.report_card.published_date > current_date and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id="BR-04-05",
                message=f"Cannot publish report card early: release date is configured for {self.report_card.published_date}.",
                field="published_date"
            )
        return None

    # ── BR-04-06: Attendance Minimum Threshold Gate ──────────────────
    def validate_BR_04_06(self) -> Optional[RuleViolation]:
        if not self.report_card or not self.report_card.is_published:
            return None

        if self.report_card.attendance_percentage < Decimal("75.00") and self.actor_role not in ['Principal', 'Owner']:
            return RuleViolation(
                rule_id="BR-04-06",
                message=f"Report card publication blocked: attendance ({self.report_card.attendance_percentage}%) is below 75% threshold.",
                field="attendance_percentage"
            )
        return None

    @classmethod
    def record_marks(
        cls,
        tenant: Tenant,
        student: Student,
        exam: Exam,
        teacher_id: uuid.UUID,
        subject: str,
        marks: Decimal,
        max_marks: Decimal,
        actor_role: str = 'Teacher'
    ) -> MarksRecord:
        """
        Records or updates marks for a student. Enforces immutability rule BR-04-07.
        """
        with transaction.atomic():
            existing = MarksRecord.objects.filter(
                tenant=tenant,
                student=student,
                exam=exam,
                subject=subject,
                is_deleted=False
            ).first()

            if existing and existing.locked and actor_role not in ['Principal', 'Owner']:
                raise BusinessRuleError([
                    RuleViolation(
                        rule_id="BR-04-07",
                        message="Marks record is locked after moderation. Modifications require Principal authorization.",
                        field="locked"
                    )
                ])

            percentage = float((marks / max_marks) * 100) if max_marks > 0 else 0
            grade = calculate_grade_letter(percentage)

            if existing:
                existing.marks = marks
                existing.max_marks = max_marks
                existing.grade = grade
                existing.teacher_id = teacher_id
                existing.save()
                record = existing
            else:
                record = MarksRecord.objects.create(
                    tenant=tenant,
                    student=student,
                    exam=exam,
                    teacher_id=teacher_id,
                    subject=subject,
                    marks=marks,
                    max_marks=max_marks,
                    grade=grade
                )

            return record

    def generate_report_card(
        self,
        term: str,
        year: int,
        published_date: date,
        attendance_pct: Decimal = Decimal("100.00"),
        actor_id: Optional[uuid.UUID] = None
    ) -> ReportCard:
        """
        Compiles all marks records for the term and computes GPA & overall grade.
        """
        marks_records = MarksRecord.objects.filter(
            tenant=self.student.tenant,
            student=self.student,
            exam__calendar=self.calendar,
            is_deleted=False
        )

        subject_grades = []
        total_pct = 0.0
        count = 0

        for m in marks_records:
            pct = float((m.marks / m.max_marks) * 100) if m.max_marks > 0 else 0
            subject_grades.append({
                "subject": m.subject,
                "marks": float(m.marks),
                "max_marks": float(m.max_marks),
                "percentage": pct,
                "grade": m.grade or calculate_grade_letter(pct)
            })
            total_pct += pct
            count += 1

        avg_pct = (total_pct / count) if count > 0 else 0.0
        overall_grade = calculate_grade_letter(avg_pct)
        gpa = calculate_gpa(avg_pct)

        with transaction.atomic():
            report_card, _ = ReportCard.objects.update_or_create(
                tenant=self.student.tenant,
                student=self.student,
                calendar=self.calendar,
                term=term,
                year=year,
                defaults={
                    "overall_grade": overall_grade,
                    "gpa": gpa,
                    "subject_grades": subject_grades,
                    "attendance_percentage": attendance_pct,
                    "published_date": published_date,
                    "is_published": False,
                    "created_by": actor_id
                }
            )
            self.report_card = report_card

        return report_card

    def publish(self, actor_id: Optional[uuid.UUID] = None, actor_role: str = 'Admin') -> None:
        if not self.report_card:
            raise ValueError("No report card assigned to publish.")

        self.actor_role = actor_role
        self.report_card.is_published = True

        # Enforce all business rules
        self.enforce_rules()

        self.report_card.save(update_fields=['is_published', 'updated_at'])

        AuditLog.objects.create(
            tenant=self.student.tenant,
            actor_id=actor_id,
            action='UPDATE',
            entity='ReportCard',
            entity_id=str(self.report_card.report_id),
            new_values={"is_published": True, "published_date": self.report_card.published_date.isoformat()}
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "AcademicRecord",
            "student_id": str(self.student.student_id),
            "student_number": self.student.student_number,
            "student_name": self.student.name,
            "calendar_id": str(self.calendar.calendar_id),
            "academic_year": self.calendar.academic_year,
            "report_card": {
                "report_id": str(self.report_card.report_id),
                "term": self.report_card.term,
                "year": self.report_card.year,
                "overall_grade": self.report_card.overall_grade,
                "gpa": float(self.report_card.gpa),
                "attendance_percentage": float(self.report_card.attendance_percentage),
                "is_published": self.report_card.is_published,
                "published_date": self.report_card.published_date.isoformat(),
                "subject_grades": self.report_card.subject_grades
            } if self.report_card else None
        }
