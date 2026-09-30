import uuid
import pytest
from datetime import date
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings
from jose import jwt
from core.models import Student, Application, Document, Parent, EmergencyContact, AuditLog, FeeStructure

@pytest.mark.django_db
class TestEnrollmentsAPI:
    def setup_method(self):
        self.client = Client()

    def test_parent_can_create_and_reopen_an_incomplete_draft(
        self, tenant_a, parent_token_tenant_a
    ):
        response = self.client.post(
            "/api/v1/enrollments",
            data={"save_as_draft": True},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )

        assert response.status_code == 201
        application_id = response.json()["data"]["application_id"]
        student_id = response.json()["data"]["student"]["student_id"]
        assert response.json()["data"]["workflow_data"]["is_draft"] is True

        applications_response = self.client.get(
            "/api/v1/enrollments/my-applications",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )

        assert applications_response.status_code == 200
        assert [item["application_id"] for item in applications_response.json()["data"]] == [application_id]
        assert applications_response.json()["data"][0]["student"]["student_id"] == student_id

    def test_create_enrollment_success(self, tenant_a, admin_token_tenant_a):
        payload = {
            "first_name": "Liam",
            "last_name": "Evans",
            "dob": "2019-10-15",
            "grade": "Grade 1",
            "parent_name": "David Evans",
            "parent_relationship": "Father",
            "parent_email": "david@example.com",
            "parent_phone": "+1-555-4433",
            "emergency_contact_name": "Helen Evans",
            "emergency_contact_phone": "+1-555-4422",
            "emergency_contact_relationship": "Mother",
            "medical_consent": True
        }

        response = self.client.post(
            "/api/v1/enrollments",
            data=payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 201
        res_json = response.json()
        assert res_json["errors"] is None
        assert res_json["meta"]["tenant_id"] == str(tenant_a.tenant_id)
        assert res_json["data"]["bo"] == "EnrollmentCase"
        assert res_json["data"]["student"]["student_number"].startswith("OAK-")
        assert res_json["data"]["student"]["name"] == "Liam Evans"

    def test_create_enrollment_rejects_direct_submission(self, tenant_a, parent_token_tenant_a):
        response = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Ava",
                "last_name": "Collins",
                "dob": "2019-05-12",
                "grade": "Kindergarten",
                "parent_name": "Sarah Collins",
                "parent_email": "sarah@example.com",
                "parent_phone": "+1-555-0100",
                "save_as_draft": False,
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert response.status_code == 422
        assert response.json()["errors"][0]["rule"] == "BR-01-12"

    def test_decision_rbac_forbidden_for_parent_role(self, tenant_a, parent_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0099",
            name="Test Child",
            dob=date(2019, 1, 1),
            grade="Grade 1"
        )
        app = Application.objects.create(tenant=tenant_a, student=student, status="Pending")

        response = self.client.put(
            f"/api/v1/enrollments/{app.application_id}/decision",
            data={"decision": "Offered"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}"
        )

        assert response.status_code == 403
        res_json = response.json()
        assert res_json["data"] is None
        assert any(e["code"] == "RBAC_DENIED" for e in res_json["errors"])

    def test_parent_accepts_offer_after_uploading_student_photo(
        self, tenant_a, parent_token_tenant_a, tmp_path
    ):
        created = self.client.post(
            "/api/v1/enrollments",
            data={"save_as_draft": True},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        application_id = created.json()["data"]["application_id"]
        application = Application.objects.get(application_id=application_id)
        application.status = "Offered"
        application.notification_dispatched = True
        application.workflow_data = {
            **application.workflow_data,
            "offer_invoice_amount": "420.00",
        }
        application.save(
            update_fields=["status", "notification_dispatched", "workflow_data"]
        )
        application.student.status = "Inactive"
        application.student.save(update_fields=["status"])
        endpoint = f"/api/v1/enrollments/{application_id}/accept-offer"

        missing_photo = self.client.post(
            endpoint,
            data={},
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert missing_photo.status_code == 422
        application.refresh_from_db()
        assert application.status == "Offered"

        invalid_photo = self.client.post(
            endpoint,
            data={
                "photo": SimpleUploadedFile(
                    "child.pdf", b"not-an-image", content_type="application/pdf"
                )
            },
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert invalid_photo.status_code == 422

        with override_settings(MEDIA_ROOT=str(tmp_path)):
            accepted = self.client.post(
                endpoint,
                data={
                    "photo": SimpleUploadedFile(
                        "child.jpg", b"test-image", content_type="image/jpeg"
                    )
                },
                HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
            )

        assert accepted.status_code == 200
        assert accepted.json()["data"]["status"] == "Accepted"
        assert accepted.json()["data"]["student"]["status"] == "Active"
        assert accepted.json()["data"]["invoices"][0]["total"] == 420.0
        assert Document.objects.filter(
            application=application, doc_type="photo", is_deleted=False
        ).count() == 1

    def test_decision_business_rule_violation_returns_422(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0098",
            name="Test Child 2",
            dob=date(2019, 1, 1),
            grade="Grade 1"
        )
        app = Application.objects.create(tenant=tenant_a, student=student, status="Pending")
        # No documents verified, trying to advance to Offered

        response = self.client.put(
            f"/api/v1/enrollments/{app.application_id}/decision",
            data={"decision": "Offered"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 422
        res_json = response.json()
        assert res_json["data"] is None
        assert any(e["code"] == "RULE_VIOLATION" and e["rule"] == "BR-01-01" for e in res_json["errors"])

    def test_pipeline_tenant_isolation(self, tenant_a, tenant_b, admin_token_tenant_a, admin_token_tenant_b):
        student_a = Student.objects.create(
            tenant=tenant_a, student_number="OAK-2026-0001", name="Student A",
            dob=date(2019, 1, 1), grade="Grade 1"
        )
        Application.objects.create(tenant=tenant_a, student=student_a, status="Pending")

        student_b = Student.objects.create(
            tenant=tenant_b, student_number="MLA-2026-0001", name="Student B",
            dob=date(2019, 1, 1), grade="Grade 1"
        )
        Application.objects.create(tenant=tenant_b, student=student_b, status="Pending")

        # Query pipeline with Tenant A token
        res_a = self.client.get(
            "/api/v1/enrollments/pipeline",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )
        assert res_a.status_code == 200
        data_a = res_a.json()["data"]
        assert len(data_a) == 1
        assert data_a[0]["student"]["name"] == "Student A"

        # Query pipeline with Tenant B token
        res_b = self.client.get(
            "/api/v1/enrollments/pipeline",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_b}"
        )
        assert res_b.status_code == 200
        data_b = res_b.json()["data"]
        assert len(data_b) == 1
        assert data_b[0]["student"]["name"] == "Student B"

    def test_get_student_profile_bo(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0100",
            name="Grace Hopper",
            dob=date(2019, 12, 9),
            grade="Grade 1",
            status="Active"
        )
        Parent.objects.create(
            tenant=tenant_a, student=student, name="Mary Hopper",
            relationship="Mother", phone="+1-555-1122", email="mary@example.com"
        )
        EmergencyContact.objects.create(
            tenant=tenant_a, student=student, name="Walter Hopper",
            phone="+1-555-3344", relationship="Father", medical_consent=True
        )

        response = self.client.get(
            f"/api/v1/students/{student.student_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 200
        res_json = response.json()
        assert res_json["data"]["bo"] == "StudentProfile"
        assert res_json["data"]["name"] == "Grace Hopper"
        assert res_json["data"]["student_number"] == "OAK-2026-0100"
        assert res_json["data"]["is_profile_complete"] is True

    def test_admin_can_update_student_record(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0200",
            name="Original Name",
            dob=date(2018, 2, 1),
            grade="Grade 2",
            status="Inactive"
        )

        response = self.client.patch(
            f"/api/v1/students/{student.student_id}",
            data={
                "name": "Updated Name",
                "grade": "Grade 3",
                "status": "Active",
                "class_id": str(uuid.uuid4())
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 200
        student.refresh_from_db()
        assert student.name == "Updated Name"
        assert student.grade == "Grade 3"
        assert student.status == "Active"

    def test_teacher_can_update_student_record(self, tenant_a, teacher_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0205",
            name="Teacher Edit Name",
            dob=date(2018, 5, 1),
            grade="Grade 4",
            section="A",
            status="Active"
        )

        response = self.client.patch(
            f"/api/v1/students/{student.student_id}",
            data={
                "name": "Teacher Updated Name",
                "grade": "Grade 5",
                "section": "B",
                "status": "Active"
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}"
        )

        assert response.status_code == 200
        student.refresh_from_db()
        assert student.name == "Teacher Updated Name"
        assert student.grade == "Grade 5"
        assert student.section == "B"

    def test_admin_can_upload_document_for_application(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0201",
            name="Doc Student",
            dob=date(2018, 4, 4),
            grade="Grade 1",
            status="Active"
        )
        application = Application.objects.create(tenant=tenant_a, student=student, status="Accepted")

        response = self.client.post(
            f"/api/v1/enrollments/{application.application_id}/documents",
            data={
                "doc_type": "immunization",
                "file_path": "/tmp/immunization.pdf"
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}"
        )

        assert response.status_code == 201
        assert Document.objects.filter(application=application, doc_type="immunization").exists()

    def test_owner_can_assign_assessment_without_a_schedule(self, tenant_a, owner_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0202",
            name="Assignment Student",
            grade="Kindergarten",
        )
        application = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Under_Review",
        )
        assessor_id = str(uuid.uuid4())

        response = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/assessment-assignment",
            data={
                "assessor_id": assessor_id,
                "assessment_with": "Teacher",
                "assessor_name": "Teacher One",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {owner_token_tenant_a}",
        )

        assert response.status_code == 200
        assessment = response.json()["data"]["workflow_data"]["assessment"]
        assert assessment["assessor_id"] == assessor_id
        assert assessment["assessor_name"] == "Teacher One"
        assert assessment["status"] == "Assigned"
        assert "scheduled_at" not in assessment

    def test_parent_data_isolation_between_different_parents(self, tenant_a):
        from jose import jwt
        from django.conf import settings

        # Parent 1: Sarah Collins
        parent_1_id = str(uuid.uuid4())
        parent_1_token = jwt.encode({
            "sub": parent_1_id,
            "user_id": parent_1_id,
            "tenant_id": str(tenant_a.tenant_id),
            "role": "Parent",
            "email": "sarah.collins@example.com",
            "linked_student_ids": []
        }, settings.JWT_SECRET_KEY, algorithm="HS256")

        # Parent 2: David Miller
        parent_2_id = str(uuid.uuid4())
        parent_2_token = jwt.encode({
            "sub": parent_2_id,
            "user_id": parent_2_id,
            "tenant_id": str(tenant_a.tenant_id),
            "role": "Parent",
            "email": "david.miller@example.com",
            "linked_student_ids": []
        }, settings.JWT_SECRET_KEY, algorithm="HS256")

        # 1. Parent 1 creates an application for Ava Collins
        res1 = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Ava",
                "last_name": "Collins",
                "dob": "2019-05-12",
                "grade": "Grade 2",
                "parent_name": "Sarah Collins",
                "parent_email": "sarah.collins@example.com",
                "parent_phone": "+1-555-0199",
                "medical_consent": True
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert res1.status_code == 201
        app1_data = res1.json()["data"]
        app1_id = app1_data["application_id"]
        student1_id = app1_data["student"]["student_id"]

        # 2. Parent 2 creates an application for Lucas Miller
        res2 = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Lucas",
                "last_name": "Miller",
                "dob": "2019-08-20",
                "grade": "Grade 1",
                "parent_name": "David Miller",
                "parent_email": "david.miller@example.com",
                "parent_phone": "+1-555-0244",
                "medical_consent": True
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert res2.status_code == 201
        app2_data = res2.json()["data"]
        app2_id = app2_data["application_id"]
        student2_id = app2_data["student"]["student_id"]

        # 3. Parent 1 queries /my-applications -> MUST only see Ava Collins
        p1_apps = self.client.get(
            "/api/v1/enrollments/my-applications",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert p1_apps.status_code == 200
        p1_list = p1_apps.json()["data"]
        assert len(p1_list) == 1
        assert p1_list[0]["application_id"] == app1_id
        assert p1_list[0]["student"]["name"] == "Ava Collins"

        # 4. Parent 2 queries /my-applications -> MUST only see Lucas Miller
        p2_apps = self.client.get(
            "/api/v1/enrollments/my-applications",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_apps.status_code == 200
        p2_list = p2_apps.json()["data"]
        assert len(p2_list) == 1
        assert p2_list[0]["application_id"] == app2_id
        assert p2_list[0]["student"]["name"] == "Lucas Miller"

        # 5. Parent 2 attempts to query Parent 1's student profile -> MUST be 403 Forbidden!
        p2_hack_profile = self.client.get(
            f"/api/v1/students/{student1_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_hack_profile.status_code == 403
        assert p2_hack_profile.json()["errors"][0]["code"] == "ACCESS_DENIED"

        # 6. Parent 2 attempts to query Parent 1's application status -> MUST be 403 Forbidden!
        p2_hack_app = self.client.get(
            f"/api/v1/enrollments/{app1_id}/status",
            HTTP_AUTHORIZATION=f"Bearer {parent_2_token}"
        )
        assert p2_hack_app.status_code == 403
        assert p2_hack_app.json()["errors"][0]["code"] == "ACCESS_DENIED"

        # 7. Parent 1 queries her own student profile -> Allowed (200 OK)
        p1_profile = self.client.get(
            f"/api/v1/students/{student1_id}/profile",
            HTTP_AUTHORIZATION=f"Bearer {parent_1_token}"
        )
        assert p1_profile.status_code == 200
        assert p1_profile.json()["data"]["name"] == "Ava Collins"

    def test_parent_can_save_edit_upload_and_complete_enrollment(
        self, tenant_a, parent_token_tenant_a, admin_token_tenant_a, tmp_path
    ):
        FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Kindergarten",
            term="Fall 2026",
            components=[{"description": "Tuition", "amount": 320.0}],
        )
        response = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Ava",
                "last_name": "Collins",
                "grade": "Kindergarten",
                "preferred_intake": "Fall 2026",
                "parent_name": "Sarah Collins",
                "parent_email": "sarah@example.com",
                "parent_phone": "+1-555-0100",
                "emergency_contact_name": "Morgan Collins",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )

        assert response.status_code == 201
        application_id = response.json()["data"]["application_id"]
        assert response.json()["data"]["workflow_data"]["is_draft"] is True
        assert response.json()["data"]["student"]["dob"] is None

        update = self.client.patch(
            f"/api/v1/enrollments/{application_id}",
            data={"comments": "Please contact me by email."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert update.status_code == 200
        assert update.json()["data"]["workflow_data"]["emergency_contact"]["name"] == "Morgan Collins"

        blocked_submit = self.client.post(
            f"/api/v1/enrollments/{application_id}/submit",
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert blocked_submit.status_code == 422

        with override_settings(MEDIA_ROOT=str(tmp_path)):
            upload = self.client.post(
                f"/api/v1/enrollments/{application_id}/documents/upload",
                data={
                    "doc_type": "birth_certificate",
                    "file": SimpleUploadedFile("birth-certificate.pdf", b"test-pdf", content_type="application/pdf"),
                },
                HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
            )
        assert upload.status_code == 201
        assert upload.json()["data"]["documents"][0]["file_path"].startswith("admissions/")

        contact_update = self.client.patch(
            f"/api/v1/enrollments/{application_id}",
            data={
                "emergency_contact_phone": "+1-555-0101",
                "emergency_contact_relationship": "Aunt",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert contact_update.status_code == 200
        assert contact_update.json()["data"]["emergency_contacts"][0]["phone"] == "+1-555-0101"

        submitted = self.client.post(
            f"/api/v1/enrollments/{application_id}/submit",
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert submitted.status_code == 200
        assert submitted.json()["data"]["status"] == "Under_Review"
        assert submitted.json()["data"]["workflow_data"]["is_draft"] is False

        document_id = submitted.json()["data"]["documents"][0]["document_id"]
        verification = self.client.put(
            f"/api/v1/enrollments/{application_id}/documents/{document_id}/verify",
            data={"verified": True},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert verification.status_code == 200

        assessment = self.client.put(
            f"/api/v1/enrollments/{application_id}/assessment",
            data={"score": 91, "recommendation": "Recommend Admission", "notes": "Assessment complete."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert assessment.status_code == 200

        vice_principal_id = str(uuid.uuid4())
        vice_principal_token = jwt.encode(
            {
                "sub": vice_principal_id,
                "tenant_id": str(tenant_a.tenant_id),
                "role": "Vice_Principal",
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )
        recommendation = self.client.put(
            f"/api/v1/enrollments/{application_id}/recommendation",
            data={"recommendation": "Offered", "reason": "Assessment meets admission criteria."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {vice_principal_token}",
        )
        assert recommendation.status_code == 200

        offer = self.client.put(
            f"/api/v1/enrollments/{application_id}/decision",
            data={"decision": "Offered", "reason": "Assessment successful."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert offer.status_code == 200

        with override_settings(MEDIA_ROOT=str(tmp_path)):
            accepted = self.client.post(
                f"/api/v1/enrollments/{application_id}/accept-offer",
                data={
                    "photo": SimpleUploadedFile(
                        "ava.jpg", b"test-image", content_type="image/jpeg"
                    )
                },
                HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
            )
        assert accepted.status_code == 200, accepted.json()
        assert accepted.json()["data"]["status"] == "Accepted"
        assert accepted.json()["data"]["student"]["status"] == "Active"

        parent_id = offer.json()["data"]["parent"][0]["parent_id"]
        invoice = self.client.post(
            "/api/v1/invoices",
            data={
                "student_id": offer.json()["data"]["student"]["student_id"],
                "parent_id": parent_id,
                "invoice_date": "2026-09-29",
                "due_date": "2026-10-15",
                "line_items": [{"description": "Tuition", "amount": 320.0}],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert invoice.status_code == 201

        payment = self.client.post(
            "/api/v1/payments",
            data={
                "invoice_id": invoice.json()["data"]["invoice_id"],
                "parent_id": parent_id,
                "amount": 320.0,
                "method": "Card",
                "txn_ref": "TXN-TEST-001",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert payment.status_code == 201
        assert payment.json()["data"]["status"] == "Completed"

        paid_status = self.client.get(
            f"/api/v1/enrollments/{application_id}/status",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert paid_status.status_code == 200
        assert paid_status.json()["data"]["payment_confirmed"] is True
        assert paid_status.json()["data"]["status"] == "Active"
        assert paid_status.json()["data"]["student"]["status"] == "Active"

    def test_owner_can_request_clarification_and_parent_can_resubmit(
        self, tenant_a, parent_token_tenant_a, owner_token_tenant_a
    ):
        created = self.client.post(
            "/api/v1/enrollments",
            data={
                "first_name": "Ava",
                "last_name": "Collins",
                "grade": "Kindergarten",
                "preferred_intake": "Fall 2026",
                "parent_name": "Sarah Collins",
                "parent_email": "sarah@example.com",
                "parent_phone": "+1-555-0100",
                "emergency_contact_name": "Morgan Collins",
                "emergency_contact_phone": "+1-555-0101",
                "emergency_contact_relationship": "Aunt",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert created.status_code == 201
        application_id = created.json()["data"]["application_id"]

        uploaded = self.client.post(
            f"/api/v1/enrollments/{application_id}/documents",
            data={"doc_type": "birth_certificate", "file_path": "admissions/birth.pdf"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert uploaded.status_code == 201

        submitted = self.client.post(
            f"/api/v1/enrollments/{application_id}/submit",
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert submitted.status_code == 200
        assert submitted.json()["data"]["status"] == "Under_Review"

        clarification = self.client.put(
            f"/api/v1/enrollments/{application_id}/decision",
            data={
                "decision": "Pending_Clarification",
                "reason": "Please provide the previous school record.",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {owner_token_tenant_a}",
        )
        assert clarification.status_code == 200
        assert clarification.json()["data"]["status"] == "Pending_Clarification"

        update = self.client.patch(
            f"/api/v1/enrollments/{application_id}",
            data={"comments": "The requested school record is attached."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert update.status_code == 200

        resubmitted = self.client.post(
            f"/api/v1/enrollments/{application_id}/submit",
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
        )
        assert resubmitted.status_code == 200
        assert resubmitted.json()["data"]["status"] == "Under_Review"
        assert resubmitted.json()["data"]["workflow_data"]["parent_clarification_response"] == "The requested school record is attached."

    def test_owner_approval_accepts_without_review_gates(self, tenant_a, owner_token_tenant_a):
        FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Kindergarten",
            term="Fall 2026",
            components=[{"description": "Tuition", "amount": 320.0}],
        )
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0410",
            name="Jordan Lee",
            dob=date(2018, 11, 20),
            grade="Kindergarten",
            status="Inactive",
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Jordan Lee Parent",
            relationship="Parent",
            phone="+1-555-0410",
            email="jordan.parent@example.com",
        )
        application = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Under_Review",
            workflow_data={"preferred_intake": "Fall 2026"},
        )

        response = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/decision",
            data={"decision": "Accepted", "reason": "Approved by Owner."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {owner_token_tenant_a}",
        )

        assert response.status_code == 200, response.json()
        assert response.json()["data"]["status"] == "Accepted"
        assert len(response.json()["data"]["invoices"]) == 1
        assert response.json()["data"]["invoices"][0]["total"] == 320.0
        student.refresh_from_db()
        assert student.status == "Active"
        audit = AuditLog.objects.filter(
            entity="Application",
            entity_id=str(application.application_id),
            action="UPDATE",
        ).latest("timestamp")
        assert audit.new_values["owner_override"] is True

    def test_owner_can_issue_acceptance_invoice_without_fee_structure(
        self, tenant_a, owner_token_tenant_a
    ):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0411",
            name="Morgan Lee",
            dob=date(2018, 12, 1),
            grade="Pre-K",
            status="Inactive",
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Morgan Lee Parent",
            relationship="Parent",
            phone="+1-555-0411",
            email="morgan.parent@example.com",
        )
        application = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Under_Review",
            workflow_data={"preferred_intake": "Fall 2026"},
        )

        response = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/decision",
            data={
                "decision": "Accepted",
                "reason": "Approved by Owner.",
                "invoice_amount": 420.00,
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {owner_token_tenant_a}",
        )

        assert response.status_code == 200, response.json()
        invoices = response.json()["data"]["invoices"]
        assert len(invoices) == 1
        assert invoices[0]["total"] == 420.0
        assert invoices[0]["status"] == "Issued"

    def test_owner_can_issue_missing_invoice_for_already_accepted_request(
        self, tenant_a, owner_token_tenant_a
    ):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0412",
            name="Casey Lee",
            dob=date(2018, 12, 2),
            grade="Pre-K",
            status="Active",
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Casey Lee Parent",
            relationship="Parent",
            phone="+1-555-0412",
            email="casey.parent@example.com",
        )
        application = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Accepted",
            workflow_data={"preferred_intake": "Fall 2026"},
        )

        for amount in (420.0, 500.0):
            response = self.client.put(
                f"/api/v1/enrollments/{application.application_id}/decision",
                data={
                    "decision": "Accepted",
                    "reason": "Confirmed by Owner.",
                    "invoice_amount": amount,
                },
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {owner_token_tenant_a}",
            )
            assert response.status_code == 200, response.json()

        assert len(response.json()["data"]["invoices"]) == 1
        assert response.json()["data"]["invoices"][0]["total"] == 420.0

    def test_admissions_assessment_and_recommendation_handoff(
        self, tenant_a, admin_token_tenant_a, teacher_token_tenant_a
    ):
        teacher_id = jwt.get_unverified_claims(teacher_token_tenant_a)["sub"]
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0310",
            name="Chloe Patel",
            dob=date(2019, 5, 2),
            grade="Toddler",
            status="Inactive",
        )
        application = Application.objects.create(
            tenant=tenant_a,
            student=student,
            status="Under_Review",
        )

        assignment = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/assessment-assignment",
            data={"assessor_id": teacher_id, "scheduled_at": "2026-10-02T10:00:00Z"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert assignment.status_code == 200

        teacher_queue = self.client.get(
            "/api/v1/enrollments/my-assessments",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}",
        )
        assert teacher_queue.status_code == 200
        assert teacher_queue.json()["data"][0]["application_id"] == str(application.application_id)

        assessment = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/assessment",
            data={"score": 84, "recommendation": "Recommend Admission", "notes": "Ready for decision."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {teacher_token_tenant_a}",
        )
        assert assessment.status_code == 200

        vice_principal_id = str(uuid.uuid4())
        vice_principal_token = jwt.encode(
            {
                "sub": vice_principal_id,
                "tenant_id": str(tenant_a.tenant_id),
                "role": "Vice_Principal",
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )
        recommendation = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/recommendation",
            data={"recommendation": "Offered", "reason": "Assessment meets admission criteria."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {vice_principal_token}",
        )
        assert recommendation.status_code == 200
        assert recommendation.json()["data"]["workflow_data"]["vp_recommendation"]["decision"] == "Offered"

        blocked_vp_decision = self.client.put(
            f"/api/v1/enrollments/{application.application_id}/decision",
            data={"decision": "Rejected"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {vice_principal_token}",
        )
        assert blocked_vp_decision.status_code == 403

