import json
import uuid
from datetime import date
from decimal import Decimal

import pytest
from django.conf import settings
from django.test import Client
from jose import jwt

from core.models import Application, Invoice, Parent, Payment, Student


@pytest.fixture
def owner_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        'sub': user_id,
        'tenant_id': str(tenant_a.tenant_id),
        'role': 'Owner',
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')


@pytest.mark.django_db
class TestAnalyticsAPI:
    def setup_method(self):
        self.client = Client()

    def _seed_financial_records(self, tenant_a):
        student = Student.objects.create(
            tenant=tenant_a,
            student_number='OAK-2026-0099',
            name='Ava Collins',
            dob=date(2016, 4, 11),
            grade='Grade 2',
            status='Active',
            enrolled_date=date(2026, 1, 5),
        )
        Application.objects.create(
            tenant=tenant_a,
            student=student,
            status='Active',
        )
        parent = Parent.objects.create(
            tenant=tenant_a,
            student=student,
            name='Ethan Collins',
            relationship='Father',
            phone='+1-416-555-0101',
            email='ethan.collins@example.com',
        )
        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=student,
            parent=parent,
            invoice_date=date(2026, 9, 1),
            due_date=date(2026, 9, 15),
            line_items=[{'description': 'Tuition', 'amount': 700}],
            total=Decimal('700.00'),
            status='Issued',
            invoice_type='Tuition',
        )
        Payment.objects.create(
            tenant=tenant_a,
            invoice=invoice,
            parent=parent,
            amount=Decimal('250.00'),
            method='Card',
            status='Completed',
            receipt_id='RCPT-001',
        )

    def test_dashboard_and_financial_endpoints(self, tenant_a, owner_token_tenant_a):
        self._seed_financial_records(tenant_a)

        dashboard_response = self.client.get(
            '/api/v1/analytics/dashboard?period=2026-09',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert dashboard_response.status_code == 200
        payload = dashboard_response.json()['data']
        assert payload['bo'] == 'AnalyticsDashboard'
        assert payload['financial']['revenue'] == 250.0
        assert payload['financial']['invoiced'] == 700.0

        financial_response = self.client.get(
            '/api/v1/analytics/financial/2026-09',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert financial_response.status_code == 200
        assert financial_response.json()['data']['financial']['outstanding'] == 450.0

    def test_custom_report_create_fetch_and_schedule(self, tenant_a, owner_token_tenant_a):
        create_response = self.client.post(
            '/api/v1/reports/custom',
            data=json.dumps(
                {
                    'name': 'Executive Snapshot',
                    'fields': ['applications.total', 'invoices.total', 'attendance.rate'],
                    'filters': {'period': '2026-09'},
                    'group_by': ['period'],
                }
            ),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert create_response.status_code == 201
        report_id = create_response.json()['data']['report_id']

        fetch_response = self.client.get(
            f'/api/v1/reports/{report_id}',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert fetch_response.status_code == 200
        assert fetch_response.json()['data']['name'] == 'Executive Snapshot'

        schedule_response = self.client.post(
            f'/api/v1/reports/{report_id}/schedule',
            data=json.dumps(
                {
                    'cron_expression': '0 7 * * 1',
                    'destination': 'email',
                    'active': True,
                }
            ),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert schedule_response.status_code == 201
        assert schedule_response.json()['data']['active'] is True

    def test_webhook_subscription_and_dispatch(self, tenant_a, owner_token_tenant_a):
        sub_response = self.client.post(
            '/api/v1/webhooks/subscriptions',
            data=json.dumps(
                {
                    'event_type': 'invoice.generated',
                    'target_url': 'https://example.org/webhooks/invoice',
                    'secret': 'top-secret',
                    'active': True,
                    'retry_limit': 4,
                }
            ),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert sub_response.status_code == 201

        dispatch_response = self.client.post(
            '/api/v1/webhooks/dispatch',
            data=json.dumps(
                {
                    'event_type': 'invoice.generated',
                    'payload': {'invoice_id': str(uuid.uuid4()), 'amount': 700},
                }
            ),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert dispatch_response.status_code == 200
        data = dispatch_response.json()['data']
        assert data['subscriptions_notified'] == 1
        assert len(data['deliveries']) == 1

    def test_invalid_webhook_event_type(self, tenant_a, owner_token_tenant_a):
        response = self.client.post(
            '/api/v1/webhooks/subscriptions',
            data=json.dumps(
                {
                    'event_type': 'unsupported.event',
                    'target_url': 'https://example.org/webhooks/unknown',
                    'secret': 'top-secret',
                }
            ),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {owner_token_tenant_a}',
        )
        assert response.status_code == 422
        assert response.json()['errors'][0]['code'] == 'INVALID_EVENT_TYPE'
