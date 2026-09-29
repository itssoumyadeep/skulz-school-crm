import uuid
import pytest
from datetime import date
from core.models import Student, Parent, EmergencyContact, Application, Document
from core.business_objects.enrollment import StudentProfileBO

@pytest.mark.django_db
class TestStudentProfileBO:
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
