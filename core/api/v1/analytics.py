from uuid import UUID

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Router

from core.auth.bearer import JWTAuthBearer
from core.auth.decorators import require_roles
from core.business_objects.analytics import (
    AnalyticsDashboardBO,
    CustomReportBO,
    WEBHOOK_EVENT_TYPES,
    WebhookDispatcherBO,
)
from core.models import CustomReport, Tenant
from core.schemas.analytics import (
    CustomReportCreateSchema,
    ReportScheduleCreateSchema,
    WebhookDispatchSchema,
    WebhookSubscriptionCreateSchema,
)
from core.schemas.base import build_error, build_response

router = Router(tags=['Analytics & Reporting (P10)'])


@router.get('/analytics/dashboard', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Board', 'Trustee')
def get_analytics_dashboard(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    bo = AnalyticsDashboardBO(tenant=tenant, actor_role=actor_role)
    period = request.GET.get('period')
    data = bo.build_dashboard(period=period)
    bo.save_snapshot(role_scope=actor_role.lower(), period=period)
    return JsonResponse(build_response(data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.get('/analytics/kpis/{role}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def get_analytics_kpis_for_role(request, role: str):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    bo = AnalyticsDashboardBO(tenant=tenant, actor_role=actor_role)
    data = bo.build_dashboard(period=request.GET.get('period'))
    data['requested_role'] = role.lower()
    return JsonResponse(build_response(data, tenant_id=request.tenant_id, role=actor_role), status=200)


@router.post('/reports/custom', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_custom_report(request, payload: CustomReportCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = CustomReportBO(tenant=tenant, actor_id=actor_id, actor_role=actor_role)
    report = bo.run_report(
        name=payload.name,
        fields=payload.fields,
        filters=payload.filters,
        group_by=payload.group_by,
    )
    return JsonResponse(
        build_response(
            {
                'bo': 'CustomReport',
                'report_id': str(report.report_id),
                'name': report.name,
                'fields': report.fields,
                'status': report.status,
                'result': report.result,
                'generated_at': report.generated_at.isoformat(),
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=201,
    )


@router.get('/reports/{report_id}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Board', 'Trustee')
def get_custom_report(request, report_id: UUID):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    report = get_object_or_404(CustomReport, report_id=report_id, tenant=tenant, is_deleted=False)
    return JsonResponse(
        build_response(
            {
                'bo': 'CustomReport',
                'report_id': str(report.report_id),
                'name': report.name,
                'fields': report.fields,
                'filters': report.filters,
                'group_by': report.group_by,
                'status': report.status,
                'result': report.result,
                'generated_at': report.generated_at.isoformat(),
            },
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Admin'),
        ),
        status=200,
    )


@router.post('/reports/{report_id}/schedule', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def schedule_custom_report(request, report_id: UUID, payload: ReportScheduleCreateSchema):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    report = get_object_or_404(CustomReport, report_id=report_id, tenant=tenant, is_deleted=False)
    actor_role = getattr(request, 'user_role', 'Admin')
    actor_id = UUID(request.user_id) if getattr(request, 'user_id', None) else None
    bo = CustomReportBO(tenant=tenant, actor_id=actor_id, actor_role=actor_role)
    schedule = bo.schedule_report(
        report=report,
        cron_expression=payload.cron_expression,
        destination=payload.destination,
        active=payload.active,
    )
    return JsonResponse(
        build_response(
            {
                'bo': 'ReportSchedule',
                'schedule_id': str(schedule.schedule_id),
                'report_id': str(report.report_id),
                'cron_expression': schedule.cron_expression,
                'destination': schedule.destination,
                'active': schedule.active,
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=201,
    )


@router.get('/analytics/enrollment-funnel', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Board', 'Trustee')
def get_enrollment_funnel(request):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    bo = AnalyticsDashboardBO(tenant=tenant, actor_role=actor_role)
    return JsonResponse(
        build_response(
            {
                'bo': 'AnalyticsDashboard',
                'enrollment_funnel': bo.build_dashboard().get('enrollment_funnel', {}),
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.get('/analytics/financial/{period}', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner', 'Board', 'Trustee')
def get_financial_analytics(request, period: str):
    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    actor_role = getattr(request, 'user_role', 'Admin')
    bo = AnalyticsDashboardBO(tenant=tenant, actor_role=actor_role)
    data = bo.build_dashboard(period=period)
    return JsonResponse(
        build_response(
            {
                'bo': 'AnalyticsDashboard',
                'period': period,
                'financial': data.get('financial', {}),
            },
            tenant_id=request.tenant_id,
            role=actor_role,
        ),
        status=200,
    )


@router.post('/webhooks/subscriptions', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def create_webhook_subscription(request, payload: WebhookSubscriptionCreateSchema):
    if payload.event_type not in WEBHOOK_EVENT_TYPES:
        return JsonResponse(
            build_error(
                errors=[
                    {
                        'code': 'INVALID_EVENT_TYPE',
                        'field': 'event_type',
                        'message': f'Unsupported event type: {payload.event_type}',
                    }
                ],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Admin'),
            ),
            status=422,
        )

    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = WebhookDispatcherBO(tenant=tenant, actor_role=getattr(request, 'user_role', 'Admin'))
    webhook = bo.register_subscription(
        event_type=payload.event_type,
        target_url=payload.target_url,
        secret=payload.secret,
        active=payload.active,
        retry_limit=payload.retry_limit,
    )
    return JsonResponse(
        build_response(
            {
                'bo': 'WebhookSubscription',
                'webhook_id': str(webhook.webhook_id),
                'event_type': webhook.event_type,
                'target_url': webhook.target_url,
                'active': webhook.active,
                'retry_limit': webhook.retry_limit,
            },
            tenant_id=request.tenant_id,
            role=getattr(request, 'user_role', 'Admin'),
        ),
        status=201,
    )


@router.post('/webhooks/dispatch', auth=JWTAuthBearer())
@require_roles('Admin', 'Principal', 'Owner')
def dispatch_webhook_event(request, payload: WebhookDispatchSchema):
    if payload.event_type not in WEBHOOK_EVENT_TYPES:
        return JsonResponse(
            build_error(
                errors=[
                    {
                        'code': 'INVALID_EVENT_TYPE',
                        'field': 'event_type',
                        'message': f'Unsupported event type: {payload.event_type}',
                    }
                ],
                tenant_id=request.tenant_id,
                role=getattr(request, 'user_role', 'Admin'),
            ),
            status=422,
        )

    tenant = get_object_or_404(Tenant, tenant_id=request.tenant_id)
    bo = WebhookDispatcherBO(tenant=tenant, actor_role=getattr(request, 'user_role', 'Admin'))
    result = bo.dispatch_event(payload.event_type, payload.payload)
    return JsonResponse(
        build_response(result, tenant_id=request.tenant_id, role=getattr(request, 'user_role', 'Admin')),
        status=200,
    )
