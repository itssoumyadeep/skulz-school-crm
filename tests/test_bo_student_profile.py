import uuid
import pytest
from datetime import date
from decimal import Decimal
from core.models import (
    AcademicCalendar,
    Application,
    Document,
    EmergencyContact,
    Invoice,
    Parent,
    Payment,
    ReportCard,
    Student,
    StudentAttendance,
)
from core.business_objects.enrollment import StudentProfileBO

@pytest.mark.django_db
class TestStudentProfileBO:
    def test_profile_does_not_invent_data_when_records_are_missing(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0002",
            name="Jordan Graham",
            grade="Grade 3",
            status="Active",
        )

        data = StudentProfileBO(student=student, actor_role="Admin").to_dict()

        assert data["attendance_pct"] is None
        assert data["attendance_summary"] is None
        assert data["report_card"] is None
        assert data["fee_account"] is None
        assert data["invoices"] == []
        assert data["receipts"] == []
        assert data["assignment_submissions"] == []
        assert data["marks_own_subject"] == {}
        assert data["class_teacher"] is None

    def test_profile_uses_real_attendance_report_card_and_fee_data(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0003",
            name="Casey Graham",
            grade="Grade 4",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Eleanor Graham",
            relationship="Mother",
            phone="+1-555-0199",
            email="eleanor@example.com",
        )
        calendar = AcademicCalendar.objects.create(
            tenant=tenant_a,
            academic_year="2026-2027",
        )
        ReportCard.objects.create(
            tenant=tenant_a,
            student=student,
            calendar=calendar,
            term="Term 1",
            year=2026,
            overall_grade="B+",
            gpa=Decimal("3.20"),
            published_date=date(2026, 9, 15),
            is_published=True,
        )
        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=student,
            parent=parent,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total=Decimal("600.00"),
            status="Issued",
        )
        Payment.objects.create(
            tenant=tenant_a,
            invoice=invoice,
            parent=parent,
            amount=Decimal("125.00"),
            receipt_id="REC-2026-0003",
        )
        class_id = uuid.uuid4()
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=student,
            class_id=class_id,
            date=date(2026, 9, 29),
            status="Present",
            marked_by=uuid.uuid4(),
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=student,
            class_id=class_id,
            date=date(2026, 9, 30),
            status="Absent",
            marked_by=uuid.uuid4(),
        )

        data = StudentProfileBO(student=student, actor_role="Parent").to_dict()

        assert data["attendance_summary"] == "50.0% attendance (1/2 sessions)"
        assert data["report_card"]["overall_grade"] == "B+"
        assert data["report_card"]["gpa"] == 3.2
        assert data["fee_account"] == {"status": "Outstanding", "outstanding": 475.0}
        assert data["invoices"][0]["total"] == 600.0
        assert data["receipts"][0]["receipt_id"] == "REC-2026-0003"

    def test_assembles_full_profile_structure(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0001",
            name="Alexander Graham",
            dob=date(2018, 5, 12),
            grade="Grade 2",
            status="Active"
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Eleanor Graham",
            relationship="Mother",
            phone="+1-555-0199",
            email="eleanor@example.com"
        )
        EmergencyContact.objects.create(
            tenant=tenant_a,
            student=student,
            name="Robert Graham",
            phone="+1-555-0188",
            relationship="Uncle",
            medical_consent=True
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Active",
            payment_confirmed=True
        )

        bo = StudentProfileBO(student=student, actor_role="Admin")
        data = bo.to_dict()

        assert data["bo"] == "StudentProfile"
        assert data["student_number"] == "OAK-2026-0001"
        assert data["name"] == "Alexander Graham"
        assert data["is_profile_complete"] is True
        assert len(data["parents"]) == 1
        assert data["primary_contact"]["name"] == "Eleanor Graham"
        assert len(data["emergency_contacts"]) == 1
        assert len(data["applications"]) == 1
