import uuid
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone

from core.models import (
    Tenant, Student, Curriculum, AcademicCalendar,
    LessonPlan, Assignment, Exam, MarksRecord, ReportCard
)
from core.business_objects.academic import (
    AcademicCalendarBO,
    ClassroomPlanBO,
    ExamPackageBO,
    AcademicRecordBO
)
from core.business_objects.base import BusinessRuleError


@pytest.fixture
def sample_calendar(tenant_a):
    return AcademicCalendar.objects.create(
        tenant=tenant_a,
        academic_year="2025-2026",
        terms=[{"name": "Term 1", "start_date": "2025-09-01", "end_date": "2025-12-15"}],
        holidays=["2025-10-14", "2025-12-25"],
        exam_weeks=[{"name": "Midterms", "start_date": "2025-11-01", "end_date": "2025-11-07"}],
        blackout_dates=["2025-11-01"]
    )


@pytest.fixture
def sample_curriculum(tenant_a):
    return Curriculum.objects.create(
        tenant=tenant_a,
        grade="Grade 3",
        version="1.0",
        subjects=[
            {"code": "MATH", "name": "Mathematics", "topics": ["Algebra", "Fractions", "Geometry"]},
            {"code": "SCI", "name": "Science", "topics": ["Ecosystems", "Forces"]}
        ],
        learning_outcomes=["Understand equivalent fractions", "Identify local biomes"]
    )


@pytest.mark.django_db
class TestAcademicCalendarBO:
    def test_holiday_and_blackout_detection(self, sample_calendar):
        bo = AcademicCalendarBO(calendar=sample_calendar)
        assert bo.is_holiday(date(2025, 10, 14)) is True
        assert bo.is_holiday(date(2025, 10, 15)) is False
        assert bo.is_blackout_date(date(2025, 11, 1)) is True

    # ── BR-04-02: Assignment Due Date on Holiday Gate ────────────────
    def test_br_04_02_blocks_date_on_holiday(self, sample_calendar):
        bo = AcademicCalendarBO(calendar=sample_calendar)
        violation = bo.validate_date_window(date(2025, 10, 14), context="assignment")
        assert violation is not None
        assert violation.rule_id == "BR-04-02"


@pytest.mark.django_db
class TestClassroomPlanBO:
    # ── BR-04-01: Curriculum Mapping Gate ────────────────────────────
    def test_br_04_01_passes_with_valid_curriculum_topic(self, tenant_a, sample_curriculum):
        plan = LessonPlan(
            tenant=tenant_a,
            teacher_id=uuid.uuid4(),
            class_id=uuid.uuid4(),
            curriculum=sample_curriculum,
            week=3,
            topic="Fractions",
            learning_outcomes=["Understand equivalent fractions"]
        )
        bo = ClassroomPlanBO(lesson_plan=plan)
        bo.enforce_rules()  # Should not raise

    def test_br_04_01_fails_with_unmapped_topic(self, tenant_a, sample_curriculum):
        plan = LessonPlan(
            tenant=tenant_a,
            teacher_id=uuid.uuid4(),
            class_id=uuid.uuid4(),
            curriculum=sample_curriculum,
            week=3,
            topic="Quantum Computing",  # Not in curriculum
            learning_outcomes=[]
        )
        bo = ClassroomPlanBO(lesson_plan=plan)
        with pytest.raises(BusinessRuleError) as exc:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-04-01" for v in exc.value.violations)


@pytest.mark.django_db
class TestExamPackageBO:
    # ── BR-04-03: Exam Conflict & Overlap Check ──────────────────────
    def test_br_04_03_fails_when_exam_on_holiday(self, tenant_a, sample_calendar):
        class_id = uuid.uuid4()
        exam = Exam(
            tenant=tenant_a,
            calendar=sample_calendar,
            class_id=class_id,
            name="Math Midterm",
            date=date(2025, 10, 14),  # Holiday
            start_time="09:00",
            end_time="11:00"
        )
        bo = ExamPackageBO(exam=exam)
        with pytest.raises(BusinessRuleError) as exc:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-04-03" for v in exc.value.violations)

    def test_br_04_03_fails_when_same_class_exams_overlap(self, tenant_a, sample_calendar):
        class_id = uuid.uuid4()
        # Existing exam from 09:00 to 11:00 on non-holiday date
        Exam.objects.create(
            tenant=tenant_a,
            calendar=sample_calendar,
            class_id=class_id,
            name="Math Exam",
            date=date(2025, 10, 20),
            start_time="09:00",
            end_time="11:00"
        )

        # Overlapping exam on the same day from 10:00 to 12:00
        new_exam = Exam(
            tenant=tenant_a,
            calendar=sample_calendar,
            class_id=class_id,
            name="Science Exam",
            date=date(2025, 10, 20),
            start_time="10:00",
            end_time="12:00"
        )
        bo = ExamPackageBO(exam=new_exam)
        with pytest.raises(BusinessRuleError) as exc:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-04-03" for v in exc.value.violations)

    def test_generate_hall_tickets_for_active_students(self, tenant_a, sample_calendar):
        Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0001",
            name="Alice Walker",
            dob=date(2018, 1, 1),
            grade="Grade 3",
            status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a,
            calendar=sample_calendar,
            class_id=uuid.uuid4(),
            name="History Quiz",
            date=date(2025, 10, 25),
            start_time="09:00",
            end_time="10:00",
            room="Hall B"
        )
        bo = ExamPackageBO(exam=exam)
        tickets = bo.generate_hall_tickets()
        assert len(tickets) >= 1
        assert tickets[0]["student_name"] == "Alice Walker"
        assert tickets[0]["room"] == "Hall B"


@pytest.mark.django_db
class TestAcademicRecordBO:
    # ── BR-04-07: Marks Immutability Gate ────────────────────────────
    def test_br_04_07_blocks_locked_marks_modification_for_teacher(self, tenant_a, sample_calendar):
        student = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0010", name="Bob Smith",
            dob=date(2018, 2, 2), grade="Grade 3", status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a, calendar=sample_calendar, class_id=uuid.uuid4(),
            name="Math Final", date=date(2025, 11, 20)
        )
        teacher_id = uuid.uuid4()

        # Record initial marks and lock
        record = AcademicRecordBO.record_marks(
            tenant=tenant_a, student=student, exam=exam, teacher_id=teacher_id,
            subject="Mathematics", marks=Decimal("85.00"), max_marks=Decimal("100.00")
        )
        record.locked = True
        record.save()

        # Attempt to modify locked record as Teacher -> Fails
        with pytest.raises(BusinessRuleError) as exc:
            AcademicRecordBO.record_marks(
                tenant=tenant_a, student=student, exam=exam, teacher_id=teacher_id,
                subject="Mathematics", marks=Decimal("95.00"), max_marks=Decimal("100.00"),
                actor_role="Teacher"
            )
        assert any(v.rule_id == "BR-04-07" for v in exc.value.violations)

        # Principal CAN override
        updated = AcademicRecordBO.record_marks(
            tenant=tenant_a, student=student, exam=exam, teacher_id=teacher_id,
            subject="Mathematics", marks=Decimal("95.00"), max_marks=Decimal("100.00"),
            actor_role="Principal"
        )
        assert updated.marks == Decimal("95.00")

    # ── BR-04-04: Moderation Sign-off Gate ───────────────────────────
    def test_br_04_04_blocks_report_card_publish_without_moderation(self, tenant_a, sample_calendar):
        student = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0011", name="Clara Oswald",
            dob=date(2018, 3, 3), grade="Grade 3", status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a, calendar=sample_calendar, class_id=uuid.uuid4(),
            name="Science Final", date=date(2025, 11, 22)
        )
        # Record marks WITHOUT moderation
        MarksRecord.objects.create(
            tenant=tenant_a, student=student, exam=exam, teacher_id=uuid.uuid4(),
            subject="Science", marks=Decimal("88.00"), max_marks=Decimal("100.00"),
            moderated_by=None
        )

        bo = AcademicRecordBO(student=student, calendar=sample_calendar)
        bo.generate_report_card(term="Term 1", year=2025, published_date=timezone.now().date())

        with pytest.raises(BusinessRuleError) as exc:
            bo.publish(actor_role="Admin")

        assert any(v.rule_id == "BR-04-04" for v in exc.value.violations)

    # ── BR-04-05: Release Date Gate ──────────────────────────────────
    def test_br_04_05_blocks_early_report_card_publication(self, tenant_a, sample_calendar):
        student = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0012", name="Daniel Jackson",
            dob=date(2018, 4, 4), grade="Grade 3", status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a, calendar=sample_calendar, class_id=uuid.uuid4(),
            name="Art Exam", date=date(2025, 11, 23)
        )
        # Moderate marks
        MarksRecord.objects.create(
            tenant=tenant_a, student=student, exam=exam, teacher_id=uuid.uuid4(),
            subject="Art", marks=Decimal("92.00"), max_marks=Decimal("100.00"),
            moderated_by=uuid.uuid4()
        )

        bo = AcademicRecordBO(student=student, calendar=sample_calendar)
        # Future release date
        future_date = timezone.now().date() + timedelta(days=10)
        bo.generate_report_card(term="Term 1", year=2025, published_date=future_date)

        with pytest.raises(BusinessRuleError) as exc:
            bo.publish(actor_role="Admin")

        assert any(v.rule_id == "BR-04-05" for v in exc.value.violations)

    # ── BR-04-06: Minimum Attendance Threshold Gate ──────────────────
    def test_br_04_06_blocks_publication_when_attendance_below_75_percent(self, tenant_a, sample_calendar):
        student = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0013", name="Eva Green",
            dob=date(2018, 5, 5), grade="Grade 3", status="Active"
        )
        exam = Exam.objects.create(
            tenant=tenant_a, calendar=sample_calendar, class_id=uuid.uuid4(),
            name="Music Exam", date=date(2025, 11, 24)
        )
        MarksRecord.objects.create(
            tenant=tenant_a, student=student, exam=exam, teacher_id=uuid.uuid4(),
            subject="Music", marks=Decimal("90.00"), max_marks=Decimal("100.00"),
            moderated_by=uuid.uuid4()
        )

        bo = AcademicRecordBO(student=student, calendar=sample_calendar)
        # Low attendance: 65.00%
        bo.generate_report_card(
            term="Term 1", year=2025,
            published_date=timezone.now().date(),
            attendance_pct=Decimal("65.00")
        )

        with pytest.raises(BusinessRuleError) as exc:
            bo.publish(actor_role="Admin")

        assert any(v.rule_id == "BR-04-06" for v in exc.value.violations)

        # Principal override passes
        bo.publish(actor_role="Principal")
        assert bo.report_card.is_published is True
