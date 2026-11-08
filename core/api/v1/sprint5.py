"""API v1 endpoints for HR appraisals, staff contracts, CPD, payroll leave deductions, vendor procurement, events, and communications."""

from uuid import UUID

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_vendor_access
from core.business_objects.sprint5 import (
    CommunicationBundleBO,
    PayrollRunBO,
    ProcurementOrderBO,
    SchoolEventBO,
    StaffMemberBO,
    VendorAccountBO,
)
from core.models import (
    Appraisal,
    Contract,
    CPDRecord,
    DeliveryRecord,
    Event,
    EventRegistration,
    EventReport,
    EventVolunteer,
    Inventory,
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
from core.schemas.base import build_response, build_error
from core.schemas.sprint5 import (
    AppraisalCreateSchema,
    AppraisalUpdateSchema,
    ContractCreateSchema,
    ContractUpdateSchema,
    CPDRecordCreateSchema,
    CPDRecordUpdateSchema,
    DeliveryRecordCreateSchema,
    DeliveryRecordUpdateSchema,
    EmergencyBroadcastSchema,
    EventCreateSchema,
    EventRegistrationCreateSchema,
    EventRegistrationUpdateSchema,
    EventReportUpdateSchema,
    EventUpdateSchema,
    EventVolunteerCreateSchema,
    InventoryCreateSchema,
    InventoryUpdateSchema,
    MessageCreateSchema,
    MessageUpdateSchema,
    NotificationRuleCreateSchema,
    NotificationRuleUpdateSchema,
    PayrollApproveSchema,
    PayrollComputeSchema,
    PurchaseOrderCreateSchema,
    PurchaseOrderUpdateSchema,
    RequisitionCreateSchema,
    RequisitionUpdateSchema,
    StaffCreateSchema,
    StaffUpdateSchema,
    VendorCreateSchema,
    VendorInvoiceCreateSchema,
    VendorUpdateSchema,
)

router = Router(tags=['Sprint 5 Operations'])


def _staff_to_dict(staff: Staff) -> dict:
    return {
        'staff_id': str(staff.staff_id),
        'name': staff.name,
        'role': staff.role,
        'dept': staff.dept,
        'employment_type': staff.employment_type,
        'start_date': staff.start_date.isoformat(),
        'salary': float(staff.salary),
        'certifications': staff.certifications,
        'dbs_ref': staff.dbs_ref,
        'dbs_expiry': staff.dbs_expiry.isoformat() if staff.dbs_expiry else None,
    }


def _payroll_to_dict(payroll: PayrollRun) -> dict:
    return {
        'payroll_id': str(payroll.payroll_id),
        'staff_id': str(payroll.staff_id),
        'period': payroll.period,
        'base_salary': float(payroll.base_salary),
        'allowances': payroll.allowances,
        'deductions': payroll.deductions,
        'gross': float(payroll.gross),
        'net': float(payroll.net),
        'status': payroll.status,
        'leave_deduction': float(payroll.leave_deduction),
    }


def _vendor_to_dict(vendor: Vendor) -> dict:
    return {
        'vendor_id': str(vendor.vendor_id),
        'name': vendor.name,
        'contact_name': vendor.contact_name,
        'phone': vendor.phone,
        'email': vendor.email,
        'payment_terms': vendor.payment_terms,
        'active': vendor.active,
    }


def _event_to_dict(event: Event) -> dict:
    return {
        'event_id': str(event.event_id),
        'title': event.title,
        'event_date': event.event_date.isoformat(),
        'registration_deadline': event.registration_deadline.isoformat(),
        'location': event.location,
        'description': event.description,
        'fee_amount': float(event.fee_amount),
        'capacity': event.capacity,
        'requires_permission_slip': event.requires_permission_slip,
        'status': event.status,
        'invoice_line_items': SchoolEventBO.invoice_line_items(event),
    }


def _message_to_dict(message) -> dict:
    return {
        'message_id': str(message.message_id),
        'recipient_id': str(message.recipient_id) if message.recipient_id else None,
        'recipient_role': message.recipient_role,
        'channel': message.channel,
        'subject': message.subject,
        'body': message.body,
        'trigger_event': message.trigger_event,
        'delivery_status': message.delivery_status,
        'opt_out_ignored': message.opt_out_ignored,
    }


@router.post('/staff', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_staff(request, payload: StaffCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = StaffMemberBO.create_staff(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'StaffMember', 'staff': _staff_to_dict(staff)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/staff/{staff_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_staff(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response({'bo': 'StaffMember', 'staff': _staff_to_dict(staff)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/staff/{staff_id}/compliance-status', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_staff_compliance_status(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    status = StaffMemberBO.compliance_status(staff)
    return JsonResponse(build_response(status, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/payroll/compute/{period}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def compute_payroll(request, period: str, payload: PayrollComputeSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = get_object_or_404(Staff, staff_id=payload.staff_id, tenant=tenant, is_deleted=False)
    payroll = PayrollRunBO.compute_payroll(
        tenant=tenant,
        staff=staff,
        period=period,
        base_salary=payload.base_salary,
        allowances=payload.allowances,
        deductions=payload.deductions,
    )
    return JsonResponse(build_response({'bo': 'PayrollRun', 'payroll': _payroll_to_dict(payroll)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.put('/payroll/{payroll_id}/approve', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def approve_payroll(request, payroll_id: UUID, payload: PayrollApproveSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    payroll = get_object_or_404(PayrollRun, payroll_id=payroll_id, tenant=tenant, is_deleted=False)
    payroll = PayrollRunBO.approve_payroll(payroll, payload.approved_by)
    return JsonResponse(build_response({'bo': 'PayrollRun', 'payroll': _payroll_to_dict(payroll)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/staff/{staff_id}/payslip/{period}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def get_payslip(request, staff_id: UUID, period: str):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    payroll = get_object_or_404(PayrollRun, staff_id=staff_id, period=period, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response({'bo': 'PayrollRun', 'payroll': _payroll_to_dict(payroll)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/appraisals', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_appraisal(request, payload: AppraisalCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    appraisal = StaffMemberBO.create_appraisal(
        tenant=tenant,
        staff_id=payload.staff_id,
        appraiser_id=UUID(request.user_id) if getattr(request, 'user_id', None) else None,
        cycle=payload.cycle,
        self_score=payload.self_score,
        manager_score=payload.manager_score,
        outcome=payload.outcome,
        notes=payload.notes,
    )
    return JsonResponse(build_response({'bo': 'PerformanceRecord', 'appraisal_id': str(appraisal.appraisal_id), 'cycle': appraisal.cycle}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/staff/{staff_id}/performance-history', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_performance_history(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    appraisals = Appraisal.objects.filter(tenant=tenant, staff_id=staff_id, is_deleted=False).order_by('-cycle')
    return JsonResponse(build_response({'bo': 'PerformanceRecord', 'appraisals': [
        {
            'appraisal_id': str(appraisal.appraisal_id),
            'cycle': appraisal.cycle,
            'outcome': appraisal.outcome,
            'status': appraisal.status,
        } for appraisal in appraisals
    ]}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/vendors', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_vendor(request, payload: VendorCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vendor = VendorAccountBO.create_vendor(tenant=tenant, data=payload.model_dump())
    return JsonResponse(build_response({'bo': 'VendorAccount', 'vendor': _vendor_to_dict(vendor)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/requisitions', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_requisition(request, payload: RequisitionCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    requisition = ProcurementOrderBO.create_requisition(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'ProcurementOrder', 'requisition_id': str(requisition.requisition_id), 'amount': float(requisition.amount)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/purchase-orders', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_purchase_order(request, payload: PurchaseOrderCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    purchase_order = ProcurementOrderBO.create_purchase_order(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'ProcurementOrder', 'purchase_order_id': str(purchase_order.po_id), 'po_number': purchase_order.po_number}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/delivery-records', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_delivery_record(request, payload: DeliveryRecordCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    delivery = ProcurementOrderBO.record_delivery(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'ProcurementOrder', 'delivery_id': str(delivery.delivery_id), 'amount': float(delivery.amount)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/vendor-invoices', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def create_vendor_invoice(request, payload: VendorInvoiceCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    if getattr(request, 'user_role', None) == 'Vendor' and getattr(request, 'vendor_id', None):
        if str(payload.vendor_id) != str(request.vendor_id):
            return JsonResponse(
                build_error(
                    errors=[{"code": "ACCESS_DENIED", "message": "You can only submit invoices for your own vendor account."}],
                    tenant_id=request.tenant_id,
                    role=getattr(request, 'user_role', 'Vendor')
                ),
                status=403
            )
    invoice = ProcurementOrderBO.record_vendor_invoice(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'ProcurementOrder', 'vendor_invoice_id': str(invoice.vendor_invoice_id), 'status': invoice.status}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/vendors/{vendor_id}/account', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def get_vendor_account(request, vendor_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vendor = get_object_or_404(Vendor, vendor_id=vendor_id, tenant=tenant, is_deleted=False)
    if not verify_vendor_access(request, vendor):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this vendor account."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Vendor')
            ),
            status=403
        )
    summary = VendorAccountBO.summary(tenant, vendor)
    return JsonResponse(build_response(summary, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/events', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_event(request, payload: EventCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = SchoolEventBO.create_event(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'SchoolEvent', **_event_to_dict(event)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/events/{event_id}/register', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def register_event_participant(request, event_id: UUID, payload: EventRegistrationCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    registration = SchoolEventBO.register_participant(tenant, event, payload.model_dump())
    return JsonResponse(build_response({'bo': 'SchoolEvent', 'registration_id': str(registration.registration_id), 'participant_name': registration.participant_name}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/events/{event_id}/volunteers', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def add_event_volunteer(request, event_id: UUID, payload: EventVolunteerCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    volunteer = SchoolEventBO.add_volunteer(tenant=tenant, event=event, data=payload.model_dump())
    return JsonResponse(build_response({'bo': 'SchoolEvent', 'volunteer_id': str(volunteer.volunteer_id), 'approved': volunteer.approved}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/events/{event_id}/report', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_event_report(request, event_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    report = SchoolEventBO.create_report(tenant, event)
    return JsonResponse(build_response({'bo': 'SchoolEvent', 'report': {'report_id': str(report.report_id), 'attendees_count': report.attendees_count, 'revenue': float(report.revenue)}}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/notification-rules', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_notification_rule(request, payload: NotificationRuleCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    rule = CommunicationBundleBO.create_rule(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'CommunicationBundle', 'rule_id': str(rule.rule_id), 'trigger_event': rule.trigger_event}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/messages', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Teacher', 'Staff')
def create_message(request, payload: MessageCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    message = CommunicationBundleBO.create_message(tenant, payload.model_dump())
    return JsonResponse(build_response({'bo': 'CommunicationBundle', 'message': _message_to_dict(message)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post('/broadcasts/emergency', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def emergency_broadcast(request, payload: EmergencyBroadcastSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    messages = CommunicationBundleBO.send_emergency_broadcast(tenant, payload.subject, payload.body, [UUID(str(recipient)) for recipient in payload.recipients])
    return JsonResponse(build_response({'bo': 'CommunicationBundle', 'messages': [_message_to_dict(message) for message in messages]}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


def _contract_to_dict(contract: Contract) -> dict:
    return {
        'contract_id': str(contract.contract_id),
        'staff_id': str(contract.staff_id),
        'contract_type': contract.contract_type,
        'start_date': contract.start_date.isoformat(),
        'end_date': contract.end_date.isoformat() if contract.end_date else None,
        'esigned_at': contract.esigned_at.isoformat() if contract.esigned_at else None,
        'renewal_alert_sent': contract.renewal_alert_sent,
    }


def _cpd_to_dict(cpd: CPDRecord) -> dict:
    return {
        'cpd_id': str(cpd.cpd_id),
        'staff_id': str(cpd.staff_id),
        'activity': cpd.activity,
        'activity_type': cpd.activity_type,
        'hours': float(cpd.hours),
        'mandatory': cpd.mandatory,
        'completion_status': cpd.completion_status,
        'completed_at': cpd.completed_at.isoformat() if cpd.completed_at else None,
    }


def _requisition_to_dict(req: Requisition) -> dict:
    return {
        'requisition_id': str(req.requisition_id),
        'vendor_id': str(req.vendor_id),
        'requester_id': str(req.requester_id),
        'item_name': req.item_name,
        'quantity': req.quantity,
        'amount': float(req.amount),
        'reason': req.reason,
        'status': req.status,
        'approved_by': str(req.approved_by) if req.approved_by else None,
        'approved_at': req.approved_at.isoformat() if req.approved_at else None,
    }


def _po_to_dict(po: PurchaseOrder) -> dict:
    return {
        'po_id': str(po.po_id),
        'vendor_id': str(po.vendor_id),
        'requisition_id': str(po.requisition_id) if po.requisition_id else None,
        'po_number': po.po_number,
        'amount': float(po.amount),
        'expected_delivery_date': po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        'status': po.status,
    }


def _delivery_to_dict(delivery: DeliveryRecord) -> dict:
    return {
        'delivery_id': str(delivery.delivery_id),
        'purchase_order_id': str(delivery.purchase_order_id),
        'vendor_id': str(delivery.vendor_id),
        'amount': float(delivery.amount),
        'delivered_at': delivery.delivered_at.isoformat() if delivery.delivered_at else None,
        'notes': delivery.notes,
        'accepted': delivery.accepted,
    }


def _vendor_invoice_to_dict(inv: VendorInvoice) -> dict:
    return {
        'vendor_invoice_id': str(inv.vendor_invoice_id),
        'vendor_id': str(inv.vendor_id),
        'purchase_order_id': str(inv.purchase_order_id) if inv.purchase_order_id else None,
        'invoice_number': inv.invoice_number,
        'amount': float(inv.amount),
        'due_date': inv.due_date.isoformat() if inv.due_date else None,
        'status': inv.status,
        'verified': inv.verified,
        'approved_by': str(inv.approved_by) if inv.approved_by else None,
        'approved_at': inv.approved_at.isoformat() if inv.approved_at else None,
    }


def _inventory_to_dict(item: Inventory) -> dict:
    return {
        'inventory_id': str(item.inventory_id),
        'vendor_id': str(item.vendor_id) if item.vendor_id else None,
        'item_name': item.item_name,
        'sku': item.sku,
        'quantity_on_hand': item.quantity_on_hand,
        'reorder_level': item.reorder_level,
        'unit_cost': float(item.unit_cost),
        'last_restocked': item.last_restocked.isoformat() if item.last_restocked else None,
    }


def _rule_to_dict(rule: NotificationRule) -> dict:
    return {
        'rule_id': str(rule.rule_id),
        'trigger_event': rule.trigger_event,
        'channel': rule.channel,
        'template_name': rule.template_name,
        'conditions': rule.conditions,
        'active': rule.active,
        'priority': rule.priority,
        'emergency': rule.emergency,
    }


@router.get('/staff', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_staff(request, role: str = None, dept: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Staff.objects.filter(tenant=tenant, is_deleted=False).order_by('name')
    if role:
        qs = qs.filter(role=role)
    if dept:
        qs = qs.filter(dept=dept)
    data = [_staff_to_dict(s) for s in qs]
    return JsonResponse(build_response({'count': len(data), 'staff': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/staff/{staff_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_staff(request, staff_id: UUID, payload: StaffUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    actor_role = getattr(request, 'user_role', 'Admin')
    updated = StaffMemberBO.update_staff(staff, payload.model_dump(exclude_unset=True), actor_role=actor_role)
    return JsonResponse(build_response({'bo': 'StaffMember', 'staff': _staff_to_dict(updated)}, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.delete('/staff/{staff_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_staff(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    staff = get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    StaffMemberBO.delete_staff(staff)
    return JsonResponse(build_response({'staff_id': str(staff_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/staff/{staff_id}/contracts', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_contract(request, staff_id: UUID, payload: ContractCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    contract = StaffMemberBO.create_contract(tenant, staff_id, payload.model_dump())
    return JsonResponse(build_response(_contract_to_dict(contract), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/staff/{staff_id}/contracts', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def list_contracts(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Contract.objects.filter(tenant=tenant, staff_id=staff_id, is_deleted=False).order_by('-start_date')
    data = [_contract_to_dict(c) for c in qs]
    return JsonResponse(build_response({'count': len(data), 'contracts': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/contracts/{contract_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_contract(request, contract_id: UUID, payload: ContractUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    contract = get_object_or_404(Contract, contract_id=contract_id, tenant=tenant, is_deleted=False)
    updated = StaffMemberBO.update_contract(contract, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response(_contract_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/contracts/{contract_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_contract(request, contract_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    contract = get_object_or_404(Contract, contract_id=contract_id, tenant=tenant, is_deleted=False)
    StaffMemberBO.delete_contract(contract)
    return JsonResponse(build_response({'contract_id': str(contract_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/payroll', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_payroll_runs(request, period: str = None, staff_id: UUID = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = PayrollRun.objects.filter(tenant=tenant, is_deleted=False).order_by('-period')
    if period:
        qs = qs.filter(period=period)
    if staff_id:
        qs = qs.filter(staff_id=staff_id)
    data = [_payroll_to_dict(p) for p in qs]
    return JsonResponse(build_response({'count': len(data), 'payroll_runs': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/appraisals/{appraisal_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_appraisal(request, appraisal_id: UUID, payload: AppraisalUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    appraisal = get_object_or_404(Appraisal, appraisal_id=appraisal_id, tenant=tenant, is_deleted=False)
    updated = StaffMemberBO.update_appraisal(appraisal, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response({
        'appraisal_id': str(updated.appraisal_id),
        'staff_id': str(updated.staff_id),
        'cycle': updated.cycle,
        'outcome': updated.outcome,
        'status': updated.status,
    }, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/staff/{staff_id}/cpd', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def create_cpd_record(request, staff_id: UUID, payload: CPDRecordCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    get_object_or_404(Staff, staff_id=staff_id, tenant=tenant, is_deleted=False)
    cpd = StaffMemberBO.create_cpd(tenant, staff_id, payload.model_dump())
    return JsonResponse(build_response(_cpd_to_dict(cpd), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/staff/{staff_id}/cpd', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def list_cpd_records(request, staff_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = CPDRecord.objects.filter(tenant=tenant, staff_id=staff_id, is_deleted=False).order_by('-created_at')
    data = [_cpd_to_dict(c) for c in qs]
    return JsonResponse(build_response({'count': len(data), 'cpd_records': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/cpd/{cpd_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def update_cpd_record(request, cpd_id: UUID, payload: CPDRecordUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    cpd = get_object_or_404(CPDRecord, cpd_id=cpd_id, tenant=tenant, is_deleted=False)
    updated = StaffMemberBO.update_cpd(cpd, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response(_cpd_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/cpd/{cpd_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_cpd_record(request, cpd_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    cpd = get_object_or_404(CPDRecord, cpd_id=cpd_id, tenant=tenant, is_deleted=False)
    StaffMemberBO.delete_cpd(cpd)
    return JsonResponse(build_response({'cpd_id': str(cpd_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/vendors', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_vendors(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Vendor.objects.filter(tenant=tenant, is_deleted=False).order_by('name')
    data = [_vendor_to_dict(v) for v in qs]
    return JsonResponse(build_response({'count': len(data), 'vendors': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/vendors/{vendor_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def get_vendor(request, vendor_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vendor = get_object_or_404(Vendor, vendor_id=vendor_id, tenant=tenant, is_deleted=False)
    if not verify_vendor_access(request, vendor):
        return JsonResponse(
            build_error(errors=[{'code': 'ACCESS_DENIED', 'message': 'You are not authorized to view this vendor.'}], tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Vendor')),
            status=403,
        )
    return JsonResponse(build_response({'bo': 'VendorAccount', 'vendor': _vendor_to_dict(vendor)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/vendors/{vendor_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_vendor(request, vendor_id: UUID, payload: VendorUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vendor = get_object_or_404(Vendor, vendor_id=vendor_id, tenant=tenant, is_deleted=False)
    updated = VendorAccountBO.update_vendor(vendor, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response({'bo': 'VendorAccount', 'vendor': _vendor_to_dict(updated)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/vendors/{vendor_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_vendor(request, vendor_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vendor = get_object_or_404(Vendor, vendor_id=vendor_id, tenant=tenant, is_deleted=False)
    VendorAccountBO.delete_vendor(vendor)
    return JsonResponse(build_response({'vendor_id': str(vendor_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/requisitions', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_requisitions(request, vendor_id: UUID = None, status: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Requisition.objects.filter(tenant=tenant, is_deleted=False).order_by('-created_at')
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    if status:
        qs = qs.filter(status=status)
    data = [_requisition_to_dict(r) for r in qs]
    return JsonResponse(build_response({'count': len(data), 'requisitions': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/requisitions/{requisition_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_requisition(request, requisition_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    req = get_object_or_404(Requisition, requisition_id=requisition_id, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response(_requisition_to_dict(req), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/requisitions/{requisition_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_requisition(request, requisition_id: UUID, payload: RequisitionUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    req = get_object_or_404(Requisition, requisition_id=requisition_id, tenant=tenant, is_deleted=False)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    updated = ProcurementOrderBO.update_requisition(req, payload.model_dump(exclude_unset=True), actor_id=actor_id)
    return JsonResponse(build_response(_requisition_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/requisitions/{requisition_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_requisition(request, requisition_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    req = get_object_or_404(Requisition, requisition_id=requisition_id, tenant=tenant, is_deleted=False)
    ProcurementOrderBO.delete_requisition(req)
    return JsonResponse(build_response({'requisition_id': str(requisition_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/purchase-orders', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def list_purchase_orders(request, vendor_id: UUID = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    qs = PurchaseOrder.objects.filter(tenant=tenant, is_deleted=False).order_by('-created_at')
    if actor_role == 'Vendor' and getattr(request, 'vendor_id', None):
        qs = qs.filter(vendor_id=request.vendor_id)
    elif vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    data = [_po_to_dict(po) for po in qs]
    return JsonResponse(build_response({'count': len(data), 'purchase_orders': data}, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get('/purchase-orders/{po_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def get_purchase_order(request, po_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    po = get_object_or_404(PurchaseOrder, po_id=po_id, tenant=tenant, is_deleted=False)
    if not verify_vendor_access(request, po.vendor):
        return JsonResponse(
            build_error(errors=[{'code': 'ACCESS_DENIED', 'message': 'You are not authorized to view this purchase order.'}], tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Vendor')),
            status=403,
        )
    return JsonResponse(build_response(_po_to_dict(po), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/purchase-orders/{po_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_purchase_order(request, po_id: UUID, payload: PurchaseOrderUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    po = get_object_or_404(PurchaseOrder, po_id=po_id, tenant=tenant, is_deleted=False)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    updated = ProcurementOrderBO.update_purchase_order(po, payload.model_dump(exclude_unset=True), actor_id=actor_id)
    return JsonResponse(build_response(_po_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/delivery-records', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_delivery_records(request, purchase_order_id: UUID = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = DeliveryRecord.objects.filter(tenant=tenant, is_deleted=False).order_by('-delivered_at')
    if purchase_order_id:
        qs = qs.filter(purchase_order_id=purchase_order_id)
    data = [_delivery_to_dict(d) for d in qs]
    return JsonResponse(build_response({'count': len(data), 'delivery_records': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/delivery-records/{delivery_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_delivery_record(request, delivery_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    delivery = get_object_or_404(DeliveryRecord, delivery_id=delivery_id, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response(_delivery_to_dict(delivery), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/delivery-records/{delivery_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_delivery_record(request, delivery_id: UUID, payload: DeliveryRecordUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    delivery = get_object_or_404(DeliveryRecord, delivery_id=delivery_id, tenant=tenant, is_deleted=False)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    updated = ProcurementOrderBO.update_delivery_record(delivery, payload.model_dump(exclude_unset=True), actor_id=actor_id)
    return JsonResponse(build_response(_delivery_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/vendor-invoices', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def list_vendor_invoices(request, vendor_id: UUID = None, status: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    qs = VendorInvoice.objects.filter(tenant=tenant, is_deleted=False).order_by('-created_at')
    if actor_role == 'Vendor' and getattr(request, 'vendor_id', None):
        qs = qs.filter(vendor_id=request.vendor_id)
    elif vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    if status:
        qs = qs.filter(status=status)
    data = [_vendor_invoice_to_dict(inv) for inv in qs]
    return JsonResponse(build_response({'count': len(data), 'vendor_invoices': data}, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get('/vendor-invoices/{vendor_invoice_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Vendor')
def get_vendor_invoice(request, vendor_invoice_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    inv = get_object_or_404(VendorInvoice, vendor_invoice_id=vendor_invoice_id, tenant=tenant, is_deleted=False)
    if not verify_vendor_access(request, inv.vendor):
        return JsonResponse(
            build_error(errors=[{'code': 'ACCESS_DENIED', 'message': 'You are not authorized to view this vendor invoice.'}], tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Vendor')),
            status=403,
        )
    return JsonResponse(build_response(_vendor_invoice_to_dict(inv), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/vendor-invoices/{vendor_invoice_id}/approve', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def approve_vendor_invoice(request, vendor_invoice_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    inv = get_object_or_404(VendorInvoice, vendor_invoice_id=vendor_invoice_id, tenant=tenant, is_deleted=False)
    po = inv.purchase_order
    req = po.requisition if po else None
    delivery = DeliveryRecord.objects.filter(purchase_order=po, tenant=tenant, is_deleted=False).first() if po else None
    bo = ProcurementOrderBO(
        requisition=req,
        purchase_order=po,
        delivery_record=delivery,
        vendor_invoice=inv,
        actor_role=getattr(request, 'user_role', 'Admin'),
    )
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else UUID(int=0)
    approved = bo.approve_vendor_invoice(approved_by=actor_id)
    return JsonResponse(build_response(_vendor_invoice_to_dict(approved), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post('/inventory', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_inventory_item(request, payload: InventoryCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    item = ProcurementOrderBO.create_inventory_item(tenant, payload.model_dump())
    return JsonResponse(build_response(_inventory_to_dict(item), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get('/inventory', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_inventory_items(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Inventory.objects.filter(tenant=tenant, is_deleted=False).order_by('item_name')
    data = [_inventory_to_dict(i) for i in qs]
    return JsonResponse(build_response({'count': len(data), 'inventory': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/inventory/{inventory_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_inventory_item(request, inventory_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    item = get_object_or_404(Inventory, inventory_id=inventory_id, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response(_inventory_to_dict(item), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/inventory/{inventory_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_inventory_item(request, inventory_id: UUID, payload: InventoryUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    item = get_object_or_404(Inventory, inventory_id=inventory_id, tenant=tenant, is_deleted=False)
    updated = ProcurementOrderBO.update_inventory_item(item, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response(_inventory_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/inventory/{inventory_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_inventory_item(request, inventory_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    item = get_object_or_404(Inventory, inventory_id=inventory_id, tenant=tenant, is_deleted=False)
    ProcurementOrderBO.delete_inventory_item(item)
    return JsonResponse(build_response({'inventory_id': str(inventory_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/events', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Teacher', 'Staff', 'Parent')
def list_events(request, status: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = Event.objects.filter(tenant=tenant, is_deleted=False).order_by('-event_date')
    if status:
        qs = qs.filter(status=status)
    data = [_event_to_dict(e) for e in qs]
    return JsonResponse(build_response({'count': len(data), 'events': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/events/{event_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Teacher', 'Staff', 'Parent')
def get_event(request, event_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    return JsonResponse(build_response({'bo': 'SchoolEvent', **_event_to_dict(event)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/events/{event_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_event(request, event_id: UUID, payload: EventUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    updated = SchoolEventBO.update_event(event, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response({'bo': 'SchoolEvent', **_event_to_dict(updated)}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/events/{event_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_event(request, event_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    SchoolEventBO.delete_event(event)
    return JsonResponse(build_response({'event_id': str(event_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/events/{event_id}/registrations', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def list_event_registrations(request, event_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    qs = EventRegistration.objects.filter(tenant=tenant, event=event, is_deleted=False).order_by('participant_name')
    data = [
        {
            'registration_id': str(r.registration_id),
            'event_id': str(r.event_id),
            'participant_name': r.participant_name,
            'participant_email': r.participant_email,
            'participant_phone': r.participant_phone,
            'registration_status': r.registration_status,
            'permission_slip_received': r.permission_slip_received,
            'payment_status': r.payment_status,
        }
        for r in qs
    ]
    return JsonResponse(build_response({'count': len(data), 'registrations': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/events/registrations/{registration_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def update_event_registration(request, registration_id: UUID, payload: EventRegistrationUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    reg = get_object_or_404(EventRegistration, registration_id=registration_id, tenant=tenant, is_deleted=False)
    updated = SchoolEventBO.update_registration(reg, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response({
        'registration_id': str(updated.registration_id),
        'registration_status': updated.registration_status,
        'permission_slip_received': updated.permission_slip_received,
        'payment_status': updated.payment_status,
    }, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/events/registrations/{registration_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def delete_event_registration(request, registration_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    reg = get_object_or_404(EventRegistration, registration_id=registration_id, tenant=tenant, is_deleted=False)
    SchoolEventBO.delete_registration(reg)
    return JsonResponse(build_response({'registration_id': str(registration_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/events/{event_id}/volunteers', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
def list_event_volunteers(request, event_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    qs = EventVolunteer.objects.filter(tenant=tenant, event=event, is_deleted=False).order_by('volunteer_name')
    data = [
        {
            'volunteer_id': str(v.volunteer_id),
            'event_id': str(v.event_id),
            'volunteer_name': v.volunteer_name,
            'role': v.role,
            'phone': v.phone,
            'approved': v.approved,
        }
        for v in qs
    ]
    return JsonResponse(build_response({'count': len(data), 'volunteers': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/events/volunteers/{volunteer_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_event_volunteer(request, volunteer_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    vol = get_object_or_404(EventVolunteer, volunteer_id=volunteer_id, tenant=tenant, is_deleted=False)
    SchoolEventBO.delete_volunteer(vol)
    return JsonResponse(build_response({'volunteer_id': str(volunteer_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.put('/events/{event_id}/report', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_event_report(request, event_id: UUID, payload: EventReportUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    event = get_object_or_404(Event, event_id=event_id, tenant=tenant, is_deleted=False)
    report = SchoolEventBO.update_report(tenant, event, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response({
        'bo': 'SchoolEvent',
        'report': {
            'report_id': str(report.report_id),
            'attendees_count': report.attendees_count,
            'revenue': float(report.revenue),
            'expenses': float(report.expenses),
            'summary': report.summary,
        },
    }, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/messages', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Teacher', 'Staff', 'Parent')
def list_messages(request, recipient_id: UUID = None, channel: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    qs = Message.objects.filter(tenant=tenant, is_deleted=False).order_by('-created_at')
    if actor_role == 'Parent' and getattr(request, 'user_id', None):
        qs = qs.filter(recipient_id=request.user_id)
    elif recipient_id:
        qs = qs.filter(recipient_id=recipient_id)
    if channel:
        qs = qs.filter(channel=channel)
    data = [_message_to_dict(m) for m in qs]
    return JsonResponse(build_response({'count': len(data), 'messages': data}, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get('/messages/{message_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Teacher', 'Staff', 'Parent')
def get_message(request, message_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    msg = get_object_or_404(Message, message_id=message_id, tenant=tenant, is_deleted=False)
    actor_role = getattr(request, 'user_role', 'Admin')
    if actor_role == 'Parent' and str(msg.recipient_id) != str(getattr(request, 'user_id', '')):
        return JsonResponse(
            build_error(errors=[{'code': 'ACCESS_DENIED', 'message': 'You are not authorized to view this message.'}], tenant_id=request.tenant_id, role=actor_role),
            status=403,
        )
    return JsonResponse(build_response(_message_to_dict(msg), tenant_id=request.tenant_id, role=actor_role), status=200)


@router.patch('/messages/{message_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_message(request, message_id: UUID, payload: MessageUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    msg = get_object_or_404(Message, message_id=message_id, tenant=tenant, is_deleted=False)
    updated = CommunicationBundleBO.update_message(msg, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response(_message_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.get('/notification-rules', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def list_notification_rules(request, trigger_event: str = None):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    qs = NotificationRule.objects.filter(tenant=tenant, is_deleted=False).order_by('priority')
    if trigger_event:
        qs = qs.filter(trigger_event=trigger_event)
    data = [_rule_to_dict(r) for r in qs]
    return JsonResponse(build_response({'count': len(data), 'rules': data}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.patch('/notification-rules/{rule_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def update_notification_rule(request, rule_id: UUID, payload: NotificationRuleUpdateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    rule = get_object_or_404(NotificationRule, rule_id=rule_id, tenant=tenant, is_deleted=False)
    updated = CommunicationBundleBO.update_rule(rule, payload.model_dump(exclude_unset=True))
    return JsonResponse(build_response(_rule_to_dict(updated), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.delete('/notification-rules/{rule_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def delete_notification_rule(request, rule_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    rule = get_object_or_404(NotificationRule, rule_id=rule_id, tenant=tenant, is_deleted=False)
    CommunicationBundleBO.delete_rule(rule)
    return JsonResponse(build_response({'rule_id': str(rule_id), 'is_deleted': True}, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)

