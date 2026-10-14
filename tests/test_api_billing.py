import json
import hashlib
import hmac
import time
import uuid
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.conf import settings
from django.test import Client, override_settings
from jose import jwt

from core.models import Student, Parent, FeeStructure, Invoice, Payment


def parent_token(tenant, user_id, email, linked_student_ids):
    return jwt.encode(
        {
            "sub": str(user_id),
            "tenant_id": str(tenant.tenant_id),
            "role": "Parent",
            "email": email,
            "linked_student_ids": [str(student_id) for student_id in linked_student_ids],
        },
        settings.JWT_SECRET_KEY,
        algorithm="HS256",
    )


def stripe_signature(payload, secret):
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}".encode()
    signature = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


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

    def test_parent_billing_checkout_partial_payment_and_webhook_replay(
        self, tenant_a, tenant_b
    ):
        parent_user_id = uuid.uuid4()
        other_parent_user_id = uuid.uuid4()
        parent_email = "checkout-parent@example.com"
        child_one = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0251",
            name="Taylor One",
            grade="Grade 2",
            status="Active",
            created_by=parent_user_id,
        )
        parent_one = Parent.objects.create(
            tenant=tenant_a,
            student=child_one,
            name="Checkout Parent",
            relationship="Parent",
            phone="+1-555-0251",
            email=parent_email,
            created_by=parent_user_id,
        )
        child_two = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0252",
            name="Taylor Two",
            grade="Grade 3",
            status="Active",
            created_by=parent_user_id,
        )
        parent_two = Parent.objects.create(
            tenant=tenant_a,
            student=child_two,
            name="Checkout Parent",
            relationship="Parent",
            phone="+1-555-0252",
            email=parent_email,
            created_by=parent_user_id,
        )
        invoice_one = Invoice.objects.create(
            tenant=tenant_a,
            student=child_one,
            parent=parent_one,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            line_items=[{"description": "Tuition", "amount": 600}],
            total=Decimal("600.00"),
            status="Partially_Paid",
        )
        Payment.objects.create(
            tenant=tenant_a,
            invoice=invoice_one,
            parent=parent_one,
            amount=Decimal("150.00"),
            status="Completed",
            receipt_id="REC-2026-0251",
        )
        invoice_two = Invoice.objects.create(
            tenant=tenant_a,
            student=child_two,
            parent=parent_two,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            line_items=[{"description": "Tuition", "amount": 200}],
            total=Decimal("200.00"),
            status="Issued",
        )
        foreign_child = Student.objects.create(
            tenant=tenant_b,
            student_number="MAP-2026-0250",
            name="Foreign Linked Child",
            grade="Grade 2",
            status="Active",
        )
        parent_jwt = parent_token(
            tenant_a,
            parent_user_id,
            parent_email,
            [child_one.student_id, child_two.student_id, foreign_child.student_id],
        )

        with override_settings(
            STRIPE_SECRET_KEY="sk_test_parent_billing",
            STRIPE_WEBHOOK_SECRET="whsec_parent_billing",
            STRIPE_CURRENCY="cad",
        ):
            billing_response = self.client.get(
                "/api/v1/parent/billing",
                HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
            )
            assert billing_response.status_code == 200
            billing = billing_response.json()["data"]
            assert {child["student_id"] for child in billing["children"]} == {
                str(child_one.student_id),
                str(child_two.student_id),
            }
            first_child = next(
                child for child in billing["children"]
                if child["student_id"] == str(child_one.student_id)
            )
            assert first_child["invoices"][0]["balance_due"] == 450.0

            over_balance = self.client.post(
                "/api/v1/parent/billing/checkout",
                data={"invoice_id": str(invoice_one.invoice_id), "amount": "450.01"},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
            )
            assert over_balance.status_code == 422

            checkout_session = SimpleNamespace(
                id="cs_test_partial_parent_payment",
                url="https://checkout.stripe.test/session",
                expires_at=int(datetime.now().timestamp()) + 1800,
            )
            with patch("core.api.v1.billing.stripe.StripeClient") as stripe_client:
                stripe_client.return_value.v1.checkout.sessions.create.return_value = checkout_session
                checkout_response = self.client.post(
                    "/api/v1/parent/billing/checkout",
                    data={"invoice_id": str(invoice_one.invoice_id), "amount": "125.55"},
                    content_type="application/json",
                    HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
                )

            assert checkout_response.status_code == 201, checkout_response.json()
            pending_payment = Payment.objects.get(
                payment_id=checkout_response.json()["data"]["payment_id"]
            )
            assert pending_payment.status == "Pending"
            assert pending_payment.stripe_checkout_session_id == checkout_session.id
            checkout_params = stripe_client.return_value.v1.checkout.sessions.create.call_args.args[0]
            assert checkout_params["line_items"][0]["price_data"]["unit_amount"] == 12555

            duplicate_checkout = self.client.post(
                "/api/v1/parent/billing/checkout",
                data={"invoice_id": str(invoice_one.invoice_id), "amount": "100.00"},
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
            )
            assert duplicate_checkout.status_code == 409

            direct_payment = self.client.post(
                "/api/v1/payments",
                data={
                    "invoice_id": str(invoice_one.invoice_id),
                    "parent_id": str(parent_one.parent_id),
                    "amount": "10.00",
                },
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
            )
            assert direct_payment.status_code == 403

            event_timestamp = int(time.time())
            webhook_body = json.dumps({
                "id": "evt_test_partial_parent_payment",
                "object": "event",
                "api_version": "2024-06-20",
                "created": event_timestamp,
                "data": {
                    "object": {
                        "id": checkout_session.id,
                        "object": "checkout.session",
                        "payment_status": "paid",
                        "amount_total": 12555,
                        "currency": "cad",
                        "payment_intent": "pi_test_partial_parent_payment",
                        "metadata": {"tenant_id": str(tenant_a.tenant_id)},
                    }
                },
                "livemode": False,
                "pending_webhooks": 1,
                "request": {"id": None, "idempotency_key": None},
                "type": "checkout.session.completed",
            })
            signature = stripe_signature(webhook_body, "whsec_parent_billing")
            invalid_webhook = self.client.post(
                "/api/v1/stripe/webhook",
                data=webhook_body,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="invalid-signature",
            )
            assert invalid_webhook.status_code == 400
            pending_payment.refresh_from_db()
            assert pending_payment.status == "Pending"
            webhook_response = self.client.post(
                "/api/v1/stripe/webhook",
                data=webhook_body,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=signature,
            )
            assert webhook_response.status_code == 200
            replay_response = self.client.post(
                "/api/v1/stripe/webhook",
                data=webhook_body,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=signature,
            )
            assert replay_response.status_code == 200

        pending_payment.refresh_from_db()
        invoice_one.refresh_from_db()
        assert pending_payment.status == "Completed"
        assert pending_payment.receipt_id
        assert invoice_one.status == "Partially_Paid"
        assert Payment.objects.filter(
            stripe_checkout_session_id=checkout_session.id,
            status="Completed",
        ).count() == 1

        outsider_id = uuid.uuid4()
        outsider_student = Student.objects.create(
            tenant=tenant_b,
            student_number="MAP-2026-0251",
            name="Outsider Child",
            grade="Grade 2",
            status="Active",
            created_by=outsider_id,
        )
        outsider_parent = Parent.objects.create(
            tenant=tenant_b,
            student=outsider_student,
            name="Outsider Parent",
            relationship="Parent",
            phone="+1-555-9999",
            email="outsider@example.com",
            created_by=outsider_id,
        )
        outsider_invoice = Invoice.objects.create(
            tenant=tenant_b,
            student=outsider_student,
            parent=outsider_parent,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total=Decimal("100.00"),
            status="Issued",
        )
        outsider_payment = Payment.objects.create(
            tenant=tenant_b,
            invoice=outsider_invoice,
            parent=outsider_parent,
            amount=Decimal("10.00"),
            status="Completed",
            receipt_id="REC-2026-9999",
        )
        denied_receipt = self.client.get(
            f"/api/v1/payments/{outsider_payment.payment_id}/receipt",
            HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
        )
        assert denied_receipt.status_code == 404
        assert Invoice.objects.filter(tenant=tenant_a, invoice_id=invoice_two.invoice_id).exists()

        unrelated_student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0253",
            name="Unrelated Child",
            grade="Grade 4",
            status="Active",
            created_by=other_parent_user_id,
        )
        unrelated_parent = Parent.objects.create(
            tenant=tenant_a,
            student=unrelated_student,
            name="Unrelated Parent",
            relationship="Parent",
            phone="+1-555-0253",
            email="unrelated-parent@example.com",
            created_by=other_parent_user_id,
        )
        unrelated_invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=unrelated_student,
            parent=unrelated_parent,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total=Decimal("100.00"),
            status="Issued",
        )
        unrelated_payment = Payment.objects.create(
            tenant=tenant_a,
            invoice=unrelated_invoice,
            parent=unrelated_parent,
            amount=Decimal("10.00"),
            status="Completed",
            receipt_id="REC-2026-0253",
        )
        denied_same_tenant_receipt = self.client.get(
            f"/api/v1/payments/{unrelated_payment.payment_id}/receipt",
            HTTP_AUTHORIZATION=f"Bearer {parent_jwt}",
        )
        assert denied_same_tenant_receipt.status_code == 403
