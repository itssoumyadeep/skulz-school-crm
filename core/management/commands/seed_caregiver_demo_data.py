"""Django management command to seed Room 1A Sunflowers Toddler & Pre-K cohort,
attendance roster, health records, caregiver profile, and incident logs.
"""

import uuid
from datetime import date, datetime, timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from core.models import (
    AttendanceRoster,
    Incident,
    MedicationLog,
    PortalRoleMembership,
    Student,
    StudentAttendance,
    StudentHealth,
    Tenant,
)

ROOM_1A_CLASS_ID = uuid.UUID("00000000-0000-0000-0000-0000000001a0")
NURSE_CLARA_USER_ID = uuid.UUID("00000000-0000-0000-0000-00000000c101")

SUNFLOWERS_TODDLER_STUDENTS = [
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007101"),
        "student_number": "SUN-1001",
        "name": "Maya Lin",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 9, 15),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [{"name": "Amoxicillin Allergy Check", "severity": "Medium"}],
            "conditions": ["Active Prescription Schedule"],
            "medications": [
                {
                    "name": "Amoxicillin 125mg/5mL Suspension",
                    "dosage": "5.0 mL with almond milk",
                    "scheduled_time": "11:30 AM",
                    "consent": "Verified by Elena R. (Mother)",
                    "status": "Pending",
                }
            ],
            "consent_flag": True,
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007102"),
        "student_number": "SUN-1002",
        "name": "Leo Vance",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 2, 10),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [{"name": "Mild Seasonal Pollen", "severity": "Low"}],
            "conditions": ["Mild Asthma Protocol"],
            "medications": [
                {
                    "name": "Salbutamol Inhaler (100mcg)",
                    "dosage": "2 puffs via spacer before nap",
                    "scheduled_time": "01:00 PM",
                    "consent": "Verified by David Vance (Father)",
                    "status": "Completed",
                }
            ],
            "consent_flag": True,
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007103"),
        "student_number": "SUN-1003",
        "name": "Zoe Zhao",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 6, 20),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [{"name": "Sesame Alert", "severity": "High"}],
            "conditions": ["Forehead Bump Observation"],
            "medications": [],
            "consent_flag": True,
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007104"),
        "student_number": "SUN-1004",
        "name": "Noah Parker",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 11, 12),
        "status": "Active",
        "att_status": "Absent",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": False},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007105"),
        "student_number": "SUN-1005",
        "name": "Liam Scott",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 4, 18),
        "status": "Active",
        "att_status": "Present",
        "health": {
            "allergies": [],
            "conditions": ["Right Knee Playground Scrape"],
            "medications": [],
            "consent_flag": True,
        },
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007106"),
        "student_number": "SUN-1006",
        "name": "Mia Anderson",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 10, 4),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007107"),
        "student_number": "SUN-1007",
        "name": "Oliver Queen",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 8, 14),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007108"),
        "student_number": "SUN-1008",
        "name": "Emma Watson",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 5, 19),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007109"),
        "student_number": "SUN-1009",
        "name": "Lucas Miller",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 3, 25),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007110"),
        "student_number": "SUN-1010",
        "name": "Sophia Garcia",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 7, 30),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007111"),
        "student_number": "SUN-1011",
        "name": "Ethan Brown",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 9, 2),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007112"),
        "student_number": "SUN-1012",
        "name": "Ava Johnson",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 12, 11),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007113"),
        "student_number": "SUN-1013",
        "name": "Jackson Lee",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 1, 22),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007114"),
        "student_number": "SUN-1014",
        "name": "Isabella Davis",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 4, 5),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007115"),
        "student_number": "SUN-1015",
        "name": "James Wilson",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 10, 18),
        "status": "Active",
        "att_status": "Present",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": True},
    },
    {
        "student_id": uuid.UUID("00000000-0000-0000-0000-000000007116"),
        "student_number": "SUN-1016",
        "name": "Charlotte Taylor",
        "grade": "Toddler & Pre-K",
        "section": "Room 1A",
        "dob": date(2022, 6, 8),
        "status": "Active",
        "att_status": "Absent",
        "health": {"allergies": [], "conditions": [], "medications": [], "consent_flag": False},
    },
]


class Command(BaseCommand):
    help = "Seed Room 1A Sunflowers Toddler cohort, Nurse Clara Gomez caregiver role, attendance, and incidents."

    def handle(self, *args, **options):
        User = get_user_model()
        today = date.today()

        tenants = list(Tenant.objects.all())
        if not tenants:
            self.stdout.write(self.style.ERROR("No tenants found in the database."))
            return

        for demo_tenant in tenants:
            self.stdout.write(f"Seeding Caregiver demo data for tenant {demo_tenant.name} ({demo_tenant.tenant_id})...")

            # 1. Provision / Update Nurse Clara Gomez
            caregiver_usernames = [
                f"caregiver1_{demo_tenant.subdomain}",
                "caregiver1",
                "clara.gomez",
                "clara_gomez",
            ]
            caregiver_user = None
            for username in caregiver_usernames:
                user = User.objects.filter(username=username).first()
                if user:
                    caregiver_user = user
                    break

            if not caregiver_user:
                primary_username = f"caregiver1_{demo_tenant.subdomain}"
                caregiver_user, _ = User.objects.get_or_create(
                    username=primary_username,
                    defaults={
                        "first_name": "Clara",
                        "last_name": "Gomez",
                        "email": "clara.gomez@purplecubby.example",
                        "is_active": True,
                    },
                )
                caregiver_user.set_password("1234")
                caregiver_user.save()
            else:
                caregiver_user.first_name = "Clara"
                caregiver_user.last_name = "Gomez"
                caregiver_user.email = "clara.gomez@purplecubby.example"
                caregiver_user.save()

            caregiver_group, _ = Group.objects.get_or_create(name="Caregiver")
            caregiver_user.groups.add(caregiver_group)

            # Ensure Role Membership
            PortalRoleMembership.objects.update_or_create(
                user=caregiver_user,
                tenant=demo_tenant,
                defaults={
                    "group": caregiver_group,
                    "role": "CareGiver",
                    "is_active": True,
                },
            )

            # 2. Seed Attendance Roster for Room 1A
            AttendanceRoster.objects.update_or_create(
                tenant=demo_tenant,
                class_id=ROOM_1A_CLASS_ID,
                date=today,
                defaults={
                    "window_start": "08:00",
                    "window_end": "09:30",
                },
            )

            # 3. Seed 16 Toddlers & Health Profiles & Attendance
            for item in SUNFLOWERS_TODDLER_STUDENTS:
                student, _ = Student.objects.update_or_create(
                    student_id=item["student_id"],
                    defaults={
                        "tenant": demo_tenant,
                        "student_number": f"{demo_tenant.subdomain[:4].upper()}-{item['student_number']}",
                        "name": item["name"],
                        "grade": item["grade"],
                        "section": item["section"],
                        "class_teacher": "Clara Gomez",
                        "class_id": ROOM_1A_CLASS_ID,
                        "status": item["status"],
                        "dob": item["dob"],
                        "enrolled_date": date(2025, 9, 1),
                        "is_deleted": False,
                    },
                )

                # Health profile
                if item.get("health"):
                    h_data = item["health"]
                    StudentHealth.objects.update_or_create(
                        student=student,
                        defaults={
                            "tenant": demo_tenant,
                            "allergies": h_data.get("allergies", []),
                            "conditions": h_data.get("conditions", []),
                            "medications": h_data.get("medications", []),
                            "consent_flag": h_data.get("consent_flag", True),
                            "doctor_name": "Dr. Sarah Chen, MD",
                            "doctor_phone": "416-555-0199",
                        },
                    )

                # Daily Attendance record
                StudentAttendance.objects.update_or_create(
                    student=student,
                    date=today,
                    period="Full_Day",
                    defaults={
                        "tenant": demo_tenant,
                        "class_id": ROOM_1A_CLASS_ID,
                        "status": item["att_status"],
                        "marked_by": caregiver_user.id if hasattr(caregiver_user, "id") else NURSE_CLARA_USER_ID,
                        "notified_parent": item["att_status"] == "Absent",
                        "is_deleted": False,
                    },
                )

            # 4. Seed Medication Log for Leo Vance
            leo_student = Student.objects.filter(student_id=uuid.UUID("00000000-0000-0000-0000-000000007102"), tenant=demo_tenant).first()
            if leo_student:
                MedicationLog.objects.get_or_create(
                    student=leo_student,
                    medicine_name="Salbutamol Inhaler (100mcg)",
                    defaults={
                        "tenant": demo_tenant,
                        "staff_id": NURSE_CLARA_USER_ID,
                        "dose": "2 puffs via spacer before nap",
                        "time_administered": datetime.now(timezone.utc),
                        "parent_notified": True,
                        "notes": "Administered at 10:45 AM by Nurse Clara Gomez. Lungs clear, resting calmly.",
                    },
                )

            # 5. Seed Incidents (Liam Scott knee scrape & Zoe Zhao forehead bump)
            Incident.objects.get_or_create(
                location="Room 1A Garden Playground",
                date=today,
                incident_type="Injury",
                defaults={
                    "tenant": demo_tenant,
                    "severity": "Low",
                    "time": "10:14",
                    "students": ["Liam Scott"],
                    "staff": ["Clara Gomez"],
                    "description": "Tripped during sandbox relay. Washed with sterile saline, gentle dinosaur plaster applied by Nurse Clara. Resumed smiling play immediately.",
                    "actions_taken": "Saline wash, plaster applied, parent acknowledged within 14m.",
                    "parent_notified": True,
                },
            )
            Incident.objects.get_or_create(
                location="Room 1A Soft Play Corner",
                date=today,
                incident_type="Injury",
                defaults={
                    "tenant": demo_tenant,
                    "severity": "Low",
                    "time": "11:22",
                    "students": ["Zoe Zhao"],
                    "staff": ["Clara Gomez"],
                    "description": "Accidental bump against foam building set. Cold gel penguin pack applied for 5 mins. Skin intact, zero discoloration.",
                    "actions_taken": "Cold gel pack applied, pupil check normal, continuous caregiver observation.",
                    "parent_notified": False,
                },
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Room 1A Caregiver cohort with 16 toddlers, attendance, and health profiles!"))
