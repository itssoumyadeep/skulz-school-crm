import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction

from .base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Tenant, Student, Parent, FeeStructure, Invoice,
    Payment, DiscountWaiver, Reconciliation, AuditLog,
    TenantSequence
)


def generate_receipt_number(tenant: Tenant) -> str:
    year = timezone.now().year
    with transaction.atomic():
        seq_obj, _ = TenantSequence.objects.select_for_update().get_or_create(
            tenant=tenant,
            sequence_type='RECEIPT',
            year=year,
            defaults={'last_value': 0}
        )
        seq_obj.last_value += 1
        seq_obj.save(update_fields=['last_value', 'updated_at'])
        num = seq_obj.last_value
    return f"REC-{year}-{num:05d}"


class FeeAccountBO(BaseBusinessObject):
    """
    BO-10: FeeAccount
    Domain: Finance
    Source Entities: INVOICE, PAYMENT, DISCOUNT_WAIVER, FEE_STRUCTURE, STUDENT, PARENT
    """
    def __init__(
        self,
        student: Optional[Student] = None,
        actor_role: str = 'Admin',
        tenant: Optional[Tenant] = None,
        invoice: Optional[Invoice] = None,
        fee_structure: Optional[FeeStructure] = None,
        payment: Optional[Payment] = None,
        reconciliation: Optional[Reconciliation] = None,
        amount: Optional[Decimal] = None,
        discount_type: Optional[str] = None,
        reason: Optional[str] = None,
        approver_id: Optional[uuid.UUID] = None,
        approver_role: str = 'Admin',
        refund_amount: Optional[Decimal] = None,
        invoice_date: Optional[date] = None,
        due_date: Optional[date] = None,
        line_items: Optional[List[Dict[str, Any]]] = None,
        target_invoice_status: Optional[str] = None,
        operation: Optional[str] = None,
    ):
        self.student = student
        self.actor_role = actor_role
        self.tenant = tenant or (student.tenant if student else None)
        self.invoice = invoice
        self.fee_structure = fee_structure
        self.payment = payment
        self.reconciliation = reconciliation
        self.amount = amount
        self.discount_type = discount_type
        self.reason = reason
        self.approver_id = approver_id
        self.approver_role = approver_role
        self.refund_amount = refund_amount
        self.invoice_date = invoice_date
        self.due_date = due_date
        self.line_items = line_items or []
        self.target_invoice_status = target_invoice_status
        self.operation = operation

    def validate_BR_02_01(self) -> Optional[RuleViolation]:
        """
        BR-02-01: Invoice generation is only allowed for students that belong to
        the tenant and are in an active enrollment state for the selected term.
        """
        if self.operation not in {'create_invoice', 'bulk_generate'}:
            return None

        if self.student and self.student.tenant_id != self.tenant.tenant_id:
            return RuleViolation(
                rule_id='BR-02-01',
                message='Invoice generation tenant mismatch detected.',
                field='tenant'
            )

        if self.student and self.student.status not in {'Active', 'Offered', 'Accepted'}:
            return RuleViolation(
                rule_id='BR-02-01',
            message='Invoices can only be generated for Active, Offered, or Accepted students.',
                field='student'
            )
        return None

    def validate_BR_02_02(self) -> Optional[RuleViolation]:
        """
        BR-02-02: Late fee can only be applied after due date plus grace period.
        """
        if self.operation != 'apply_late_fee' or not self.invoice or not self.fee_structure:
            return None

        grace_period_days = int((self.fee_structure.penalty_rules or {}).get('grace_period_days', 0))
        allowed_date = self.invoice.due_date + timedelta(days=grace_period_days)
        if timezone.localdate() <= allowed_date:
            return RuleViolation(
                rule_id='BR-02-02',
                message='Late fee cannot be applied before the grace period expires.',
                field='due_date'
            )
        return None

    def validate_BR_02_03(self) -> Optional[RuleViolation]:
        """
        BR-02-03: Discount or waiver above the tenant threshold requires Owner approval.
        """
        if self.operation != 'apply_discount' or self.amount is None:
            return None

        if self.amount > Decimal('200.00') and self.approver_role != 'Owner':
            return RuleViolation(
                rule_id='BR-02-03',
                message='High-value discount requires Owner approval.',
                field='amount'
            )
        return None

    def validate_BR_02_04(self) -> Optional[RuleViolation]:
        """
        BR-02-04: Refunds above the tenant threshold require Owner approval.
        """
        if self.operation != 'refund' or self.refund_amount is None:
            return None

        if self.refund_amount > Decimal('500.00') and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-02-04',
                message='Refunds above the configured threshold require Owner approval.',
                field='refund_amount'
            )
        return None

    def validate_BR_02_05(self) -> Optional[RuleViolation]:
        """
        BR-02-05: An invoice cannot be finalized as Paid while any balance remains.
        """
        if self.operation != 'record_payment' or not self.invoice or self.amount is None:
            return None

        completed_paid = sum(
            payment.amount for payment in self.invoice.payments.filter(status='Completed', is_deleted=False)
        )
        projected_paid = completed_paid + self.amount
        if self.target_invoice_status == 'Paid' and projected_paid < self.invoice.total:
            return RuleViolation(
                rule_id='BR-02-05',
                message='Invoice cannot be marked Paid while an outstanding balance remains.',
                field='invoice'
            )
        return None

    def validate_BR_02_06(self) -> Optional[RuleViolation]:
        """
        BR-02-06: Reconciliation finalization with discrepancies requires Owner override.
        """
        if self.operation != 'finalize_reconciliation' or not self.reconciliation:
            return None

        if self.reconciliation.discrepancies and len(self.reconciliation.discrepancies) > 0 and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-02-06',
                message='Cannot finalize reconciliation while discrepancies remain.',
                field='discrepancies'
            )
        return None

    @classmethod
    def create_invoice(
        cls,
        tenant: Tenant,
        student: Student,
        parent: Parent,
        invoice_date: date,
        due_date: date,
        line_items: List[Dict[str, Any]],
        fee_structure: Optional[FeeStructure] = None,
        invoice_type: str = "Tuition"
    ) -> Invoice:
        bo = cls(
            student=student,
            actor_role='Admin',
            tenant=tenant,
            fee_structure=fee_structure,
            invoice_date=invoice_date,
            due_date=due_date,
            line_items=line_items,
            operation='create_invoice'
        )
        bo.enforce_rules()

        items = line_items or (fee_structure.components if fee_structure else [])
        total = sum(Decimal(str(item["amount"])) for item in items)
        invoice = Invoice.objects.create(
            tenant=tenant,
            student=student,
            parent=parent,
            fee_structure=fee_structure,
            invoice_date=invoice_date,
            due_date=due_date,
            line_items=items,
            total=total,
            status='Issued',
            invoice_type=invoice_type
        )
        return invoice

    @classmethod
    def bulk_generate_invoices(
        cls,
        tenant: Tenant,
        fee_structure: FeeStructure,
        invoice_date: date,
        due_date: date
    ) -> List[Invoice]:
        bo = cls(
            tenant=tenant,
            fee_structure=fee_structure,
            invoice_date=invoice_date,
            due_date=due_date,
            operation='bulk_generate'
        )
        bo.enforce_rules()

        students = Student.objects.filter(
            tenant=tenant,
            grade=fee_structure.grade,
            status__in=['Active', 'Offered'],
            is_deleted=False
        ).prefetch_related('parents')

        invoices = []
        with transaction.atomic():
            for student in students:
                parent = student.parents.filter(is_deleted=False).first()
                if not parent:
                    continue

                inv = cls.create_invoice(
                    tenant=tenant,
                    student=student,
                    parent=parent,
                    invoice_date=invoice_date,
                    due_date=due_date,
                    line_items=fee_structure.components,
                    fee_structure=fee_structure,
                    invoice_type="Tuition"
                )
                invoices.append(inv)
        return invoices

    @classmethod
    def apply_discount_waiver(
        cls,
        tenant: Tenant,
        invoice: Invoice,
        discount_type: str,
        amount: Decimal,
        reason: str,
        approver_id: uuid.UUID,
        approver_role: str = 'Admin'
    ) -> DiscountWaiver:
        bo = cls(
            invoice=invoice,
            tenant=tenant,
            amount=amount,
            discount_type=discount_type,
            reason=reason,
            approver_id=approver_id,
            approver_role=approver_role,
            operation='apply_discount'
        )
        bo.enforce_rules()

        with transaction.atomic():
            discount = DiscountWaiver.objects.create(
                tenant=tenant,
                invoice=invoice,
                student=invoice.student,
                discount_type=discount_type,
                amount=amount,
                reason=reason,
                approved_by=approver_id
            )

            # Adjust invoice total or mark waived
            new_total = max(Decimal("0.00"), invoice.total - amount)
            invoice.total = new_total
            if new_total == Decimal("0.00"):
                invoice.status = 'Waived'
            invoice.save(update_fields=['total', 'status', 'updated_at'])

            # BR-02-04: Immutable audit log for discount
            AuditLog.objects.create(
                tenant=tenant,
                actor_id=approver_id,
                action='CREATE',
                entity='DiscountWaiver',
                entity_id=str(discount.discount_id),
                new_values={
                    "invoice_id": str(invoice.invoice_id),
                    "amount": str(amount),
                    "discount_type": discount_type,
                    "reason": reason,
                    "approved_by": str(approver_id)
                }
            )

        return discount

    def compute_account_summary(self) -> Dict[str, Any]:
        invoices = Invoice.objects.filter(
            tenant=self.student.tenant,
            student=self.student,
            is_deleted=False
        ).order_by('-due_date')

        total_invoiced = sum(i.total for i in invoices)
        
        # Total payments against student invoices
        payments = Payment.objects.filter(
            tenant=self.student.tenant,
            invoice__student=self.student,
            status='Completed',
            is_deleted=False
        )
        total_paid = sum(p.amount for p in payments)
        outstanding_balance = max(Decimal("0.00"), total_invoiced - total_paid)

        next_due = invoices.filter(status__in=['Issued', 'Partially_Paid', 'Overdue']).first()

        return {
            "bo": "FeeAccount",
            "student_id": str(self.student.student_id),
            "student_name": self.student.name,
            "total_invoiced": float(total_invoiced),
            "total_paid": float(total_paid),
            "outstanding_balance": float(outstanding_balance),
            "next_due_date": next_due.due_date.isoformat() if next_due else None,
            "invoices_count": invoices.count(),
            "invoices": [
                {
                    "invoice_id": str(i.invoice_id),
                    "invoice_date": i.invoice_date.isoformat(),
                    "due_date": i.due_date.isoformat(),
                    "total": float(i.total),
                    "status": i.status,
                    "invoice_type": i.invoice_type
                }
                for i in invoices[:10]
            ]
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.compute_account_summary()

    def apply_late_fee(self, fee_amount: Decimal) -> Invoice:
        bo = FeeAccountBO(
            student=self.student,
            actor_role=self.actor_role,
            tenant=self.tenant,
            invoice=self.invoice,
            fee_structure=self.fee_structure,
            operation='apply_late_fee'
        )
        bo.enforce_rules()

        self.invoice.total += fee_amount
        self.invoice.save(update_fields=['total', 'updated_at'])
        return self.invoice


class PaymentTransactionBO(BaseBusinessObject):
    """
    BO-11: PaymentTransaction
    Domain: Finance
    Source Entities: PAYMENT, INVOICE, PARENT
    """
    def __init__(
        self,
        payment: Optional[Payment] = None,
        actor_role: str = 'Parent',
        tenant: Optional[Tenant] = None,
        invoice: Optional[Invoice] = None,
        parent: Optional[Parent] = None,
        amount: Optional[Decimal] = None,
        method: str = 'Card',
        txn_ref: str = '',
        refund_amount: Optional[Decimal] = None,
        target_invoice_status: Optional[str] = None,
        operation: Optional[str] = None,
    ):
        self.payment = payment
        self.actor_role = actor_role
        self.tenant = tenant or (payment.tenant if payment else None)
        self.invoice = invoice or (payment.invoice if payment else None)
        self.parent = parent or (payment.parent if payment else None)
        self.amount = amount or (payment.amount if payment else None)
        self.method = method
        self.txn_ref = txn_ref
        self.refund_amount = refund_amount or Decimal('0.00')
        self.target_invoice_status = target_invoice_status
        self.operation = operation

    def validate_BR_02_04(self) -> Optional[RuleViolation]:
        if self.operation != 'refund' or self.refund_amount is None:
            return None

        if self.refund_amount > Decimal('500.00') and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-02-04',
                message='Refunds above the configured threshold require Owner approval.',
                field='refund_amount'
            )
        return None

    @classmethod
    def record_payment(
        cls,
        tenant: Tenant,
        invoice: Invoice,
        parent: Parent,
        amount: Decimal,
        method: str = "Card",
        txn_ref: str = ""
    ) -> Payment:
        projected_total = sum(
            payment.amount for payment in invoice.payments.filter(status='Completed', is_deleted=False)
        ) + amount
        target_status = 'Paid' if projected_total >= invoice.total else 'Partially_Paid'
        bo = cls(
            payment=None,
            invoice=invoice,
            parent=parent,
            tenant=tenant,
            amount=amount,
            method=method,
            txn_ref=txn_ref,
            target_invoice_status=target_status,
            operation='record_payment'
        )
        bo.enforce_rules()

        receipt_no = generate_receipt_number(tenant)
        with transaction.atomic():
            payment = Payment.objects.create(
                tenant=tenant,
                invoice=invoice,
                parent=parent,
                amount=amount,
                method=method,
                txn_ref=txn_ref or f"TXN-{uuid.uuid4().hex[:8].upper()}",
                status='Completed',
                receipt_id=receipt_no
            )

            # Update invoice balance status
            total_paid = sum(
                p.amount for p in Payment.objects.filter(
                    invoice=invoice, status='Completed', is_deleted=False
                )
            )

            if total_paid >= invoice.total:
                invoice.status = 'Paid'
            elif total_paid > 0:
                invoice.status = 'Partially_Paid'
            invoice.save(update_fields=['status', 'updated_at'])

        return payment

    def process_refund(self, refund_amount: Decimal, refund_actor_id: uuid.UUID, actor_role: str = 'Admin') -> None:
        bo = PaymentTransactionBO(
            payment=self.payment,
            actor_role=actor_role,
            refund_amount=refund_amount,
            operation='refund',
        )
        bo.enforce_rules()

        with transaction.atomic():
            self.payment.refund_amount = refund_amount
            self.payment.status = 'Refunded'
            self.payment.refunded_by = refund_actor_id
            self.payment.refund_date = timezone.now()
            self.payment.save()

            # Re-evaluate invoice status
            invoice = self.payment.invoice
            remaining_paid = sum(
                p.amount for p in Payment.objects.filter(
                    invoice=invoice, status='Completed', is_deleted=False
                )
            )
            if remaining_paid < invoice.total:
                invoice.status = 'Partially_Paid' if remaining_paid > 0 else 'Issued'
                invoice.save(update_fields=['status', 'updated_at'])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bo": "PaymentTransaction",
            "payment_id": str(self.payment.payment_id),
            "invoice_id": str(self.payment.invoice.invoice_id),
            "receipt_id": self.payment.receipt_id,
            "amount": float(self.payment.amount),
            "method": self.payment.method,
            "status": self.payment.status,
            "txn_ref": self.payment.txn_ref,
            "refund_amount": float(self.payment.refund_amount)
        }


class FinancialStatementBO(BaseBusinessObject):
    """
    BO-12: FinancialStatement
    Domain: Finance
    Source Entities: RECONCILIATION, INVOICE, PAYMENT, DISCOUNT_WAIVER
    """
    def __init__(self, tenant: Tenant, period: str, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.period = period
        self.actor_role = actor_role
        self.reconciliation: Optional[Reconciliation] = None
        self.operation: Optional[str] = None

    def validate_BR_02_06(self) -> Optional[RuleViolation]:
        if self.operation != 'finalize_reconciliation' or not self.reconciliation:
            return None

        if self.reconciliation.discrepancies and len(self.reconciliation.discrepancies) > 0 and self.actor_role != 'Owner':
            return RuleViolation(
                rule_id='BR-02-06',
                message='Cannot finalize reconciliation while discrepancies remain.',
                field='discrepancies'
            )
        return None

    def generate_statement(self) -> Dict[str, Any]:
        invoices = Invoice.objects.filter(tenant=self.tenant, is_deleted=False)
        payments = Payment.objects.filter(tenant=self.tenant, status='Completed', is_deleted=False)
        discounts = DiscountWaiver.objects.filter(tenant=self.tenant, is_deleted=False)

        total_invoiced = sum(i.total for i in invoices)
        total_collected = sum(p.amount for p in payments)
        total_discounts = sum(d.amount for d in discounts)
        total_outstanding = max(Decimal("0.00"), total_invoiced - total_collected)

        return {
            "bo": "FinancialStatement",
            "period": self.period,
            "total_invoiced": float(total_invoiced),
            "total_collected": float(total_collected),
            "total_discounts_waived": float(total_discounts),
            "total_outstanding": float(total_outstanding),
            "collection_rate": float(round((total_collected / total_invoiced) * 100, 2)) if total_invoiced > 0 else 100.0
        }

    @classmethod
    def get_or_create_reconciliation(cls, tenant: Tenant, period: str) -> Reconciliation:
        recon = Reconciliation.objects.filter(tenant=tenant, period=period, is_deleted=False).first()
        if recon:
            return recon
        return Reconciliation.objects.create(tenant=tenant, period=period, status='Draft')

    def finalize_reconciliation(self, recon: Reconciliation, actor_role: str = 'Admin') -> None:
        bo = FinancialStatementBO(
            tenant=self.tenant,
            period=self.period,
            actor_role=actor_role,
        )
        bo.reconciliation = recon
        bo.operation = 'finalize_reconciliation'
        bo.enforce_rules()

        recon.status = 'Finalized'
        recon.finalized_at = timezone.now()
        recon.save(update_fields=['status', 'finalized_at', 'updated_at'])

    def to_dict(self) -> Dict[str, Any]:
        return self.generate_statement()
