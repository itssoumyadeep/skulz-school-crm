import uuid
import pytest
from datetime import date
from core.models import Student, Application, Document, EmergencyContact, Parent
from core.business_objects.enrollment import EnrollmentCaseBO
from core.business_objects.base import BusinessRuleError

@pytest.mark.django_db
class TestEnrollmentCaseBO:

    # ── BR-01-01: Document Verification Gate ─────────────────────────
    def test_br_01_01_fails_when_required_documents_unverified(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0001",
            name="Sophia Taylor",
            dob=date(2019, 3, 10),
            grade="Grade 1",
            status="Applied"
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Pending",
            workflow_data={"assessment": {"status": "Completed"}},
        )
        # A birth certificate is required before an offer; it is not verified.
        Document.objects.create(
            tenant=tenant_a, application=app, doc_type="birth_certificate",
            file_path="/docs/bc.pdf", verified=False
        )
        Document.objects.create(
            tenant=tenant_a, application=app, doc_type="previous_school_records",
            file_path="/docs/rec.pdf", verified=True
        )
        Document.objects.create(
            tenant=tenant_a, application=app, doc_type="photo",
            file_path="/docs/photo.jpg", verified=False
        )

        bo = EnrollmentCaseBO(application=app, actor_role="Admin")
        with pytest.raises(BusinessRuleError) as exc:
            bo.advance_status("Offered")

        assert any(v.rule_id == "BR-01-01" for v in exc.value.violations)

    def test_br_01_01_passes_when_all_required_documents_verified(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0002",
            name="Lucas Miller",
            dob=date(2019, 4, 15),
            grade="Grade 1",
            status="Applied"
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Under_Review",
            workflow_data={
                "assessment": {"status": "Completed"},
                "vp_recommendation": {"decision": "Offered", "reason": "Recommended."},
            },
        )
        for dtype in ["birth_certificate", "previous_school_records", "photo"]:
            Document.objects.create(
                tenant=tenant_a, application=app, doc_type=dtype,
                file_path=f"/docs/{dtype}.pdf", verified=True
            )

        bo = EnrollmentCaseBO(application=app, actor_role="Admin")
        bo.advance_status("Offered")

        app.refresh_from_db()
        student.refresh_from_db()
        assert app.status == "Offered"
        assert student.status == "Offered"

    # ── BR-01-02: Seat Confirmation Payment Gate ─────────────────────
    def test_br_01_02_fails_when_activating_without_payment_confirmed(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0003",
            name="Emily Davis",
            dob=date(2019, 6, 20),
            grade="Grade 1",
            status="Offered"
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Offered",
            payment_confirmed=False
        )
        EmergencyContact.objects.create(
            tenant=tenant_a,
            student=student,
            name="John Davis",
            phone="+1-555-9000",
            relationship="Father"
        )

        bo = EnrollmentCaseBO(application=app, actor_role="Admin")
        with pytest.raises(BusinessRuleError) as exc:
            bo.advance_status("Active")

        assert any(v.rule_id == "BR-01-02" for v in exc.value.violations)

    # ── BR-01-03: Mandatory Emergency Contact Gate ───────────────────
    def test_br_01_03_fails_when_activating_without_emergency_contact(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0004",
            name="Oliver Brown",
            dob=date(2019, 7, 25),
            grade="Grade 1",
            status="Offered"
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Offered",
            payment_confirmed=True
        )
        # No emergency contact created

        bo = EnrollmentCaseBO(application=app, actor_role="Admin")
        with pytest.raises(BusinessRuleError) as exc:
            bo.advance_status("Active")

        assert any(v.rule_id == "BR-01-03" for v in exc.value.violations)

    # ── BR-01-04: Decision Immutability Rule ─────────────────────────
    def test_br_01_04_blocks_decision_override_after_notification_for_non_owner(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0005",
            name="Charlotte Wilson",
            dob=date(2019, 8, 30),
            grade="Grade 1",
            status="Rejected"
        )
        app = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Rejected",
            notification_dispatched=True, # Notification was sent!
            workflow_data={"assessment": {"status": "Completed"}},
        )

        bo_admin = EnrollmentCaseBO(application=app, actor_role="Admin")
        with pytest.raises(BusinessRuleError) as exc:
            bo_admin.advance_status("Waitlisted", actor_role="Admin")

        assert any(v.rule_id == "BR-01-04" for v in exc.value.violations)

        # Owner CAN override
        bo_owner = EnrollmentCaseBO(application=app, actor_role="Owner")
        bo_owner.advance_status("Waitlisted", actor_role="Owner")
        app.refresh_from_db()
        assert app.status == "Waitlisted"

    # ── Factory / Creation test ──────────────────────────────────────
    def test_create_enrollment_assigns_student_number_and_creates_records(self, tenant_a):
        data = {
            "student_name": "Benjamin Clark",
            "dob": date(2019, 9, 5),
            "grade": "Grade 1",
            "parent_name": "Sarah Clark",
            "parent_relationship": "Mother",
            "parent_email": "sarah@example.com",
            "parent_phone": "+1-555-7788",
            "emergency_contact_name": "James Clark",
            "emergency_contact_phone": "+1-555-7799",
            "emergency_contact_relationship": "Father",
            "medical_consent": True
        }

        bo = EnrollmentCaseBO.create_enrollment(tenant=tenant_a, data=data, actor_role="Admin")
        result = bo.to_dict()

        assert result["bo"] == "EnrollmentCase"
        assert result["student"]["student_number"].startswith("OAK-")
        assert result["student"]["name"] == "Benjamin Clark"
        assert result["status"] == "Pending"
