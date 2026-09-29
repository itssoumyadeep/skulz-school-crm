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
    Event,
    EventVolunteer,
    PayrollRun,
    Staff,
    Tenant,
    Vendor,
)
from core.schemas.base import build_response
from core.schemas.sprint5 import (
    AppraisalCreateSchema,
    DeliveryRecordCreateSchema,
    EmergencyBroadcastSchema,
    EventCreateSchema,
    EventRegistrationCreateSchema,
    EventVolunteerCreateSchema,
    MessageCreateSchema,
    NotificationRuleCreateSchema,
    PayrollApproveSchema,
    PayrollComputeSchema,
    PurchaseOrderCreateSchema,
    RequisitionCreateSchema,
    StaffCreateSchema,
    VendorCreateSchema,
    VendorInvoiceCreateSchema,
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
@require_roles('Admin', 'Principal', 'Owner', 'Staff')
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
