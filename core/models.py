import uuid
from datetime import datetime
from django.db import models, transaction
from django.utils import timezone


class Tenant(models.Model):
    tenant_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)
    type = models.CharField(max_length=50)
    subscription_tier = models.CharField(
        max_length=50,
        default='Basic',
        choices=[('Basic', 'Basic'), ('Standard', 'Standard'), ('Enterprise', 'Enterprise')]
    )
    region = models.CharField(max_length=50)
    config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'core_tenant'

    def __str__(self):
        return self.name


class TenantScopedModel(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True


class TenantSequence(TenantScopedModel):
    """
    Atomic sequence generator per tenant and domain type (e.g. STUDENT, INVOICE).
    Guarantees monotonic, continuous identifiers across distributed workers.
    """
    sequence_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence_type = models.CharField(max_length=50, default='STUDENT')
    year = models.IntegerField(default=datetime.now().year)
    last_value = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'core_tenant_sequence'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'sequence_type', 'year'],
                name='uq_tenant_sequence_type_year'
            )
        ]

    def __str__(self):
        return f"{self.tenant.name} - {self.sequence_type} - {self.year}: {self.last_value}"


def generate_student_number(tenant: Tenant, year: int = None) -> str:
    """
    Thread-safe & transaction-safe generator for human-readable Student Numbers.
    Format: {PREFIX}-{YEAR}-{SEQ:04d} (e.g. 'STU-2026-0001')
    """
    if year is None:
        year = timezone.now().year

    prefix = tenant.config.get('student_id_prefix', 'STU') if tenant.config else 'STU'

    with transaction.atomic():
        seq_obj, _ = TenantSequence.objects.select_for_update().get_or_create(
            tenant=tenant,
            sequence_type='STUDENT',
            year=year,
            defaults={'last_value': 0}
        )
        seq_obj.last_value += 1
        seq_obj.save(update_fields=['last_value', 'updated_at'])
        sequence_num = seq_obj.last_value

    return f"{prefix}-{year}-{sequence_num:04d}"


class Student(TenantScopedModel):
    student_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_number = models.CharField(max_length=50, db_index=True)
    class_id = models.UUIDField(null=True, blank=True)
    name = models.CharField(max_length=255)
    dob = models.DateField()
    grade = models.CharField(max_length=50)
    section = models.CharField(max_length=50, blank=True, default='A')
    class_teacher = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(
        max_length=50,
        default='Inquiry',
        choices=[
            ('Inquiry', 'Inquiry'),
            ('Applied', 'Applied'),
            ('Offered', 'Offered'),
            ('Accepted', 'Accepted'),
            ('Active', 'Active'),
            ('Waitlisted', 'Waitlisted'),
            ('Rejected', 'Rejected'),
            ('Withdrawn', 'Withdrawn')
        ]
    )
    enrolled_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'core_student'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'student_number'],
                name='uq_student_tenant_student_number'
            ),
            models.CheckConstraint(
                check=models.Q(status__in=[
                    'Inquiry', 'Applied', 'Offered', 'Accepted', 'Active', 'Waitlisted', 'Rejected', 'Withdrawn'
                ]),
                name='chk_student_status_enum'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.student_number})"


class Application(TenantScopedModel):
    application_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(
        max_length=50,
        default='Pending',
        choices=[
            ('Pending', 'Pending'),
            ('Under_Review', 'Under Review'),
            ('Offered', 'Offered'),
            ('Accepted', 'Accepted'),
            ('Rejected', 'Rejected'),
            ('Waitlisted', 'Waitlisted'),
            ('Active', 'Active')
        ]
    )
    applied_date = models.DateTimeField(auto_now_add=True)
    decision_date = models.DateTimeField(null=True, blank=True)
    decided_by = models.UUIDField(null=True, blank=True)
    payment_confirmed = models.BooleanField(default=False)
    notification_dispatched = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_application'
        constraints = [
            models.CheckConstraint(
                check=models.Q(status__in=[
                    'Pending', 'Under_Review', 'Offered', 'Accepted', 'Rejected', 'Waitlisted', 'Active'
                ]),
                name='chk_application_status_enum'
            )
        ]

    def __str__(self):
        return f"App {self.application_id} - Student: {self.student.name} ({self.status})"


class Parent(TenantScopedModel):
    parent_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='parents')
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=100)
    phone = models.CharField(max_length=50)
    email = models.EmailField(max_length=255)
    notification_prefs = models.JSONField(default=dict, blank=True)
    media_consent = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_parent'

    def __str__(self):
        return f"{self.name} ({self.relationship} of {self.student.name})"


class EmergencyContact(TenantScopedModel):
    contact_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    relationship = models.CharField(max_length=100)
    medical_consent = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_emergency_contact'

    def __str__(self):
        return f"{self.name} ({self.relationship} of {self.student.name})"


class Document(TenantScopedModel):
    document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=100)  # e.g., birth_certificate, previous_school_records, photo
    file_path = models.CharField(max_length=512)
    verified = models.BooleanField(default=False)
    verified_by = models.UUIDField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_document'

    def __str__(self):
        return f"{self.doc_type} ({'Verified' if self.verified else 'Unverified'})"


class AuditLog(TenantScopedModel):
    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(
        max_length=50,
        choices=[('CREATE', 'CREATE'), ('UPDATE', 'UPDATE'), ('DELETE', 'DELETE')]
    )
    entity = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, null=True, blank=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_audit_log'

    def __str__(self):
        return f"[{self.timestamp}] {self.action} on {self.entity} by {self.actor_id}"


# =====================================================================
# Academic Domain Entities (Sprint 2 / P04)
# =====================================================================

class Curriculum(TenantScopedModel):
    curriculum_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.CharField(max_length=50)
    subjects = models.JSONField(default=list, blank=True)  # [{"code": "MATH", "name": "Mathematics", "topics": ["Algebra", "Geometry"]}]
    learning_outcomes = models.JSONField(default=list, blank=True)  # ["Understand linear equations", "Calculate perimeter"]
    version = models.CharField(max_length=50, default="1.0")
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'core_curriculum'

    def __str__(self):
        return f"{self.grade} Curriculum v{self.version} ({self.tenant.name})"


class AcademicCalendar(TenantScopedModel):
    calendar_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.CharField(max_length=50)  # e.g., "2025-2026"
    terms = models.JSONField(default=list, blank=True)  # [{"name": "Term 1", "start_date": "2025-09-01", "end_date": "2025-12-15"}]
    holidays = models.JSONField(default=list, blank=True)  # ["2025-10-14", "2025-12-25", ...]
    exam_weeks = models.JSONField(default=list, blank=True)  # [{"name": "Midterm", "start_date": "2025-11-01", "end_date": "2025-11-07"}]
    blackout_dates = models.JSONField(default=list, blank=True)  # ["2025-11-01", ...]

    class Meta:
        db_table = 'core_academic_calendar'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'academic_year'],
                name='uq_calendar_tenant_academic_year'
            )
        ]

    def __str__(self):
        return f"Calendar {self.academic_year} ({self.tenant.name})"


class LessonPlan(TenantScopedModel):
    plan_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher_id = models.UUIDField()
    class_id = models.UUIDField()
    curriculum = models.ForeignKey(Curriculum, on_delete=models.CASCADE, related_name='lesson_plans')
    week = models.PositiveIntegerField()
    topic = models.CharField(max_length=255)
    learning_outcomes = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Submitted', 'Submitted'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]
    )
    reviewed_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'core_lesson_plan'
        constraints = [
            models.CheckConstraint(
                check=models.Q(status__in=['Draft', 'Submitted', 'Approved', 'Rejected']),
                name='chk_lesson_plan_status_enum'
            )
        ]

    def __str__(self):
        return f"Week {self.week} - {self.topic} ({self.status})"


class Assignment(TenantScopedModel):
    assignment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher_id = models.UUIDField()
    class_id = models.UUIDField()
    subject = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    submission_tracking = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'core_assignment'
        constraints = [
            models.CheckConstraint(
                check=models.Q(max_marks__gt=0),
                name='chk_assignment_max_marks_positive'
            )
        ]

    def __str__(self):
        return f"{self.title} (Due: {self.due_date})"


class Exam(TenantScopedModel):
    exam_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_id = models.UUIDField()
    calendar = models.ForeignKey(AcademicCalendar, on_delete=models.CASCADE, related_name='exams')
    name = models.CharField(max_length=255)
    exam_type = models.CharField(
        max_length=50,
        default='Unit_Test',
        choices=[('Unit_Test', 'Unit Test'), ('Midterm', 'Midterm'), ('Final', 'Final'), ('Quiz', 'Quiz')]
    )
    date = models.DateField()
    start_time = models.CharField(max_length=10, default="09:00")  # HH:MM format
    end_time = models.CharField(max_length=10, default="12:00")    # HH:MM format
    duration_mins = models.PositiveIntegerField(default=180)
    room = models.CharField(max_length=100, blank=True)
    invigilator_id = models.UUIDField(null=True, blank=True)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Scheduled', 'Scheduled'), ('Conducted', 'Conducted'), ('Published', 'Published')]
    )

    class Meta:
        db_table = 'core_exam'
        constraints = [
            models.CheckConstraint(
                check=models.Q(status__in=['Draft', 'Scheduled', 'Conducted', 'Published']),
                name='chk_exam_status_enum'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.date})"


class MarksRecord(TenantScopedModel):
    marks_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='marks_records')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='marks_records')
    teacher_id = models.UUIDField()
    subject = models.CharField(max_length=100)
    marks = models.DecimalField(max_digits=5, decimal_places=2)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    grade = models.CharField(max_length=10, blank=True)
    locked = models.BooleanField(default=False)
    moderated_by = models.UUIDField(null=True, blank=True)
    moderation_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_marks_record'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'student', 'exam', 'subject'],
                name='uq_marks_record_student_exam_subject'
            ),
            models.CheckConstraint(
                check=models.Q(marks__gte=0),
                name='chk_marks_non_negative'
            )
        ]

    def __str__(self):
        return f"{self.student.name} - {self.subject}: {self.marks}/{self.max_marks} ({self.grade})"


class ReportCard(TenantScopedModel):
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='report_cards')
    calendar = models.ForeignKey(AcademicCalendar, on_delete=models.CASCADE, related_name='report_cards')
    term = models.CharField(max_length=50)
    year = models.IntegerField(default=2026)
    overall_grade = models.CharField(max_length=10)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    subject_grades = models.JSONField(default=list, blank=True)  # [{"subject": "Math", "marks": 88, "max_marks": 100, "grade": "A"}]
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    published_date = models.DateField()
    is_published = models.BooleanField(default=False)
    parent_ack = models.BooleanField(default=False)
    parent_ack_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_report_card'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'student', 'term', 'year'],
                name='uq_report_card_student_term_year'
            )
        ]

    def __str__(self):
        return f"Report Card: {self.student.name} - {self.term} {self.year} (Grade: {self.overall_grade})"


# =====================================================================
# Attendance Domain Entities (Sprint 3 / P03)
# =====================================================================

class StudentAttendance(TenantScopedModel):
    att_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    class_id = models.UUIDField()
    date = models.DateField()
    period = models.CharField(max_length=50, default='Full_Day')
    status = models.CharField(
        max_length=50,
        choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late'), ('Excused', 'Excused')]
    )
    method = models.CharField(
        max_length=50,
        default='Manual',
        choices=[('Manual', 'Manual'), ('QR', 'QR'), ('Biometric', 'Biometric'), ('Web', 'Web')]
    )
    marked_by = models.UUIDField()
    notified_parent = models.BooleanField(default=False)
    locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_student_attendance'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'student', 'class_id', 'date', 'period'],
                name='uq_student_attendance_record'
            ),
            models.CheckConstraint(
                check=models.Q(status__in=['Present', 'Absent', 'Late', 'Excused']),
                name='chk_student_attendance_status_enum'
            )
        ]

    def __str__(self):
        return f"{self.student.name} - {self.date} ({self.status})"


class StaffAttendance(TenantScopedModel):
    staff_att_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_id = models.UUIDField()
    date = models.DateField()
    check_in = models.CharField(max_length=10, blank=True)   # "08:30"
    check_out = models.CharField(max_length=10, blank=True)  # "16:30"
    method = models.CharField(max_length=50, default='Manual')  # QR, Geofence, Manual
    status = models.CharField(
        max_length=50,
        default='Present',
        choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late'), ('Half_Day', 'Half Day'), ('On_Leave', 'On Leave')]
    )
    substitute_id = models.UUIDField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    geofence_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_staff_attendance'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'staff_id', 'date'],
                name='uq_staff_attendance_record'
            )
        ]

    def __str__(self):
        return f"Staff {self.staff_id} - {self.date} ({self.status})"


class LeaveRequest(TenantScopedModel):
    leave_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester_id = models.UUIDField()
    requester_type = models.CharField(max_length=50, choices=[('Student', 'Student'), ('Staff', 'Staff')])
    leave_type = models.CharField(
        max_length=50,
        default='Sick',
        choices=[('Sick', 'Sick'), ('Casual', 'Casual'), ('Annual', 'Annual'), ('Unpaid', 'Unpaid'), ('Emergency', 'Emergency')]
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)
    reason = models.TextField()
    status = models.CharField(
        max_length=50,
        default='Pending',
        choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected'), ('Cancelled', 'Cancelled')]
    )
    approved_by = models.UUIDField(null=True, blank=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    balance_before = models.DecimalField(max_digits=5, decimal_places=1, default=0.0)
    balance_after = models.DecimalField(max_digits=5, decimal_places=1, default=0.0)

    class Meta:
        db_table = 'core_leave_request'
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')),
                name='chk_leave_end_date_gte_start_date'
            )
        ]

    def __str__(self):
        return f"Leave {self.leave_id} ({self.requester_type}: {self.start_date} to {self.end_date})"


class AttendanceRoster(TenantScopedModel):
    roster_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_id = models.UUIDField()
    date = models.DateField()
    window_start = models.CharField(max_length=10, default="08:00")
    window_end = models.CharField(max_length=10, default="10:00")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_attendance_roster'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'class_id', 'date'],
                name='uq_attendance_roster_class_date'
            )
        ]

    def __str__(self):
        return f"Roster {self.class_id} - {self.date} ({self.window_start}-{self.window_end})"


# =====================================================================
# Health & Safety Domain Entities (Sprint 3 / P07)
# =====================================================================

class StudentHealth(TenantScopedModel):
    health_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='health_profile')
    allergies = models.JSONField(default=list, blank=True)  # [{"name": "Peanuts", "severity": "High"}]
    conditions = models.JSONField(default=list, blank=True)  # ["Asthma"]
    medications = models.JSONField(default=list, blank=True)  # [{"name": "Inhaler", "dosage": "2 puffs as needed"}]
    vaccinations = models.JSONField(default=list, blank=True)
    doctor_name = models.CharField(max_length=255, blank=True)
    doctor_phone = models.CharField(max_length=50, blank=True)
    consent_flag = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_student_health'

    def __str__(self):
        return f"Health Profile: {self.student.name} (Consent: {self.consent_flag})"


class HealthObservation(TenantScopedModel):
    obs_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='health_observations')
    staff_id = models.UUIDField()
    date = models.DateField()
    mood = models.CharField(max_length=50, default='Happy')  # Happy, Calm, Fussy, Tired, Unwell
    appetite = models.CharField(max_length=50, default='Good')  # Good, Fair, Poor
    nap_duration_mins = models.PositiveIntegerField(default=0)
    feeding_notes = models.TextField(blank=True)
    general_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'core_health_observation'

    def __str__(self):
        return f"Observation {self.student.name} - {self.date} (Mood: {self.mood})"


class MedicationLog(TenantScopedModel):
    med_log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='medication_logs')
    staff_id = models.UUIDField()
    medicine_name = models.CharField(max_length=255)
    dose = models.CharField(max_length=100)
    time_administered = models.DateTimeField()
    parent_notified = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'core_medication_log'

    def __str__(self):
        return f"Medication: {self.medicine_name} to {self.student.name} at {self.time_administered}"


class Incident(TenantScopedModel):
    incident_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_type = models.CharField(
        max_length=50,
        choices=[('Injury', 'Injury'), ('Allergic_Reaction', 'Allergic Reaction'), ('Behavioral', 'Behavioral'), ('Safeguarding', 'Safeguarding'), ('Facility', 'Facility')]
    )
    severity = models.CharField(
        max_length=50,
        default='Low',
        choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High'), ('Critical', 'Critical')]
    )
    date = models.DateField()
    time = models.CharField(max_length=10, default="12:00")
    location = models.CharField(max_length=255)
    students = models.JSONField(default=list, blank=True)
    staff = models.JSONField(default=list, blank=True)
    description = models.TextField()
    actions_taken = models.TextField()
    acknowledged_by = models.UUIDField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    escalated_to_principal = models.BooleanField(default=False)
    parent_notified = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_incident'

    def __str__(self):
        return f"Incident [{self.severity}] {self.incident_type} at {self.location} ({self.date})"


class SafetyDrill(TenantScopedModel):
    drill_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    drill_type = models.CharField(
        max_length=50,
        choices=[('Fire', 'Fire'), ('Lockdown', 'Lockdown'), ('Earthquake', 'Earthquake'), ('Severe_Weather', 'Severe Weather')]
    )
    scheduled_date = models.DateField()
    duration_seconds = models.PositiveIntegerField(default=120)
    participation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    issues_noted = models.JSONField(default=list, blank=True)
    completed_by = models.UUIDField()
    signed_off = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_safety_drill'

    def __str__(self):
        return f"Safety Drill: {self.drill_type} on {self.scheduled_date} (Signed off: {self.signed_off})"


# =====================================================================
# Billing & Fee Management Domain Entities (Sprint 4 / P02)
# =====================================================================

class FeeStructure(TenantScopedModel):
    fee_struct_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.CharField(max_length=50)
    term = models.CharField(max_length=50)
    components = models.JSONField(default=list, blank=True)  # [{"name": "Tuition", "amount": 1200.00}, ...]
    discount_rules = models.JSONField(default=list, blank=True)
    penalty_rules = models.JSONField(default=dict, blank=True)  # {"grace_period_days": 7, "late_fee_amount": 50.00}
    version = models.CharField(max_length=50, default="1.0")

    class Meta:
        db_table = 'core_fee_structure'

    def __str__(self):
        return f"FeeStructure {self.grade} - {self.term} v{self.version} ({self.tenant.name})"


class Invoice(TenantScopedModel):
    invoice_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='invoices')
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name='invoices')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    invoice_date = models.DateField()
    due_date = models.DateField()
    line_items = models.JSONField(default=list, blank=True)  # [{"description": "Tuition", "amount": 1200.00}]
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Issued', 'Issued'), ('Partially_Paid', 'Partially Paid'), ('Paid', 'Paid'), ('Overdue', 'Overdue'), ('Waived', 'Waived'), ('Cancelled', 'Cancelled')]
    )
    invoice_type = models.CharField(max_length=50, default='Tuition')

    class Meta:
        db_table = 'core_invoice'
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=0),
                name='chk_invoice_total_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(due_date__gte=models.F('invoice_date')),
                name='chk_invoice_due_date_gte_invoice_date'
            ),
            models.CheckConstraint(
                check=models.Q(status__in=['Draft', 'Issued', 'Partially_Paid', 'Paid', 'Overdue', 'Waived', 'Cancelled']),
                name='chk_invoice_status_enum'
            )
        ]

    def __str__(self):
        return f"Invoice {self.invoice_id} ({self.student.name} - ${self.total} [{self.status}])"


class Payment(TenantScopedModel):
    payment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    method = models.CharField(
        max_length=50,
        default='Card',
        choices=[('Card', 'Credit/Debit Card'), ('UPI', 'UPI'), ('Bank_Transfer', 'Bank Transfer'), ('Cash', 'Cash'), ('Cheque', 'Cheque')]
    )
    txn_ref = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=50,
        default='Completed',
        choices=[('Pending', 'Pending'), ('Completed', 'Completed'), ('Failed', 'Failed'), ('Refunded', 'Refunded')]
    )
    receipt_id = models.CharField(max_length=100, blank=True)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    refunded_by = models.UUIDField(null=True, blank=True)
    refund_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_payment'
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='chk_payment_amount_positive'
            )
        ]

    def __str__(self):
        return f"Payment {self.receipt_id} (${self.amount} for Inv {self.invoice_id})"


class DiscountWaiver(TenantScopedModel):
    discount_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='discounts')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='discounts')
    discount_type = models.CharField(
        max_length=50,
        choices=[('Sibling', 'Sibling'), ('Early_Bird', 'Early Bird'), ('Financial_Aid', 'Financial Aid'), ('Staff_Child', 'Staff Child'), ('Discretionary', 'Discretionary')]
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    approved_by = models.UUIDField()
    approval_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_discount_waiver'
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='chk_discount_amount_positive'
            )
        ]

    def __str__(self):
        return f"Discount {self.discount_type}: -${self.amount} on Inv {self.invoice_id}"


class Reconciliation(TenantScopedModel):
    recon_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period = models.CharField(max_length=50)  # e.g., "2025-09"
    total_invoiced = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_outstanding = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discrepancies = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Pending_Review', 'Pending Review'), ('Finalized', 'Finalized')]
    )
    finalized_by = models.UUIDField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_reconciliation'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'period'],
                name='uq_reconciliation_tenant_period'
            )
        ]

    def __str__(self):
        return f"Reconciliation {self.period} - {self.status} ({self.tenant.name})"


# =====================================================================
# HR, Payroll, Procurement, Events & Comms Domain Entities (Sprint 5)
# =====================================================================

class Staff(TenantScopedModel):
    staff_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    dept = models.CharField(max_length=100)
    employment_type = models.CharField(
        max_length=50,
        default='Full_Time',
        choices=[('Full_Time', 'Full Time'), ('Part_Time', 'Part Time'), ('Contract', 'Contract'), ('Temporary', 'Temporary')]
    )
    start_date = models.DateField()
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    certifications = models.JSONField(default=list, blank=True)
    dbs_ref = models.CharField(max_length=100, blank=True)
    dbs_expiry = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_staff'

    def __str__(self):
        return f"{self.name} ({self.role})"


class Contract(TenantScopedModel):
    contract_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_id = models.UUIDField()
    contract_type = models.CharField(max_length=50, default='Standard')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    esigned_at = models.DateTimeField(null=True, blank=True)
    renewal_alert_sent = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_contract'
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')) | models.Q(end_date__isnull=True),
                name='chk_contract_end_date_gte_start_date'
            )
        ]

    def __str__(self):
        return f"Contract {self.contract_id} ({self.staff_id})"


class PayrollRun(TenantScopedModel):
    payroll_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_id = models.UUIDField()
    period = models.CharField(max_length=50)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.JSONField(default=dict, blank=True)
    deductions = models.JSONField(default=dict, blank=True)
    gross = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Approved', 'Approved'), ('Disbursed', 'Disbursed')]
    )
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    leave_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'core_payroll_run'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'staff_id', 'period'],
                name='uq_payroll_staff_period'
            )
        ]

    def __str__(self):
        return f"Payroll {self.period} ({self.staff_id})"


class Appraisal(TenantScopedModel):
    appraisal_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_id = models.UUIDField()
    appraiser_id = models.UUIDField(null=True, blank=True)
    cycle = models.CharField(max_length=50)
    self_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    manager_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    outcome = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Submitted', 'Submitted'), ('Reviewed', 'Reviewed'), ('Closed', 'Closed')]
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'core_appraisal'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'staff_id', 'cycle'],
                name='uq_appraisal_staff_cycle'
            )
        ]

    def __str__(self):
        return f"Appraisal {self.cycle} ({self.staff_id})"


class CPDRecord(TenantScopedModel):
    cpd_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_id = models.UUIDField()
    activity = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=100)
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    mandatory = models.BooleanField(default=False)
    completion_status = models.CharField(
        max_length=50,
        default='Planned',
        choices=[('Planned', 'Planned'), ('In_Progress', 'In Progress'), ('Completed', 'Completed')]
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_cpd_record'

    def __str__(self):
        return f"CPD {self.activity} ({self.staff_id})"


class Vendor(TenantScopedModel):
    vendor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_vendor'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'name'], name='uq_vendor_tenant_name')
        ]

    def __str__(self):
        return self.name


class Requisition(TenantScopedModel):
    requisition_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='requisitions')
    requester_id = models.UUIDField()
    item_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Submitted', 'Submitted'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]
    )
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_requisition'

    def __str__(self):
        return f"Requisition {self.item_name} ({self.status})"


class PurchaseOrder(TenantScopedModel):
    po_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    requisition = models.ForeignKey(Requisition, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    po_number = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expected_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Issued', 'Issued'), ('Received', 'Received'), ('Closed', 'Closed')]
    )
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_purchase_order'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'po_number'], name='uq_purchase_order_tenant_po_number')
        ]

    def __str__(self):
        return self.po_number


class DeliveryRecord(TenantScopedModel):
    delivery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='deliveries')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='deliveries')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    delivered_at = models.DateTimeField(auto_now_add=True)
    received_by = models.UUIDField(null=True, blank=True)
    notes = models.TextField(blank=True)
    accepted = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_delivery_record'

    def __str__(self):
        return f"Delivery {self.delivery_id} ({self.vendor.name})"


class VendorInvoice(TenantScopedModel):
    vendor_invoice_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='vendor_invoices')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_invoices')
    invoice_number = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        default='Pending',
        choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Paid', 'Paid'), ('Blocked', 'Blocked')]
    )
    verified = models.BooleanField(default=False)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_vendor_invoice'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'invoice_number'], name='uq_vendor_invoice_tenant_invoice_number')
        ]

    def __str__(self):
        return self.invoice_number


class Inventory(TenantScopedModel):
    inventory_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    item_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    quantity_on_hand = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_restocked = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'core_inventory'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'item_name'], name='uq_inventory_tenant_item_name')
        ]

    def __str__(self):
        return f"Inventory {self.item_name} ({self.quantity_on_hand})"


class AnalyticsSnapshot(TenantScopedModel):
    snapshot_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    snapshot_date = models.DateField(db_index=True)
    role_scope = models.CharField(
        max_length=50,
        default='admin',
        choices=[('admin', 'Admin'), ('principal', 'Principal'), ('owner', 'Owner')]
    )
    metrics = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'core_analytics_snapshot'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'snapshot_date', 'role_scope'],
                name='uq_analytics_snapshot_tenant_date_role'
            )
        ]

    def __str__(self):
        return f"Snapshot {self.snapshot_date} ({self.role_scope})"


class CustomReport(TenantScopedModel):
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    requested_by = models.UUIDField(null=True, blank=True)
    requested_role = models.CharField(max_length=50, blank=True)
    fields = models.JSONField(default=list, blank=True)
    filters = models.JSONField(default=dict, blank=True)
    group_by = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=50,
        default='Completed',
        choices=[('Queued', 'Queued'), ('Completed', 'Completed'), ('Failed', 'Failed')]
    )
    result = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_custom_report'

    def __str__(self):
        return f"Report {self.name} ({self.status})"


class ReportSchedule(TenantScopedModel):
    schedule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(CustomReport, on_delete=models.CASCADE, related_name='schedules')
    cron_expression = models.CharField(max_length=120)
    active = models.BooleanField(default=True)
    destination = models.CharField(max_length=120, default='email')
    next_run_at = models.DateTimeField(null=True, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_report_schedule'

    def __str__(self):
        return f"Schedule {self.cron_expression} ({'active' if self.active else 'inactive'})"


class WebhookSubscription(TenantScopedModel):
    webhook_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100, db_index=True)
    target_url = models.URLField(max_length=1000)
    secret = models.CharField(max_length=255)
    active = models.BooleanField(default=True)
    retry_limit = models.PositiveIntegerField(default=5)

    class Meta:
        db_table = 'core_webhook_subscription'

    def __str__(self):
        return f"Webhook {self.event_type} -> {self.target_url}"


class WebhookDeliveryAttempt(TenantScopedModel):
    delivery_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name='deliveries')
    event_type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    signature = models.CharField(max_length=255)
    status = models.CharField(
        max_length=50,
        default='Pending',
        choices=[('Pending', 'Pending'), ('Delivered', 'Delivered'), ('Failed', 'Failed')]
    )
    attempt_count = models.PositiveIntegerField(default=1)
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_webhook_delivery_attempt'

    def __str__(self):
        return f"WebhookDelivery {self.event_type} ({self.status})"


class Event(TenantScopedModel):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    event_date = models.DateField()
    registration_deadline = models.DateField()
    location = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    capacity = models.PositiveIntegerField(default=0)
    requires_permission_slip = models.BooleanField(default=True)
    status = models.CharField(
        max_length=50,
        default='Draft',
        choices=[('Draft', 'Draft'), ('Open', 'Open'), ('Closed', 'Closed'), ('Completed', 'Completed')]
    )

    class Meta:
        db_table = 'core_event'

    def __str__(self):
        return self.title


class EventRegistration(TenantScopedModel):
    registration_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    participant_name = models.CharField(max_length=255)
    participant_email = models.EmailField(blank=True)
    participant_phone = models.CharField(max_length=50, blank=True)
    registration_status = models.CharField(
        max_length=50,
        default='Registered',
        choices=[('Registered', 'Registered'), ('Waitlisted', 'Waitlisted'), ('Cancelled', 'Cancelled')]
    )
    permission_slip_received = models.BooleanField(default=False)
    payment_status = models.CharField(
        max_length=50,
        default='Pending',
        choices=[('Pending', 'Pending'), ('Paid', 'Paid'), ('Waived', 'Waived')]
    )

    class Meta:
        db_table = 'core_event_registration'

    def __str__(self):
        return f"{self.participant_name} -> {self.event.title}"


class EventVolunteer(TenantScopedModel):
    volunteer_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='volunteers')
    volunteer_name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    phone = models.CharField(max_length=50, blank=True)
    approved = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'core_event_volunteer'

    def __str__(self):
        return f"{self.volunteer_name} ({self.role})"


class EventReport(TenantScopedModel):
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='report')
    attendees_count = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    summary = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_event_report'

    def __str__(self):
        return f"Report {self.event.title}"


class Message(TenantScopedModel):
    message_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_id = models.UUIDField(null=True, blank=True)
    recipient_role = models.CharField(max_length=100, blank=True)
    channel = models.CharField(
        max_length=50,
        choices=[('SMS', 'SMS'), ('Email', 'Email'), ('Push', 'Push'), ('In_App', 'In App')]
    )
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    trigger_event = models.CharField(max_length=100, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    delivery_status = models.CharField(
        max_length=50,
        default='Queued',
        choices=[('Queued', 'Queued'), ('Sent', 'Sent'), ('Delivered', 'Delivered'), ('Failed', 'Failed')]
    )
    opt_out_ignored = models.BooleanField(default=False)
    delivery_confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'core_message'

    def __str__(self):
        return f"{self.channel} message to {self.recipient_id or self.recipient_role}"


class NotificationRule(TenantScopedModel):
    rule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trigger_event = models.CharField(max_length=100)
    channel = models.CharField(max_length=50, choices=[('SMS', 'SMS'), ('Email', 'Email'), ('Push', 'Push')])
    template_name = models.CharField(max_length=255)
    conditions = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=1)
    emergency = models.BooleanField(default=False)

    class Meta:
        db_table = 'core_notification_rule'
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'trigger_event', 'channel'],
                name='uq_notification_rule_trigger_channel'
            )
        ]

    def __str__(self):
        return f"{self.trigger_event} -> {self.channel}"
