import hashlib
import hmac
import json
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce

from core.business_objects.base import BaseBusinessObject
from core.models import (
    AnalyticsSnapshot,
    Application,
    CustomReport,
    Incident,
    Invoice,
    Payment,
    ReportSchedule,
    StudentAttendance,
    Tenant,
    WebhookDeliveryAttempt,
    WebhookSubscription,
)


WEBHOOK_EVENT_TYPES = {
    'student.enrolled',
    'invoice.generated',
    'payment.completed',
    'attendance.marked.absent',
    'incident.created',
    'incident.escalated',
    'exam.published',
    'report_card.published',
    'staff.contract.expiring',
    'procurement.po.approved',
    'vendor.invoice.matched',
    'event.registration.closed',
    'compliance.report.generated',
}


def _to_float(value: Decimal | int | float | None) -> float:
    if value is None:
        return 0.0
    return float(value)


class AnalyticsDashboardBO(BaseBusinessObject):
    def __init__(self, tenant: Tenant, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.actor_role = actor_role

    def _enrollment_funnel(self) -> Dict[str, int]:
        statuses = ['Pending', 'Under_Review', 'Offered', 'Accepted', 'Waitlisted', 'Rejected', 'Active']
        data = {
            row['status']: row['count']
            for row in Application.objects.filter(tenant=self.tenant, is_deleted=False)
            .values('status')
            .annotate(count=Count('application_id'))
        }
        return {status: int(data.get(status, 0)) for status in statuses}

    def _financial_snapshot(self, period: str | None = None) -> Dict[str, float]:
        invoices = Invoice.objects.filter(tenant=self.tenant, is_deleted=False)
        if period:
            try:
                invoices = invoices.filter(
                    invoice_date__year=int(period[:4]),
                    invoice_date__month=int(period[5:7]),
                )
            except (TypeError, ValueError):
                pass

        total_invoiced = _to_float(
            invoices.aggregate(total=Coalesce(Sum('total'), Decimal('0.00')))['total']
        )
        total_paid = _to_float(
            Payment.objects.filter(tenant=self.tenant, is_deleted=False, status='Completed')
            .aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
        )
        outstanding = max(total_invoiced - total_paid, 0.0)
        collection_efficiency = round((total_paid / total_invoiced) * 100, 2) if total_invoiced else 100.0

        return {
            'revenue': round(total_paid, 2),
            'invoiced': round(total_invoiced, 2),
            'outstanding': round(outstanding, 2),
            'collection_efficiency': collection_efficiency,
        }

    def _attendance_snapshot(self) -> Dict[str, Any]:
        records = StudentAttendance.objects.filter(tenant=self.tenant, is_deleted=False)
        total = records.count()
        present = records.filter(status__in=['Present', 'Late']).count()
        absent = records.filter(status='Absent').count()
        rate = round((present / total) * 100, 2) if total > 0 else 100.0
        return {
            'total_records': total,
            'present_or_late': present,
            'absent': absent,
            'attendance_rate': rate,
        }

    def _compliance_snapshot(self) -> Dict[str, Any]:
        incidents = Incident.objects.filter(tenant=self.tenant, is_deleted=False)
        total = incidents.count()
        escalated = incidents.filter(escalated_to_principal=True).count()
        critical = incidents.filter(severity='Critical').count()
        score = round(max(0.0, 100 - (critical * 8 + escalated * 3)), 2)
        return {
            'total_incidents': total,
            'escalated_incidents': escalated,
            'critical_incidents': critical,
            'compliance_score': score,
        }

    def build_dashboard(self, period: str | None = None) -> Dict[str, Any]:
        return {
            'bo': 'AnalyticsDashboard',
            'role': self.actor_role,
            'as_of': date.today().isoformat(),
            'enrollment_funnel': self._enrollment_funnel(),
            'financial': self._financial_snapshot(period=period),
            'attendance': self._attendance_snapshot(),
            'compliance': self._compliance_snapshot(),
        }

    def save_snapshot(self, role_scope: str, period: str | None = None) -> AnalyticsSnapshot:
        snapshot, _ = AnalyticsSnapshot.objects.update_or_create(
            tenant=self.tenant,
            snapshot_date=date.today(),
            role_scope=role_scope,
            defaults={'metrics': self.build_dashboard(period=period)},
        )
        return snapshot

    def to_dict(self) -> Dict[str, Any]:
        return self.build_dashboard()


class CustomReportBO(BaseBusinessObject):
    ALLOWED_FIELDS = {
        'applications.total',
        'applications.active',
        'invoices.total',
        'invoices.outstanding',
        'payments.completed',
        'attendance.rate',
        'incidents.total',
    }

    def __init__(self, tenant: Tenant, actor_id: UUID | None, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.actor_id = actor_id
        self.actor_role = actor_role

    def _compute_field(self, field: str) -> Any:
        if field == 'applications.total':
            return Application.objects.filter(tenant=self.tenant, is_deleted=False).count()
        if field == 'applications.active':
            return Application.objects.filter(tenant=self.tenant, is_deleted=False, status='Active').count()
        if field == 'invoices.total':
            return _to_float(
                Invoice.objects.filter(tenant=self.tenant, is_deleted=False)
                .aggregate(total=Coalesce(Sum('total'), Decimal('0.00')))['total']
            )
        if field == 'invoices.outstanding':
            invoiced = _to_float(
                Invoice.objects.filter(tenant=self.tenant, is_deleted=False)
                .aggregate(total=Coalesce(Sum('total'), Decimal('0.00')))['total']
            )
            paid = _to_float(
                Payment.objects.filter(tenant=self.tenant, is_deleted=False, status='Completed')
                .aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
            )
            return round(max(invoiced - paid, 0.0), 2)
        if field == 'payments.completed':
            return _to_float(
                Payment.objects.filter(tenant=self.tenant, is_deleted=False, status='Completed')
                .aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
            )
        if field == 'attendance.rate':
            attendance = StudentAttendance.objects.filter(tenant=self.tenant, is_deleted=False)
            total = attendance.count()
            if total == 0:
                return 100.0
            present = attendance.filter(status__in=['Present', 'Late']).count()
            return round((present / total) * 100, 2)
        if field == 'incidents.total':
            return Incident.objects.filter(tenant=self.tenant, is_deleted=False).count()
        return None

    def run_report(
        self,
        name: str,
        fields: List[str],
        filters: Dict[str, Any] | None = None,
        group_by: List[str] | None = None,
    ) -> CustomReport:
        selected = [field for field in fields if field in self.ALLOWED_FIELDS]
        if not selected:
            selected = ['applications.total', 'invoices.total', 'attendance.rate']

        values = {field: self._compute_field(field) for field in selected}
        report = CustomReport.objects.create(
            tenant=self.tenant,
            name=name,
            requested_by=self.actor_id,
            requested_role=self.actor_role,
            fields=selected,
            filters=filters or {},
            group_by=group_by or [],
            status='Completed',
            result={'values': values},
        )
        return report

    def schedule_report(self, report: CustomReport, cron_expression: str, destination: str, active: bool = True) -> ReportSchedule:
        return ReportSchedule.objects.create(
            tenant=self.tenant,
            report=report,
            cron_expression=cron_expression,
            destination=destination,
            active=active,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'CustomReport'}


class WebhookDispatcherBO(BaseBusinessObject):
    def __init__(self, tenant: Tenant, actor_role: str = 'Admin'):
        self.tenant = tenant
        self.actor_role = actor_role

    def register_subscription(self, event_type: str, target_url: str, secret: str, active: bool = True, retry_limit: int = 5) -> WebhookSubscription:
        return WebhookSubscription.objects.create(
            tenant=self.tenant,
            event_type=event_type,
            target_url=target_url,
            secret=secret,
            active=active,
            retry_limit=retry_limit,
        )

    def dispatch_event(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        serialized = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        subscriptions = WebhookSubscription.objects.filter(
            tenant=self.tenant,
            event_type=event_type,
            active=True,
            is_deleted=False,
        )

        deliveries = []
        for sub in subscriptions:
            signature = hmac.new(
                sub.secret.encode('utf-8'),
                serialized.encode('utf-8'),
                hashlib.sha256,
            ).hexdigest()
            attempt = WebhookDeliveryAttempt.objects.create(
                tenant=self.tenant,
                webhook=sub,
                event_type=event_type,
                payload=payload,
                signature=signature,
                status='Pending',
                attempt_count=1,
                response_body='',
            )
            deliveries.append(
                {
                    'delivery_id': str(attempt.delivery_id),
                    'target_url': sub.target_url,
                    'signature': signature,
                    'status': attempt.status,
                }
            )

        return {
            'bo': 'WebhookDispatcher',
            'event_type': event_type,
            'subscriptions_notified': subscriptions.count(),
            'deliveries': deliveries,
        }

    def to_dict(self) -> Dict[str, Any]:
        return {'bo': 'WebhookDispatcher'}
