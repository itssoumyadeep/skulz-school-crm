import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from core.business_objects.base import BusinessRuleError
from core.business_objects.sprint5 import (
    CommunicationBundleBO,
    PayrollRunBO,
    ProcurementOrderBO,
    SchoolEventBO,
    StaffMemberBO,
)
from core.models import (
    DeliveryRecord,
    Event,
    LeaveRequest,
    PayrollRun,
    PurchaseOrder,
    Requisition,
    Staff,
    Vendor,
    VendorInvoice,
)


@pytest.mark.django_db
class TestBR0501:
    def test_staff_member_bo_blocks_expired_dbs_for_teaching_role(self, tenant_a):
        with pytest.raises(BusinessRuleError) as exc:
            StaffMemberBO.create_staff(
                tenant_a,
                {
                    'name': 'Nina Patel',
                    'role': 'Teacher',
                    'dept': 'Primary',
                    'employment_type': 'Full_Time',
                    'start_date': date(2025, 1, 1),
                    'salary': Decimal('60000.00'),
                    'certifications': [],
                    'dbs_ref': 'DBS-001',
                    'dbs_expiry': timezone.localdate() - timedelta(days=1),
                },
            )
        assert any(violation.rule_id == 'BR-05-01' for violation in exc.value.violations)


@pytest.mark.django_db
class TestBR0502:
    def test_payroll_run_applies_unpaid_leave_deduction(self, tenant_a):
        staff = Staff.objects.create(
            tenant=tenant_a,
            name='Tom Wills',
            role='Teacher',
            dept='Primary',
            employment_type='Full_Time',
            start_date=date(2025, 1, 1),
            salary=Decimal('3000.00'),
            dbs_ref='DBS-OK',
            dbs_expiry=date(2027, 1, 1),
        )
        LeaveRequest.objects.create(
            tenant=tenant_a,
            requester_id=staff.staff_id,
            requester_type='Staff',
            leave_type='Unpaid',
            start_date=date(2026, 8, 10),
            end_date=date(2026, 8, 12),
            days=Decimal('3.0'),
            reason='Unpaid leave',
            status='Approved',
        )

        payroll = PayrollRunBO.compute_payroll(
            tenant=tenant_a,
            staff=staff,
            period='2026-08',
            base_salary=Decimal('3000.00'),
            allowances={'transport': Decimal('200.00')},
            deductions={'tax': Decimal('100.00')},
        )

        assert payroll.leave_deduction > 0
        assert payroll.net < payroll.gross


@pytest.mark.django_db
class TestBR0601:
    def test_emergency_broadcast_ignores_opt_out_and_logs_delivery(self, tenant_a):
        messages = CommunicationBundleBO.send_emergency_broadcast(
            tenant=tenant_a,
            subject='School Closure',
            body='The campus is closing early today.',
            recipients=[uuid.uuid4(), uuid.uuid4()],
        )

        assert len(messages) == 2
        assert all(message.opt_out_ignored for message in messages)
        assert all(message.delivery_confirmed_at is not None for message in messages)


@pytest.mark.django_db
class TestBR0801:
    def test_procurement_three_way_match_blocks_mismatch(self, tenant_a):
        vendor = Vendor.objects.create(
            tenant=tenant_a,
            name='Campus Supplies Ltd',
            contact_name='Amy',
        )
        requisition = Requisition.objects.create(
            tenant=tenant_a,
            vendor=vendor,
            requester_id=uuid.uuid4(),
            item_name='Projector',
            quantity=1,
            amount=Decimal('500.00'),
        )
        purchase_order = PurchaseOrder.objects.create(
            tenant=tenant_a,
            vendor=vendor,
            requisition=requisition,
            po_number='PO-500',
            amount=Decimal('500.00'),
            status='Issued',
        )
        delivery = DeliveryRecord.objects.create(
            tenant=tenant_a,
            purchase_order=purchase_order,
            vendor=vendor,
            amount=Decimal('450.00'),
            accepted=True,
        )
        invoice = VendorInvoice.objects.create(
            tenant=tenant_a,
            vendor=vendor,
            purchase_order=purchase_order,
            invoice_number='INV-500',
            amount=Decimal('500.00'),
        )

        bo = ProcurementOrderBO(
            requisition=requisition,
            purchase_order=purchase_order,
            delivery_record=delivery,
            vendor_invoice=invoice,
        )

        with pytest.raises(BusinessRuleError) as exc:
            bo.approve_vendor_invoice(approved_by=uuid.uuid4())

        assert any(violation.rule_id == 'BR-08-01' for violation in exc.value.violations)


@pytest.mark.django_db
class TestBR0901:
    def test_event_deadline_must_be_48_hours_before_event(self, tenant_a):
        with pytest.raises(BusinessRuleError) as exc:
            SchoolEventBO.create_event(
                tenant_a,
                {
                    'title': 'Field Trip',
                    'event_date': date(2026, 9, 10),
                    'registration_deadline': date(2026, 9, 9),
                    'location': 'Museum',
                    'description': 'Short notice trip',
                    'fee_amount': Decimal('25.00'),
                    'capacity': 30,
                    'requires_permission_slip': True,
                },
            )

        assert any(violation.rule_id == 'BR-09-01' for violation in exc.value.violations)
