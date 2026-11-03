from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from core.business_objects.base import BaseBusinessObject, RuleViolation, BusinessRuleError
from core.models import (
    Appraisal,
    Contract,
    CPDRecord,
    DeliveryRecord,
    Event,
    EventVolunteer,
    EventRegistration,
    EventReport,
    Inventory,
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
    def update_staff(cls, staff: Staff, data: Dict[str, Any], actor_role: str = 'Admin') -> Staff:
        for field, value in data.items():
            if value is not None:
                setattr(staff, field, value)
        bo = cls(staff=staff, actor_role=actor_role)
        bo.enforce_rules()
        staff.save()
        return staff

    @classmethod
    def delete_staff(cls, staff: Staff) -> Staff:
        staff.active = False
        staff.is_deleted = True
        staff.save(update_fields=['active', 'is_deleted', 'updated_at'])
        return staff

    @classmethod
    def create_contract(cls, tenant: Tenant, staff_id: UUID, data: Dict[str, Any]) -> Contract:
        return Contract.objects.create(
            tenant=tenant,
            staff_id=staff_id,
            contract_type=data.get('contract_type', 'Standard'),
            start_date=data['start_date'],
            end_date=data.get('end_date'),
            esigned_at=timezone.now() if data.get('esigned') else None,
            renewal_alert_sent=data.get('renewal_alert_sent', False),
        )

    @classmethod
    def update_contract(cls, contract: Contract, data: Dict[str, Any]) -> Contract:
        new_start = data.get('start_date') or contract.start_date
        new_end = data.get('end_date') if 'end_date' in data else contract.end_date
        if new_end and new_end < new_start:
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-05-01',
                message='Contract end_date cannot be earlier than start_date.',
                field='end_date',
            )])
        for field in ['contract_type', 'start_date', 'end_date', 'renewal_alert_sent']:
            if data.get(field) is not None:
                setattr(contract, field, data[field])
        if data.get('esigned') is True and not contract.esigned_at:
            contract.esigned_at = timezone.now()
        contract.save()
        return contract

    @classmethod
    def delete_contract(cls, contract: Contract) -> Contract:
        contract.is_deleted = True
        contract.save(update_fields=['is_deleted', 'updated_at'])
        return contract

    @classmethod
    def update_appraisal(cls, appraisal: Appraisal, data: Dict[str, Any]) -> Appraisal:
        for field in ['self_score', 'manager_score', 'outcome', 'status', 'notes']:
            if data.get(field) is not None:
                setattr(appraisal, field, data[field])
        appraisal.save()
        return appraisal

    @classmethod
    def create_cpd(cls, tenant: Tenant, staff_id: UUID, data: Dict[str, Any]) -> CPDRecord:
        completed_at = timezone.now() if data.get('completion_status') == 'Completed' else None
        return CPDRecord.objects.create(
            tenant=tenant,
            staff_id=staff_id,
            activity=data['activity'],
            activity_type=data['activity_type'],
            hours=data.get('hours', Decimal('0.00')),
            mandatory=data.get('mandatory', False),
            completion_status=data.get('completion_status', 'Planned'),
            completed_at=completed_at,
        )

    @classmethod
    def update_cpd(cls, cpd: CPDRecord, data: Dict[str, Any]) -> CPDRecord:
        for field in ['activity', 'activity_type', 'hours', 'mandatory', 'completion_status']:
            if data.get(field) is not None:
                setattr(cpd, field, data[field])
        if cpd.completion_status == 'Completed' and not cpd.completed_at:
            cpd.completed_at = timezone.now()
        cpd.save()
        return cpd

    @classmethod
    def delete_cpd(cls, cpd: CPDRecord) -> CPDRecord:
        cpd.is_deleted = True
        cpd.save(update_fields=['is_deleted', 'updated_at'])
        return cpd

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
        if not self.requisition or not self.delivery_record:
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-08-01',
                message='Vendor payments are blocked until requisition, delivery, and invoice records exist and match.',
                field='amount',
            )])
        self.enforce_rules()
        self.vendor_invoice.status = 'Approved'
        self.vendor_invoice.verified = True
        self.vendor_invoice.approved_by = approved_by
        self.vendor_invoice.approved_at = timezone.now()
        self.vendor_invoice.save(update_fields=['status', 'verified', 'approved_by', 'approved_at', 'updated_at'])
        return self.vendor_invoice

    @classmethod
    def update_requisition(cls, requisition: Requisition, data: Dict[str, Any], actor_id: Optional[UUID] = None) -> Requisition:
        for field in ['item_name', 'quantity', 'amount', 'reason', 'status']:
            if data.get(field) is not None:
                setattr(requisition, field, data[field])
        if requisition.status == 'Approved' and actor_id and not requisition.approved_by:
            requisition.approved_by = actor_id
            requisition.approved_at = timezone.now()
        requisition.save()
        return requisition

    @classmethod
    def delete_requisition(cls, requisition: Requisition) -> Requisition:
        if PurchaseOrder.objects.filter(requisition=requisition, is_deleted=False).exists():
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-08-01',
                message='Cannot delete a requisition with an active Purchase Order.',
                field='requisition_id',
            )])
        requisition.is_deleted = True
        requisition.save(update_fields=['is_deleted', 'updated_at'])
        return requisition

    @classmethod
    def update_purchase_order(cls, po: PurchaseOrder, data: Dict[str, Any], actor_id: Optional[UUID] = None) -> PurchaseOrder:
        for field in ['amount', 'expected_delivery_date', 'status']:
            if data.get(field) is not None:
                setattr(po, field, data[field])
        if actor_id and po.status in {'Issued', 'Received', 'Closed'} and not po.approved_by:
            po.approved_by = actor_id
            po.approved_at = timezone.now()
        po.save()
        return po

    @classmethod
    def update_delivery_record(cls, delivery: DeliveryRecord, data: Dict[str, Any], actor_id: Optional[UUID] = None) -> DeliveryRecord:
        for field in ['amount', 'notes', 'accepted']:
            if data.get(field) is not None:
                setattr(delivery, field, data[field])
        if actor_id and not delivery.received_by:
            delivery.received_by = actor_id
        delivery.save()
        return delivery

    @classmethod
    def create_inventory_item(cls, tenant: Tenant, data: Dict[str, Any]) -> Inventory:
        vendor = None
        if data.get('vendor_id'):
            vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=tenant, is_deleted=False)
        return Inventory.objects.create(
            tenant=tenant,
            vendor=vendor,
            item_name=data['item_name'],
            sku=data.get('sku', ''),
            quantity_on_hand=data.get('quantity_on_hand', 0),
            reorder_level=data.get('reorder_level', 0),
            unit_cost=data.get('unit_cost', Decimal('0.00')),
            last_restocked=data.get('last_restocked'),
        )

    @classmethod
    def update_inventory_item(cls, item: Inventory, data: Dict[str, Any]) -> Inventory:
        if 'vendor_id' in data and data['vendor_id'] is not None:
            item.vendor = Vendor.objects.get(vendor_id=data['vendor_id'], tenant=item.tenant, is_deleted=False)
        for field in ['item_name', 'sku', 'quantity_on_hand', 'reorder_level', 'unit_cost', 'last_restocked']:
            if data.get(field) is not None:
                setattr(item, field, data[field])
        item.save()
        return item

    @classmethod
    def delete_inventory_item(cls, item: Inventory) -> Inventory:
        item.is_deleted = True
        item.save(update_fields=['is_deleted', 'updated_at'])
        return item

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'ProcurementOrder'}


class VendorAccountBO(BaseBusinessObject):
    @classmethod
    def create_vendor(cls, tenant: Tenant, data: Dict[str, Any]) -> Vendor:
        return Vendor.objects.create(tenant=tenant, **data)

    @classmethod
    def update_vendor(cls, vendor: Vendor, data: Dict[str, Any]) -> Vendor:
        for field in ['name', 'contact_name', 'phone', 'email', 'payment_terms', 'active']:
            if data.get(field) is not None:
                setattr(vendor, field, data[field])
        vendor.save()
        return vendor

    @classmethod
    def delete_vendor(cls, vendor: Vendor) -> Vendor:
        vendor.active = False
        vendor.is_deleted = True
        vendor.save(update_fields=['active', 'is_deleted', 'updated_at'])
        return vendor

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
    def update_event(cls, event: Event, data: Dict[str, Any]) -> Event:
        for field in [
            'title', 'event_date', 'registration_deadline', 'location',
            'description', 'fee_amount', 'capacity', 'requires_permission_slip', 'status',
        ]:
            if data.get(field) is not None:
                setattr(event, field, data[field])
        bo = cls(event=event)
        bo.enforce_rules()
        event.save()
        return event

    @classmethod
    def delete_event(cls, event: Event) -> Event:
        event.is_deleted = True
        event.save(update_fields=['is_deleted', 'updated_at'])
        return event

    @classmethod
    def update_registration(cls, registration: EventRegistration, data: Dict[str, Any]) -> EventRegistration:
        for field in ['registration_status', 'permission_slip_received', 'payment_status']:
            if data.get(field) is not None:
                setattr(registration, field, data[field])
        registration.save()
        return registration

    @classmethod
    def delete_registration(cls, registration: EventRegistration) -> EventRegistration:
        registration.registration_status = 'Cancelled'
        registration.is_deleted = True
        registration.save(update_fields=['registration_status', 'is_deleted', 'updated_at'])
        return registration

    @classmethod
    def delete_volunteer(cls, volunteer: EventVolunteer) -> EventVolunteer:
        volunteer.is_deleted = True
        volunteer.save(update_fields=['is_deleted', 'updated_at'])
        return volunteer

    @classmethod
    def update_report(cls, tenant: Tenant, event: Event, data: Dict[str, Any]) -> EventReport:
        report = cls.create_report(tenant, event)
        for field in ['attendees_count', 'revenue', 'expenses', 'summary']:
            if data.get(field) is not None:
                setattr(report, field, data[field])
        report.published_at = timezone.now()
        report.save()
        return report

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
    def update_rule(cls, rule: NotificationRule, data: Dict[str, Any]) -> NotificationRule:
        for field in ['template_name', 'conditions', 'active', 'priority', 'emergency']:
            if data.get(field) is not None:
                setattr(rule, field, data[field])
        rule.save()
        return rule

    @classmethod
    def delete_rule(cls, rule: NotificationRule) -> NotificationRule:
        if rule.emergency:
            raise BusinessRuleError([RuleViolation(
                rule_id='BR-06-01',
                message='Emergency notification rules cannot be deleted.',
                field='emergency',
            )])
        rule.active = False
        rule.is_deleted = True
        rule.save(update_fields=['active', 'is_deleted', 'updated_at'])
        return rule

    @classmethod
    def create_message(cls, tenant: Tenant, data: Dict[str, Any]) -> Message:
        return Message.objects.create(tenant=tenant, **data)

    @classmethod
    def update_message(cls, message: Message, data: Dict[str, Any]) -> Message:
        if data.get('delivery_status') is not None:
            message.delivery_status = data['delivery_status']
            if message.delivery_status == 'Delivered' and not message.delivery_confirmed_at:
                message.delivery_confirmed_at = timezone.now()
            message.save()
        return message

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
