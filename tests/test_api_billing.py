import json
from datetime import date
from decimal import Decimal

import pytest
from django.test import Client

from core.models import Student, Parent, FeeStructure, Invoice, Payment


@pytest.mark.django_db
class TestBillingAPI:
    def setup_method(self):
        self.client = Client()

    def test_create_invoice_and_get_fee_account(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0201",
            name="API Billing Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="API Billing Parent",
            relationship="Parent",
            phone="+1-555-0201",
            email="api-billing@example.com",
        )
        fee_structure = FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Grade 1",
            term="Term 1",
            components=[{"description": "Tuition", "amount": 1000.00}],
            penalty_rules={"grace_period_days": 7, "late_fee_amount": 50.00},
        )

        create_response = self.client.post(
            "/api/v1/invoices",
            data=json.dumps({
                "student_id": str(student.student_id),
                "parent_id": str(parent.parent_id),
                "fee_struct_id": str(fee_structure.fee_struct_id),
                "invoice_date": "2026-08-01",
                "due_date": "2026-08-15",
                "line_items": [{"description": "Tuition", "amount": 1000.00}],
                "invoice_type": "Tuition",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert create_response.status_code == 201
        payload = create_response.json()
        assert payload["errors"] is None
        assert payload["data"]["status"] == "Issued"
        assert payload["data"]["total"] == 1000.0

        fee_account_response = self.client.get(
            f"/api/v1/students/{student.student_id}/fee-account",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert fee_account_response.status_code == 200
        fee_payload = fee_account_response.json()
        assert fee_payload["data"]["bo"] == "FeeAccount"
        assert fee_payload["data"]["outstanding_balance"] == 1000.0

    def test_bulk_invoice_generation_endpoint(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0202",
            name="Bulk Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Bulk Parent",
            relationship="Parent",
            phone="+1-555-0202",
            email="bulk@example.com",
        )
        fee_structure = FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Grade 1",
            term="Term 1",
            components=[{"description": "Tuition", "amount": 1200.00}],
            penalty_rules={"grace_period_days": 7, "late_fee_amount": 50.00},
        )

        response = self.client.post(
            "/api/v1/invoices/bulk-generate",
            data=json.dumps({
                "fee_struct_id": str(fee_structure.fee_struct_id),
                "invoice_date": "2026-08-01",
                "due_date": "2026-08-15",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["data"]["count"] == 1
        assert payload["data"]["invoices"][0]["total"] == 1200.0

    def test_high_value_discount_requires_owner(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0203",
            name="Discount API Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Discount API Parent",
            relationship="Parent",
            phone="+1-555-0203",
            email="discount-api@example.com",
        )
        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=student,
            parent=parent,
            invoice_date=date(2026, 8, 1),
            due_date=date(2026, 8, 15),
            line_items=[{"description": "Tuition", "amount": 1000.00}],
            total=Decimal("1000.00"),
            status="Issued",
        )

        response = self.client.post(
            "/api/v1/discounts",
            data=json.dumps({
                "invoice_id": str(invoice.invoice_id),
                "student_id": str(student.student_id),
                "discount_type": "Discretionary",
                "amount": "250.00",
                "reason": "Manual adjustment",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 422
        payload = response.json()
        assert any(error["rule"] == "BR-02-03" for error in payload["errors"])

    def test_refund_requires_owner_when_above_threshold(self, tenant_a, admin_token_tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0204",
            name="Refund API Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Refund API Parent",
            relationship="Parent",
            phone="+1-555-0204",
            email="refund-api@example.com",
        )
        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=student,
            parent=parent,
            invoice_date=date(2026, 8, 1),
            due_date=date(2026, 8, 15),
            line_items=[{"description": "Tuition", "amount": 1000.00}],
            total=Decimal("1000.00"),
            status="Issued",
        )
        payment = Payment.objects.create(
            tenant=tenant_a,
            invoice=invoice,
            parent=parent,
            amount=Decimal("1000.00"),
            method="Card",
            txn_ref="TXN-REFUND-1",
            status="Completed",
            receipt_id="REC-2026-00001",
        )

        response = self.client.post(
            f"/api/v1/payments/{payment.payment_id}/refund",
            data=json.dumps({
                "refund_amount": "600.00",
                "reason": "Approved adjustment",
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )

        assert response.status_code == 422
        payload = response.json()
        assert any(error["rule"] == "BR-02-04" for error in payload["errors"])
