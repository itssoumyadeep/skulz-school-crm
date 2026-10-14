import logging
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

import stripe
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.auth.scoping import verify_student_access
from core.business_objects.billing import (
    FeeAccountBO,
    ParentBillingBO,
    PaymentTransactionBO,
    FinancialStatementBO,
)
from core.business_objects.enrollment import EnrollmentCaseBO
from core.models import (
    Tenant,
    Student,
    Parent,
    FeeStructure,
    Invoice,
    Payment,
    Reconciliation,
)
from core.schemas.base import build_response, build_error
from core.schemas.billing import (
    InvoiceCreateSchema,
    BulkInvoiceGenerateSchema,
    PaymentCreateSchema,
    RefundCreateSchema,
    DiscountWaiverCreateSchema,
    ReconciliationFilterSchema,
    ParentCheckoutCreateSchema,
)

router = Router(tags=["Billing (P02)"])
logger = logging.getLogger(__name__)


def _parent_owns_record(request, parent: Parent) -> bool:
    user_email = (getattr(request, 'user_email', None) or '').strip().lower()
    parent_email = (parent.email or '').strip().lower()
    actor_id = getattr(request, 'user_id', None)
    try:
        actor_uuid = UUID(str(actor_id)) if actor_id else None
    except (ValueError, TypeError):
        actor_uuid = None
    return bool(
        (user_email and user_email == parent_email)
        or (actor_uuid and parent.created_by == actor_uuid)
    )


def _invoice_to_dict(invoice: Invoice) -> dict:
    return {
        "invoice_id": str(invoice.invoice_id),
        "student_id": str(invoice.student_id),
        "parent_id": str(invoice.parent_id),
        "fee_struct_id": str(invoice.fee_structure_id) if invoice.fee_structure_id else None,
        "invoice_date": invoice.invoice_date.isoformat(),
        "due_date": invoice.due_date.isoformat(),
        "line_items": invoice.line_items,
        "total": float(invoice.total),
        "status": invoice.status,
        "invoice_type": invoice.invoice_type,
    }


def _payment_to_dict(payment: Payment) -> dict:
    return {
        "payment_id": str(payment.payment_id),
        "invoice_id": str(payment.invoice_id),
        "parent_id": str(payment.parent_id),
        "amount": float(payment.amount),
        "date": payment.date.isoformat() if payment.date else None,
        "method": payment.method,
        "txn_ref": payment.txn_ref,
        "status": payment.status,
        "receipt_id": payment.receipt_id,
        "refund_amount": float(payment.refund_amount),
    }


def _discount_to_dict(discount) -> dict:
    return {
        "discount_id": str(discount.discount_id),
        "invoice_id": str(discount.invoice_id),
        "student_id": str(discount.student_id),
        "discount_type": discount.discount_type,
        "amount": float(discount.amount),
        "reason": discount.reason,
        "approved_by": str(discount.approved_by),
        "approval_date": discount.approval_date.isoformat() if discount.approval_date else None,
    }


def _reconciliation_to_dict(recon: Reconciliation) -> dict:
    return {
        "recon_id": str(recon.recon_id),
        "period": recon.period,
        "total_invoiced": float(recon.total_invoiced),
        "total_collected": float(recon.total_collected),
        "total_outstanding": float(recon.total_outstanding),
        "adjustments": float(recon.adjustments),
        "discrepancies": recon.discrepancies,
        "status": recon.status,
        "finalized_by": str(recon.finalized_by) if recon.finalized_by else None,
        "finalized_at": recon.finalized_at.isoformat() if recon.finalized_at else None,
    }


@router.get("/students/{student_id}/fee-account", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Parent')
def get_fee_account(request, student_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    student = get_object_or_404(Student, student_id=student_id, tenant=tenant, is_deleted=False)
    if not verify_student_access(request, student):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this fee account."}],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Parent')
            ),
            status=403
        )
    bo = FeeAccountBO(student=student, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(
        bo.to_response(tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')),
        status=200,
    )


@router.get("/parent/billing", auth=JWTAuthBearer())
@require_roles('Parent')
def get_parent_billing(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    data = ParentBillingBO(
        tenant=tenant,
        user_id=getattr(request, 'user_id', None),
        user_email=getattr(request, 'user_email', None),
        linked_student_ids=getattr(request, 'linked_student_ids', []),
        currency=settings.STRIPE_CURRENCY.upper(),
    ).to_dict()
    return JsonResponse(
        build_response(data, tenant_id=request.tenant_id, role='Parent'),
        status=200,
    )


@router.post("/parent/billing/checkout", auth=JWTAuthBearer())
@require_roles('Parent')
def create_parent_checkout(request, payload: ParentCheckoutCreateSchema):
    if not settings.STRIPE_SECRET_KEY:
        return JsonResponse(
            build_error(
                errors=[{"code": "PAYMENT_PROVIDER_NOT_CONFIGURED", "message": "Online payments are not configured."}],
                tenant_id=request.tenant_id,
                role='Parent',
            ),
            status=503,
        )

    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    invoice = get_object_or_404(
        Invoice,
        invoice_id=payload.invoice_id,
        tenant=tenant,
        is_deleted=False,
    )
    parent = invoice.parent
    if (
        not verify_student_access(request, invoice.student)
        or not _parent_owns_record(request, parent)
    ):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to pay this invoice."}],
                tenant_id=request.tenant_id,
                role='Parent',
            ),
            status=403,
        )

    currency = settings.STRIPE_CURRENCY.lower()
    try:
        payment = PaymentTransactionBO.create_pending_checkout(
            tenant=tenant,
            invoice_id=invoice.invoice_id,
            parent=parent,
            amount=payload.amount,
            currency=currency,
        )
    except ValueError as exc:
        return JsonResponse(
            build_error(
                errors=[{"code": "CHECKOUT_VALIDATION_ERROR", "message": str(exc)}],
                tenant_id=request.tenant_id,
                role='Parent',
            ),
            status=409 if 'already in progress' in str(exc) else 422,
        )

    expires_at = timezone.now() + timedelta(minutes=30)
    try:
        client = stripe.StripeClient(settings.STRIPE_SECRET_KEY)
        checkout_params = {
            'mode': 'payment',
            'payment_method_types': ['card'],
            'line_items': [{
                'price_data': {
                    'currency': currency,
                    'unit_amount': int(payload.amount * 100),
                    'product_data': {
                        'name': f"{invoice.student.name} - {invoice.invoice_type}",
                    },
                },
                'quantity': 1,
            }],
            'client_reference_id': str(payment.payment_id),
            'metadata': {
                'payment_id': str(payment.payment_id),
                'invoice_id': str(invoice.invoice_id),
                'tenant_id': str(tenant.tenant_id),
            },
            'success_url': settings.STRIPE_CHECKOUT_SUCCESS_URL,
            'cancel_url': settings.STRIPE_CHECKOUT_CANCEL_URL,
            'expires_at': int(expires_at.timestamp()),
        }
        if parent.email:
            checkout_params['customer_email'] = parent.email
        session = client.v1.checkout.sessions.create(
            checkout_params,
            options={'idempotency_key': f"parent-payment-{payment.payment_id}"},
        )
        if not session.url:
            raise ValueError('Stripe did not return a Checkout URL.')
        session_expiration = (
            datetime.fromtimestamp(session.expires_at, tz=timezone.get_current_timezone())
            if session.expires_at
            else expires_at
        )
        PaymentTransactionBO.attach_checkout_session(
            payment,
            session_id=session.id,
            expires_at=session_expiration,
        )
    except Exception as exc:
        PaymentTransactionBO.fail_checkout(
            tenant=tenant,
            session_id=getattr(locals().get('session'), 'id', ''),
        ) if locals().get('session') else None
        payment.status = 'Failed'
        payment.save(update_fields=['status', 'updated_at'])
        logger.exception("Unable to create Stripe Checkout session for payment %s", payment.payment_id)
        return JsonResponse(
            build_error(
                errors=[{"code": "CHECKOUT_UNAVAILABLE", "message": "Unable to start secure checkout."}],
                tenant_id=request.tenant_id,
                role='Parent',
            ),
            status=502,
        )

    return JsonResponse(
        build_response(
            {
                'payment_id': str(payment.payment_id),
                'checkout_url': session.url,
                'amount': float(payment.amount),
                'currency': currency.upper(),
            },
            tenant_id=request.tenant_id,
            role='Parent',
        ),
        status=201,
    )


@router.post("/stripe/webhook")
def stripe_webhook(request):
    if not settings.STRIPE_WEBHOOK_SECRET:
        return HttpResponse(status=503)
    signature = request.headers.get('Stripe-Signature', '')
    try:
        event = stripe.Webhook.construct_event(
            request.body,
            signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError):
        return HttpResponse(status=400)

    event_type = event.get('type')
    checkout = event.get('data', {}).get('object', {})
    session_id = checkout.get('id')
    if not session_id:
        return HttpResponse(status=400)
    metadata = checkout.get('metadata') or {}
    tenant_id = metadata.get('tenant_id')
    tenant = Tenant.objects.filter(tenant_id=tenant_id).first() if tenant_id else None
    if tenant is None:
        logger.error("Stripe Checkout event %s has no valid tenant metadata", event.get('id'))
        return HttpResponse(status=400)

    if event_type in {'checkout.session.completed', 'checkout.session.async_payment_succeeded'}:
        if checkout.get('payment_status') != 'paid':
            return HttpResponse(status=200)
        try:
            payment, newly_completed = PaymentTransactionBO.complete_checkout(
                tenant=tenant,
                session_id=session_id,
                payment_intent_id=checkout.get('payment_intent'),
                amount_total=int(checkout.get('amount_total') or 0),
                currency=checkout.get('currency') or '',
                expected_currency=settings.STRIPE_CURRENCY,
            )
        except ValueError:
            logger.exception("Stripe Checkout verification failed for session %s", session_id)
            return HttpResponse(status=400)
        if payment and newly_completed:
            invoice = payment.invoice
            invoice.refresh_from_db()
            EnrollmentCaseBO.confirm_paid_invoice(
                invoice,
                payment,
                actor_id=payment.parent.created_by,
                actor_role='Parent',
            )
    elif event_type in {
        'checkout.session.expired',
        'checkout.session.async_payment_failed',
    }:
        PaymentTransactionBO.fail_checkout(tenant=tenant, session_id=session_id)

    return HttpResponse(status=200)


@router.post("/invoices", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_invoice(request, payload: InvoiceCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    student = get_object_or_404(Student, student_id=payload.student_id, tenant=tenant, is_deleted=False)
    parent = get_object_or_404(Parent, parent_id=payload.parent_id, tenant=tenant, student=student, is_deleted=False)
    fee_structure = None
    if payload.fee_struct_id:
        fee_structure = get_object_or_404(FeeStructure, fee_struct_id=payload.fee_struct_id, tenant=tenant, is_deleted=False)

    invoice = FeeAccountBO.create_invoice(
        tenant=tenant,
        student=student,
        parent=parent,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        line_items=payload.line_items,
        fee_structure=fee_structure,
        invoice_type=payload.invoice_type,
    )
    return JsonResponse(build_response(_invoice_to_dict(invoice), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.post("/invoices/bulk-generate", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def bulk_generate_invoices(request, payload: BulkInvoiceGenerateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    fee_structure = get_object_or_404(FeeStructure, fee_struct_id=payload.fee_struct_id, tenant=tenant, is_deleted=False)
    invoices = FeeAccountBO.bulk_generate_invoices(
        tenant=tenant,
        fee_structure=fee_structure,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
    )
    return JsonResponse(
        build_response(
            data={
                "count": len(invoices),
                "invoices": [_invoice_to_dict(invoice) for invoice in invoices],
            },
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Admin'),
        ),
        status=201,
    )


@router.post("/payments", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_payment(request, payload: PaymentCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    invoice = get_object_or_404(Invoice, invoice_id=payload.invoice_id, tenant=tenant, is_deleted=False)
    parent = get_object_or_404(Parent, parent_id=payload.parent_id, tenant=tenant, is_deleted=False)
    actor_role = getattr(request, 'user_role', 'Admin')
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    try:
        payment = PaymentTransactionBO.record_payment(
            tenant=tenant,
            invoice=invoice,
            parent=parent,
            amount=payload.amount,
            method=payload.method,
            txn_ref=payload.txn_ref or "",
        )
    except ValueError as exc:
        return JsonResponse(
            build_error(
                errors=[{"code": "PAYMENT_VALIDATION_ERROR", "message": str(exc)}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=422,
        )
    invoice.refresh_from_db()
    EnrollmentCaseBO.confirm_paid_invoice(
        invoice,
        payment,
        actor_id=actor_id,
        actor_role=actor_role,
    )
    return JsonResponse(build_response(_payment_to_dict(payment), tenant_id=request.tenant_id, role=actor_role), status=201)


@router.get("/payments/{payment_id}/receipt", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Parent')
def get_receipt(request, payment_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    payment = get_object_or_404(Payment, payment_id=payment_id, tenant=tenant, is_deleted=False)
    actor_role = getattr(request, 'user_role', 'Admin')
    if actor_role == 'Parent' and (
        not verify_student_access(request, payment.invoice.student)
        or not _parent_owns_record(request, payment.parent)
    ):
        return JsonResponse(
            build_error(
                errors=[{"code": "ACCESS_DENIED", "message": "You are not authorized to view this receipt."}],
                tenant_id=request.tenant_id,
                role=actor_role,
            ),
            status=403,
        )
    return JsonResponse(
        build_response(
            {
                "receipt_id": payment.receipt_id,
                "payment_id": str(payment.payment_id),
                "invoice_id": str(payment.invoice_id),
                "amount": float(payment.amount),
                "status": payment.status,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.post("/payments/{payment_id}/refund", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def refund_payment(request, payment_id: UUID, payload: RefundCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    payment = get_object_or_404(Payment, payment_id=payment_id, tenant=tenant, is_deleted=False)
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else UUID(int=0)
    bo = PaymentTransactionBO(payment=payment, actor_role=getattr(request, 'user_role', 'Admin'))
    bo.process_refund(payload.refund_amount, actor_id, actor_role=getattr(request, 'user_role', 'Admin'))
    payment.refresh_from_db()
    return JsonResponse(build_response(_payment_to_dict(payment), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=200)


@router.post("/discounts", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_discount(request, payload: DiscountWaiverCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    invoice = get_object_or_404(Invoice, invoice_id=payload.invoice_id, tenant=tenant, is_deleted=False)
    student = get_object_or_404(Student, student_id=payload.student_id, tenant=tenant, is_deleted=False)
    approver_id = UUID(request.user_id) if getattr(request, 'user_id', None) else UUID(int=0)
    discount = FeeAccountBO.apply_discount_waiver(
        tenant=tenant,
        invoice=invoice,
        discount_type=payload.discount_type,
        amount=payload.amount,
        reason=payload.reason,
        approver_id=approver_id,
        approver_role=getattr(request, 'user_role', 'Admin'),
    )
    return JsonResponse(build_response(_discount_to_dict(discount), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')), status=201)


@router.get("/financials/reconciliation/{period}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_reconciliation(request, period: str):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    recon = FinancialStatementBO.get_or_create_reconciliation(tenant=tenant, period=period)
    bo = FinancialStatementBO(tenant=tenant, period=period, actor_role=getattr(request, 'user_role', 'Admin'))
    statement = bo.generate_statement()
    return JsonResponse(
        build_response(
            {
                "reconciliation": _reconciliation_to_dict(recon),
                "statement": statement,
            },
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Admin'),
        ),
        status=200,
    )


@router.get("/financials/statement/{period}", auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_statement(request, period: str):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = FinancialStatementBO(tenant=tenant, period=period, actor_role=getattr(request, 'user_role', 'Admin'))
    return JsonResponse(
        build_response(bo.to_dict(), tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')),
        status=200,
    )
