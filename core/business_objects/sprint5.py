from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from core.business_objects.base import BaseBusinessObject, RuleViolation
from core.models import (
    Appraisal,
    DeliveryRecord,
    Event,
    EventVolunteer,
    EventRegistration,
    EventReport,
    LeaveRequest,
    Message,
    NotificationRule,
    PayrollRun,
    PurchaseOrder,
    Requisition,
    Staff,
    Tenant,
    Vendor,
    VendorInvoice,
)


def _as_decimal(value: Any) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(str(value))


class StaffMemberBO(BaseBusinessObject):
    def __init__(self, staff: Optional[Staff] = None, actor_role: str = 'Admin'):
        self.staff = staff
        self.actor_role = actor_role

    def validate_BR_05_01(self) -> Optional[RuleViolation]:
        if not self.staff:
            return None
        teaching_roles = {'Teacher', 'Teaching_Assistant', 'Substitute', 'Instructor'}
        if self.staff.role in teaching_roles and (not self.staff.dbs_expiry or self.staff.dbs_expiry < timezone.localdate()):
            return RuleViolation(
                rule_id='BR-05-01',
                message='Cannot assign teaching duties to staff with missing or expired DBS check.',
                field='dbs_expiry',
            )
        return None

    @classmethod
    def create_staff(cls, tenant: Tenant, data: Dict[str, Any], actor_role: str = 'Admin') -> Staff:
        staff = Staff(tenant=tenant, **data)
        bo = cls(staff=staff, actor_role=actor_role)
        bo.enforce_rules()
        staff.save()
        return staff

    @classmethod
    def compliance_status(cls, staff: Staff) -> Dict[str, Any]:
        bo = cls(staff=staff)
        violation = bo.validate_BR_05_01()
        return {
            'bo': 'StaffMember',
            'staff_id': str(staff.staff_id),
            'staff_name': staff.name,
            'dbs_expiry': staff.dbs_expiry.isoformat() if staff.dbs_expiry else None,
            'dbs_valid': violation is None,
            'eligible_to_teach': violation is None,
        }

    @classmethod
    def create_appraisal(
        cls,
        tenant: Tenant,
        staff_id: UUID,
        appraiser_id: Optional[UUID],
        cycle: str,
        self_score: Decimal,
        manager_score: Decimal,
        outcome: str,
        notes: str,
    ) -> Appraisal:
        return Appraisal.objects.create(
            tenant=tenant,
            staff_id=staff_id,
            appraiser_id=appraiser_id,
            cycle=cycle,
            self_score=self_score,
            manager_score=manager_score,
            outcome=outcome,
            notes=notes,
            status='Submitted',
        )

    def to_dict(self) -> Dict[str, Any]:
        if not self.staff:
            return {'bo': 'StaffMember', 'staff': None}
        return {
            'bo': 'StaffMember',
            'staff': {
                'staff_id': str(self.staff.staff_id),
                'name': self.staff.name,
                'role': self.staff.role,
                'dept': self.staff.dept,
                'employment_type': self.staff.employment_type,
                'salary': float(self.staff.salary),
                'dbs_expiry': self.staff.dbs_expiry.isoformat() if self.staff.dbs_expiry else None,
            },
        }


class PayrollRunBO(BaseBusinessObject):
    def __init__(self, payroll: Optional[PayrollRun] = None, tenant: Optional[Tenant] = None, actor_role: str = 'Admin'):
        self.payroll = payroll
        self.tenant = tenant or (payroll.tenant if payroll else None)
        self.actor_role = actor_role

    @staticmethod
    def _unpaid_leave_days(tenant: Tenant, staff_id: UUID, period: str) -> Decimal:
        year, month = period.split('-')
        leave_requests = LeaveRequest.objects.filter(
            tenant=tenant,
            requester_id=staff_id,
            requester_type='Staff',
            leave_type='Unpaid',
            status='Approved',
            start_date__year=int(year),
            start_date__month=int(month),
        )
        total_days = Decimal('0.0')
        for leave in leave_requests:
            total_days += _as_decimal(leave.days)
        return total_days

    @classmethod
    def compute_payroll(
        cls,
        tenant: Tenant,
        staff: Staff,
        period: str,
        base_salary: Decimal,
        allowances: Optional[Dict[str, Any]] = None,
        deductions: Optional[Dict[str, Any]] = None,
    ) -> PayrollRun:
        allowances = allowances or {}
        deductions = deductions or {}
        allowances_json = {key: float(_as_decimal(value)) for key, value in allowances.items()}
        deductions_json = {key: float(_as_decimal(value)) for key, value in deductions.items()}
        unpaid_days = cls._unpaid_leave_days(tenant, staff.staff_id, period)
        leave_deduction = (_as_decimal(base_salary) / Decimal('30')) * unpaid_days if unpaid_days else Decimal('0.00')

        gross = _as_decimal(base_salary) + sum(_as_decimal(value) for value in allowances.values())
        total_deductions = sum(_as_decimal(value) for value in deductions.values()) + leave_deduction
        net = gross - total_deductions

        payroll = PayrollRun.objects.create(
            tenant=tenant,
            staff_id=staff.staff_id,
            period=period,
            base_salary=base_salary,
            allowances=allowances_json,
            deductions={**deductions_json, 'unpaid_leave_deduction': float(leave_deduction)},
            gross=gross,
            net=net,
            leave_deduction=leave_deduction,
        )
        return payroll

    @classmethod
    def approve_payroll(cls, payroll: PayrollRun, approved_by: UUID) -> PayrollRun:
        payroll.status = 'Approved'
        payroll.approved_by = approved_by
        payroll.approved_at = timezone.now()
        payroll.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return payroll

    def to_dict(self) -> Dict[str, Any]:
        if not self.payroll:
            return {'bo': 'PayrollRun', 'payroll': None}
        return {
            'bo': 'PayrollRun',
            'payroll': {
                'payroll_id': str(self.payroll.payroll_id),
                'staff_id': str(self.payroll.staff_id),
                'period': self.payroll.period,
                'gross': float(self.payroll.gross),
                'net': float(self.payroll.net),
                'status': self.payroll.status,
                'leave_deduction': float(self.payroll.leave_deduction),
            },
        }


class ProcurementOrderBO(BaseBusinessObject):
    def __init__(
        self,
        requisition: Optional[Requisition] = None,
        purchase_order: Optional[PurchaseOrder] = None,
        delivery_record: Optional[DeliveryRecord] = None,
        vendor_invoice: Optional[VendorInvoice] = None,
        actor_role: str = 'Admin',
    ):
        self.requisition = requisition
        self.purchase_order = purchase_order
        self.delivery_record = delivery_record
        self.vendor_invoice = vendor_invoice
        self.actor_role = actor_role

    def validate_BR_08_01(self) -> Optional[RuleViolation]:
        if not (self.requisition and self.delivery_record and self.vendor_invoice):
            return None
        amounts = {
            'requisition': _as_decimal(self.requisition.amount),
            'delivery': _as_decimal(self.delivery_record.amount),
            'invoice': _as_decimal(self.vendor_invoice.amount),
        }
        if len({amounts['requisition'], amounts['delivery'], amounts['invoice']}) != 1:
            return RuleViolation(
                rule_id='BR-08-01',
                message='Vendor payments are blocked until requisition, delivery, and invoice amounts match.',
                field='amount',
            )
        return None

    @classmethod
    def create_requisition(cls, tenant: Tenant, data: Dict[str, Any]) -> Requisition:
        vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=tenant, is_deleted=False)
        return Requisition.objects.create(
            tenant=tenant,
            vendor=vendor,
            requester_id=data['requester_id'],
            item_name=data['item_name'],
            quantity=data.get('quantity', 1),
            amount=data['amount'],
            reason=data.get('reason', ''),
        )

    @classmethod
    def create_purchase_order(cls, tenant: Tenant, data: Dict[str, Any]) -> PurchaseOrder:
        vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=tenant, is_deleted=False)
        requisition = None
        if data.get('requisition_id'):
            requisition = Requisition.objects.get(requisition_id=data['requisition_id'], tenant=tenant, is_deleted=False)
        return PurchaseOrder.objects.create(
            tenant=tenant,
            vendor=vendor,
            requisition=requisition,
            po_number=data['po_number'],
            amount=data['amount'],
            expected_delivery_date=data.get('expected_delivery_date'),
            status='Issued',
        )

    @classmethod
    def record_delivery(cls, tenant: Tenant, data: Dict[str, Any]) -> DeliveryRecord:
        purchase_order = PurchaseOrder.objects.get(po_id=data['purchase_order_id'], tenant=tenant, is_deleted=False)
        vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=tenant, is_deleted=False)
        return DeliveryRecord.objects.create(
            tenant=tenant,
            purchase_order=purchase_order,
            vendor=vendor,
            amount=data['amount'],
            notes=data.get('notes', ''),
            accepted=True,
        )

    @classmethod
    def record_vendor_invoice(cls, tenant: Tenant, data: Dict[str, Any]) -> VendorInvoice:
        vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=tenant, is_deleted=False)
        purchase_order = None
        if data.get('purchase_order_id'):
            purchase_order = PurchaseOrder.objects.get(po_id=data['purchase_order_id'], tenant=tenant, is_deleted=False)
        invoice = VendorInvoice.objects.create(
            tenant=tenant,
            vendor=vendor,
            purchase_order=purchase_order,
            invoice_number=data['invoice_number'],
            amount=data['amount'],
            due_date=data.get('due_date'),
            verified=not data.get('verify_only', False),
        )
        if data.get('verify_only', False):
            invoice.status = 'Pending'
            invoice.save(update_fields=['status', 'updated_at'])
        return invoice

    def approve_vendor_invoice(self, approved_by: UUID) -> VendorInvoice:
        self.enforce_rules()
        self.vendor_invoice.status = 'Approved'
        self.vendor_invoice.approved_by = approved_by
        self.vendor_invoice.approved_at = timezone.now()
        self.vendor_invoice.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return self.vendor_invoice

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'ProcurementOrder'}


class VendorAccountBO(BaseBusinessObject):
    @classmethod
    def create_vendor(cls, tenant: Tenant, data: Dict[str, Any]) -> Vendor:
        return Vendor.objects.create(tenant=tenant, **data)

    @classmethod
    def summary(cls, tenant: Tenant, vendor: Vendor) -> Dict[str, Any]:
        requisitions = Requisition.objects.filter(tenant=tenant, vendor=vendor, is_deleted=False)
        invoices = VendorInvoice.objects.filter(tenant=tenant, vendor=vendor, is_deleted=False)
        total_requisitioned = sum(_as_decimal(req.amount) for req in requisitions)
        total_invoiced = sum(_as_decimal(inv.amount) for inv in invoices)
        blocked_invoices = invoices.filter(status='Blocked').count()
        return {
            'bo': 'VendorAccount',
            'vendor_id': str(vendor.vendor_id),
            'vendor_name': vendor.name,
            'total_requisitioned': float(total_requisitioned),
            'total_invoiced': float(total_invoiced),
            'blocked_invoices': blocked_invoices,
        }

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'VendorAccount'}


class SchoolEventBO(BaseBusinessObject):
    def __init__(self, event: Optional[Event] = None, actor_role: str = 'Admin'):
        self.event = event
        self.actor_role = actor_role

    def validate_BR_09_01(self) -> Optional[RuleViolation]:
        if not self.event:
            return None
        if self.event.registration_deadline > self.event.event_date - timedelta(days=2):
            return RuleViolation(
                rule_id='BR-09-01',
                message='Permission slip deadline must be at least 48 hours before the event.',
                field='registration_deadline',
            )
        return None

    @classmethod
    def create_event(cls, tenant: Tenant, data: Dict[str, Any]) -> Event:
        event = Event(tenant=tenant, **data)
        bo = cls(event=event)
        bo.enforce_rules()
        event.save()
        return event

    @classmethod
    def register_participant(cls, tenant: Tenant, event: Event, data: Dict[str, Any]) -> EventRegistration:
        if data.get('registration_date') and data['registration_date'] > event.registration_deadline:
            raise ValueError('Registration window closed')
        return EventRegistration.objects.create(
            tenant=tenant,
            event=event,
            participant_name=data['participant_name'],
            participant_email=data.get('participant_email', ''),
            participant_phone=data.get('participant_phone', ''),
            permission_slip_received=data.get('permission_slip_received', False),
            payment_status=data.get('payment_status', 'Pending'),
        )

    @classmethod
    def add_volunteer(cls, tenant: Tenant, event: Event, data: Dict[str, Any]) -> EventVolunteer:
        return EventVolunteer.objects.create(tenant=tenant, event=event, **data)

    @classmethod
    def create_report(cls, tenant: Tenant, event: Event) -> EventReport:
        registrations = EventRegistration.objects.filter(tenant=tenant, event=event, is_deleted=False)
        revenue = _as_decimal(event.fee_amount) * registrations.count()
        report, _ = EventReport.objects.get_or_create(
            tenant=tenant,
            event=event,
            defaults={
                'attendees_count': registrations.count(),
                'revenue': revenue,
                'expenses': Decimal('0.00'),
                'summary': f'{event.title} completed with {registrations.count()} registrations.',
            },
        )
        return report

    @classmethod
    def invoice_line_items(cls, event: Event) -> List[Dict[str, Any]]:
        if _as_decimal(event.fee_amount) <= Decimal('0.00'):
            return []
        return [{
            'description': f'Event fee: {event.title}',
            'amount': float(event.fee_amount),
        }]

    def to_dict(self) -> Dict[str, Any]:
        if not self.event:
            return {'bo': 'SchoolEvent', 'event': None}
        return {
            'bo': 'SchoolEvent',
            'event': {
                'event_id': str(self.event.event_id),
                'title': self.event.title,
                'event_date': self.event.event_date.isoformat(),
                'registration_deadline': self.event.registration_deadline.isoformat(),
                'fee_amount': float(self.event.fee_amount),
            },
            'invoice_line_items': self.invoice_line_items(self.event),
        }


class CommunicationBundleBO(BaseBusinessObject):
    @classmethod
    def create_rule(cls, tenant: Tenant, data: Dict[str, Any]) -> NotificationRule:
        return NotificationRule.objects.create(tenant=tenant, **data)

    @classmethod
    def create_message(cls, tenant: Tenant, data: Dict[str, Any]) -> Message:
        return Message.objects.create(tenant=tenant, **data)

    @classmethod
    def send_emergency_broadcast(cls, tenant: Tenant, subject: str, body: str, recipients: List[UUID]) -> List[Message]:
        delivered_messages: List[Message] = []
        with transaction.atomic():
            for recipient_id in recipients:
                delivered_messages.append(
                    Message.objects.create(
                        tenant=tenant,
                        recipient_id=recipient_id,
                        channel='Push',
                        subject=subject,
                        body=body,
                        trigger_event='Emergency_Broadcast',
                        delivery_status='Delivered',
                        opt_out_ignored=True,
                        delivery_confirmed_at=timezone.now(),
                    )
                )
        return delivered_messages

    @classmethod
    def evaluate_rules(cls, tenant: Tenant, trigger_event: str) -> List[NotificationRule]:
        return list(NotificationRule.objects.filter(tenant=tenant, trigger_event=trigger_event, active=True, is_deleted=False).order_by('priority'))

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'CommunicationBundle'}
