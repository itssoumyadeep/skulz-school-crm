import uuid
from datetime import date
from decimal import Decimal

import pytest

from core.business_objects.base import BusinessRuleError
from core.business_objects.billing import (
    FeeAccountBO,
    PaymentTransactionBO,
    FinancialStatementBO,
)
from core.models import Student, Parent, FeeStructure, Invoice, Payment, Reconciliation


@pytest.mark.django_db
class TestBR0201:
    def test_invoice_generation_requires_active_or_offered_student(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0101",
            name="Billing Test Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Inactive",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Billing Parent",
            relationship="Parent",
            phone="+1-555-0101",
            email="parent@example.com",
        )
        fee_structure = FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Grade 1",
            term="Term 1",
            components=[{"description": "Tuition", "amount": 1000.00}],
            penalty_rules={"grace_period_days": 7, "late_fee_amount": 50.00},
        )

        with pytest.raises(BusinessRuleError) as exc_info:
            FeeAccountBO.create_invoice(
                tenant=tenant_a,
                student=student,
                parent=parent,
                invoice_date=date(2026, 8, 1),
                due_date=date(2026, 8, 15),
                line_items=fee_structure.components,
                fee_structure=fee_structure,
            )

        assert any(v.rule_id == "BR-02-01" for v in exc_info.value.violations)


@pytest.mark.django_db
class TestBR0202:
    def test_late_fee_only_after_grace_period(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0102",
            name="Late Fee Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=student,
            parent=Parent.objects.create(
                tenant=tenant_a,
                student=student,
                name="Late Fee Parent",
                relationship="Parent",
                phone="+1-555-0102",
                email="late@example.com",
            ),
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 9, 15),
            line_items=[{"description": "Tuition", "amount": 1000.00}],
            total=Decimal("1000.00"),
            status="Issued",
        )
        fee_structure = FeeStructure.objects.create(
            tenant=tenant_a,
            grade="Grade 1",
            term="Term 1",
            components=[{"description": "Tuition", "amount": 1000.00}],
            penalty_rules={"grace_period_days": 7, "late_fee_amount": 50.00},
        )

        bo = FeeAccountBO(
            student=student,
            tenant=tenant_a,
            invoice=invoice,
            fee_structure=fee_structure,
            operation="apply_late_fee",
        )

        with pytest.raises(BusinessRuleError) as exc_info:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-02-02" for v in exc_info.value.violations)


@pytest.mark.django_db
class TestBR0203:
    def test_high_value_discount_requires_owner(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0103",
            name="Discount Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Discount Parent",
            relationship="Parent",
            phone="+1-555-0103",
            email="discount@example.com",
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

        with pytest.raises(BusinessRuleError) as exc_info:
            FeeAccountBO.apply_discount_waiver(
                tenant=tenant_a,
                invoice=invoice,
                discount_type="Discretionary",
                amount=Decimal("250.00"),
                reason="Manual adjustment",
                approver_id=uuid.uuid4(),
                approver_role="Admin",
            )

        assert any(v.rule_id == "BR-02-03" for v in exc_info.value.violations)


@pytest.mark.django_db
class TestBR0204:
    def test_high_value_refund_requires_owner(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0104",
            name="Refund Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Refund Parent",
            relationship="Parent",
            phone="+1-555-0104",
            email="refund@example.com",
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
        payment = PaymentTransactionBO.record_payment(
            tenant=tenant_a,
            invoice=invoice,
            parent=parent,
            amount=Decimal("1000.00"),
            method="Card",
        )

        bo = PaymentTransactionBO(payment=payment, actor_role="Admin")
        with pytest.raises(BusinessRuleError) as exc_info:
            bo.process_refund(Decimal("600.00"), uuid.uuid4(), actor_role="Admin")

        assert any(v.rule_id == "BR-02-04" for v in exc_info.value.violations)


@pytest.mark.django_db
class TestBR0205:
    def test_invoice_cannot_be_marked_paid_with_balance_remaining(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0105",
            name="Partial Pay Child",
            dob=date(2019, 1, 1),
            grade="Grade 1",
            status="Active",
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name="Partial Parent",
            relationship="Parent",
            phone="+1-555-0105",
            email="partial@example.com",
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

        bo = FeeAccountBO(
            student=student,
            tenant=tenant_a,
            invoice=invoice,
            amount=Decimal("100.00"),
            target_invoice_status="Paid",
            operation="record_payment",
        )

        with pytest.raises(BusinessRuleError) as exc_info:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-02-05" for v in exc_info.value.violations)


@pytest.mark.django_db
class TestBR0206:
    def test_reconciliation_requires_owner_when_discrepancies_exist(self, tenant_a):
        recon = Reconciliation.objects.create(
            tenant=tenant_a,
            period="2026-08",
            discrepancies=[{"issue": "missing receipt", "amount": 25.00}],
            status="Draft",
        )
        bo = FinancialStatementBO(tenant=tenant_a, period="2026-08", actor_role="Admin")
        bo.reconciliation = recon
        bo.operation = "finalize_reconciliation"

        with pytest.raises(BusinessRuleError) as exc_info:
            bo.enforce_rules()

        assert any(v.rule_id == "BR-02-06" for v in exc_info.value.violations)
