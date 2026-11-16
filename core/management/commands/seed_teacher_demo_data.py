"""Django management command to seed Grade 4B and Grade 5A students, attendance rosters,
health records, and curriculum into the database for the Teacher Portal.
"""

import uuid
from datetime import date
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from core.models import (
    AcademicCalendar,
    AttendanceRoster,
    Curriculum,
    Exam,
    LessonPlan,
    MarksRecord,
    PortalRoleMembership,
    Student,
    StudentAttendance,
    StudentHealth,
    Tenant,
)

DEFAULT_HOMEROOM_CLASS_ID = uuid.UUID("00000000-0000-0000-0000-000000000402")
SECONDARY_STEM_CLASS_ID = uuid.UUID("00000000-0000-0000-0000-000000000501")
DEFAULT_TEACHER_ID = uuid.UUID("00000000-0000-0000-0000-00000000ef01")
DEFAULT_CALENDAR_ID = uuid.UUID("00000000-0000-0000-0000-00000000ca01")
DEFAULT_EXAM_ID = uuid.UUID("00000000-0000-0000-0000-00000000ea01")

GRADE_4B_STUDENTS = [
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005101"),
        "student_number": "STU-4021",
        "name": "Lucas Vance",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 4, 12),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [{"name": "Peanuts", "severity": "Critical"}],
            "conditions": ["Sabrina's Law Anaphylaxis Action Plan"],
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005102"),
        "student_number": "STU-4022",
        "name": "Maya Chen",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 8, 23),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005103"),
        "student_number": "STU-4023",
        "name": "Noah Tremblay",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 1, 30),
        "status": "Active",
        "att_status": "Late",
        "health": {
            "allergies": [{"name": "Cold-air bronchospasm", "severity": "High"}],
            "conditions": ["Moderate Exercise-Induced Asthma"],
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005104"),
        "student_number": "STU-4024",
        "name": "Amara Okafor",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 11, 5),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005105"),
        "student_number": "STU-4025",
        "name": "Sofia Rossi",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 6, 18),
        "status": "Active",
        "att_status": "Absent",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005106"),
        "student_number": "STU-4026",
        "name": "Ethan Patel",
        "grade": "Grade 4",
        "section": "B",
        "dob": date(2016, 9, 14),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [{"name": "Mild Seasonal Pollen", "severity": "Low"}],
            "conditions": [],
        },
    },
]

GRADE_5A_STUDENTS = [
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005201"),
        "student_number": "STU-5011",
        "name": "Leo Miller",
        "grade": "Grade 5",
        "section": "A",
        "dob": date(2015, 3, 14),
        "status": "Active",
        "att_status": "Excused",
        "health": {
            "allergies": [{"name": "Asthma Care Protocol", "severity": "High"}],
            "conditions": ["Asthma"],
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005202"),
        "student_number": "STU-5012",
        "name": "Chloe Bennett",
        "grade": "Grade 5",
        "section": "A",
        "dob": date(2015, 7, 21),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005203"),
        "student_number": "STU-5013",
        "name": "Liam Davies",
        "grade": "Grade 5",
        "section": "A",
        "dob": date(2015, 1, 10),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005204"),
        "student_number": "STU-5014",
        "name": "Zara Khan",
        "grade": "Grade 5",
        "section": "A",
        "dob": date(2015, 10, 8),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000005205"),
        "student_number": "STU-5015",
        "name": "Benjamin Scott",
        "grade": "Grade 5",
        "section": "A",
        "dob": date(2015, 5, 29),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": []},
    },
]


class Command(BaseCommand):
    help = "Seed Grade 4B and Grade 5A students, health profiles, attendance rosters, and lesson plans."

    def handle(self, *args, **options):
        User = get_user_model()
        today = date.today()

        # Prefer demo-school tenant if available, or first tenant
        demo_tenant = Tenant.objects.filter(subdomain="demo-school").first() or Tenant.objects.first()
        tenants = [demo_tenant] if demo_tenant else []
        if not tenants:
            self.stdout.write(self.style.ERROR("No tenants found in the database."))
            return

        for tenant in tenants:
            self.stdout.write(f"Seeding tenant {tenant.name} ({tenant.tenant_id})...")

            # 1. Update/Ensure Teacher User Sarah Jenkins exists
            teacher_user = User.objects.filter(
                username__in=[f"teacher1_{tenant.subdomain}", "teacher1"]
            ).first()
            if teacher_user:
                teacher_user.first_name = "Sarah"
                teacher_user.last_name = "Jenkins"
                teacher_user.email = "sarah.jenkins@purplecubby.example"
                teacher_user.save()

            # 2. Seed Curriculum
            curr_g4, _ = Curriculum.objects.get_or_create(
                tenant=tenant,
                grade="Grade 4",
                defaults={
                    "subjects": [{"code": "LIT-4", "name": "Literacy & Novel Study"}],
                    "learning_outcomes": ["Character Perspective", "Textual Inference"],
                    "version": "1.0",
                },
            )
            curr_g5, _ = Curriculum.objects.get_or_create(
                tenant=tenant,
                grade="Grade 5",
                defaults={
                    "subjects": [{"code": "SCI-5", "name": "Grade 5 Earth Science"}],
                    "learning_outcomes": ["Tectonic Plates", "Crustal Faults"],
                    "version": "1.0",
                },
            )

            # 3. Seed Attendance Rosters for Today
            roster_4b, _ = AttendanceRoster.objects.get_or_create(
                tenant=tenant,
                class_id=DEFAULT_HOMEROOM_CLASS_ID,
                date=today,
                defaults={"window_start": "08:00", "window_end": "10:00"},
            )
            roster_5a, _ = AttendanceRoster.objects.get_or_create(
                tenant=tenant,
                class_id=SECONDARY_STEM_CLASS_ID,
                date=today,
                defaults={"window_start": "09:30", "window_end": "11:30"},
            )

            # 4. Seed Grade 4B Students & Health & Today's Attendance
            for item in GRADE_4B_STUDENTS:
                student, _ = Student.objects.update_or_create(
                    student_id=item["student_id"],
                    defaults={
                        "tenant": tenant,
                        "student_number": f"{tenant.subdomain[:4].upper()}-{item['student_number']}",
                        "name": item["name"],
                        "grade": item["grade"],
                        "section": item["section"],
                        "class_teacher": "Sarah Jenkins",
                        "class_id": DEFAULT_HOMEROOM_CLASS_ID,
                        "status": item["status"],
                        "dob": item["dob"],
                        "enrolled_date": date(2025, 9, 1),
                        "is_deleted": False,
                    },
                )
                if item["health"]:
                    StudentHealth.objects.update_or_create(
                        student=student,
                        defaults={
                            "tenant": tenant,
                            "allergies": item["health"]["allergies"],
                            "conditions": item["health"]["conditions"],
                        },
                    )
                StudentAttendance.objects.update_or_create(
                    tenant=tenant,
                    student=student,
                    class_id=DEFAULT_HOMEROOM_CLASS_ID,
                    date=today,
                    period="Full_Day",
                    defaults={
                        "status": item["att_status"],
                        "method": "Manual",
                        "marked_by": DEFAULT_TEACHER_ID,
                        "notified_parent": item["att_status"] in ("Absent", "Late"),
                        "is_deleted": False,
                    },
                )

            # 5. Seed Grade 5A Students & Health & Today's Attendance
            for item in GRADE_5A_STUDENTS:
                student, _ = Student.objects.update_or_create(
                    student_id=item["student_id"],
                    defaults={
                        "tenant": tenant,
                        "student_number": f"{tenant.subdomain[:4].upper()}-{item['student_number']}",
                        "name": item["name"],
                        "grade": item["grade"],
                        "section": item["section"],
                        "class_teacher": "Sarah Jenkins",
                        "class_id": SECONDARY_STEM_CLASS_ID,
                        "status": item["status"],
                        "dob": item["dob"],
                        "enrolled_date": date(2025, 9, 1),
                        "is_deleted": False,
                    },
                )
                if item["health"]:
                    StudentHealth.objects.update_or_create(
                        student=student,
                        defaults={
                            "tenant": tenant,
                            "allergies": item["health"]["allergies"],
                            "conditions": item["health"]["conditions"],
                        },
                    )
                StudentAttendance.objects.update_or_create(
                    tenant=tenant,
                    student=student,
                    class_id=SECONDARY_STEM_CLASS_ID,
                    date=today,
                    period="Full_Day",
                    defaults={
                        "status": item["att_status"],
                        "method": "Manual",
                        "marked_by": DEFAULT_TEACHER_ID,
                        "notified_parent": item["att_status"] in ("Absent", "Late"),
                        "is_deleted": False,
                    },
                )

            # 6. Seed Lesson Plans
            LessonPlan.objects.update_or_create(
                tenant=tenant,
                class_id=DEFAULT_HOMEROOM_CLASS_ID,
                week=12,
                topic="Period 1: Literacy & Novel Study",
                defaults={
                    "teacher_id": DEFAULT_TEACHER_ID,
                    "curriculum": curr_g4,
                    "learning_outcomes": ["Perspective analysis in historical fiction"],
                    "status": "Approved",
                    "is_deleted": False,
                },
            )
            LessonPlan.objects.update_or_create(
                tenant=tenant,
                class_id=SECONDARY_STEM_CLASS_ID,
                week=12,
                topic="Period 2: Grade 5 Earth Science",
                defaults={
                    "teacher_id": DEFAULT_TEACHER_ID,
                    "curriculum": curr_g5,
                    "learning_outcomes": ["Unit 4: Tectonic Plates & Crustal Faults"],
                    "status": "Approved",
                    "is_deleted": False,
                },
            )

            # 7. Seed Academic Calendar & Exam Marks (DEF-019)
            cal, _ = AcademicCalendar.objects.update_or_create(
                calendar_id=DEFAULT_CALENDAR_ID,
                tenant=tenant,
                defaults={
                    "academic_year": "2025-2026",
                    "terms": [
                        {"name": "Term 1", "start_date": "2025-09-01", "end_date": "2025-12-19"},
                        {"name": "Term 2", "start_date": "2026-01-05", "end_date": "2026-03-31"},
                        {"name": "Term 3", "start_date": "2026-04-06", "end_date": "2026-06-25"},
                    ],
                    "exam_weeks": [
                        {"name": "Midterm", "start_date": "2026-11-03", "end_date": "2026-11-07"}
                    ],
                    "is_deleted": False,
                },
            )
            exam, _ = Exam.objects.update_or_create(
                exam_id=DEFAULT_EXAM_ID,
                tenant=tenant,
                defaults={
                    "calendar": cal,
                    "class_id": DEFAULT_HOMEROOM_CLASS_ID,
                    "name": "Term 2 Mid-Term — Equivalent Fractions & Number Sense",
                    "exam_type": "Midterm",
                    "date": date(2026, 11, 5),
                    "start_time": "09:00",
                    "end_time": "11:00",
                    "duration_mins": 120,
                    "max_marks": 100.00,
                    "status": "Conducted",
                    "is_deleted": False,
                },
            )

            student_scores = [
                (uuid.UUID("00000000-0000-0000-0000-000000005101"), 92.00, "A"),
                (uuid.UUID("00000000-0000-0000-0000-000000005102"), 96.00, "A"),
                (uuid.UUID("00000000-0000-0000-0000-000000005103"), 81.00, "B"),
                (uuid.UUID("00000000-0000-0000-0000-000000005104"), 88.00, "A"),
                (uuid.UUID("00000000-0000-0000-0000-000000005105"), 79.00, "B"),
                (uuid.UUID("00000000-0000-0000-0000-000000005106"), 85.00, "A"),
            ]
            for stu_id, score, grade in student_scores:
                stu = Student.objects.filter(student_id=stu_id, tenant=tenant).first()
                if stu:
                    MarksRecord.objects.update_or_create(
                        tenant=tenant,
                        student=stu,
                        exam=exam,
                        subject="Mathematics",
                        defaults={
                            "teacher_id": DEFAULT_TEACHER_ID,
                            "marks": score,
                            "max_marks": 100.00,
                            "grade": grade,
                            "locked": False,
                            "is_deleted": False,
                        },
                    )

        self.stdout.write(self.style.SUCCESS("Successfully seeded teacher demo data across all tenants!"))
