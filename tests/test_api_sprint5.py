import json
import uuid
from datetime import date
from decimal import Decimal

import pytest
from django.conf import settings
from django.test import Client
from jose import jwt

from core.models import Event, PurchaseOrder, Requisition, Staff, Vendor


@pytest.fixture
def admin_token_tenant_a(tenant_a):
    user_id = str(uuid.uuid4())
    payload = {
        'sub': user_id,
        'tenant_id': str(tenant_a.tenant_id),
        'role': 'Admin',
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')


@pytest.mark.django_db
class TestSprint5API:
    def setup_method(self):
        self.client = Client()

    def test_create_staff_and_compliance(self, tenant_a, admin_token_tenant_a):
        response = self.client.post(
            '/api/v1/staff',
            data=json.dumps({
                'name': 'Rita Shah',
                'role': 'Administrator',
                'dept': 'Operations',
                'employment_type': 'Full_Time',
                'start_date': '2025-01-01',
                'salary': '45000.00',
                'certifications': [],
                'dbs_ref': 'DBS-100',
                'dbs_expiry': '2027-01-01',
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert response.status_code == 201
        staff_id = response.json()['data']['staff']['staff_id']

        status_response = self.client.get(
            f'/api/v1/staff/{staff_id}/compliance-status',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert status_response.status_code == 200
        assert status_response.json()['data']['dbs_valid'] is True

    def test_compute_payroll(self, tenant_a, admin_token_tenant_a):
        staff = Staff.objects.create(
            tenant=tenant_a,
            name='Payroll Teacher',
            role='Teacher',
            dept='Primary',
            employment_type='Full_Time',
            start_date=date(2025, 1, 1),
            salary=Decimal('3000.00'),
            dbs_ref='DBS-OK',
            dbs_expiry=date(2027, 1, 1),
        )
        response = self.client.post(
            '/api/v1/payroll/compute/2026-08',
            data=json.dumps({
                'staff_id': str(staff.staff_id),
                'base_salary': '3000.00',
                'allowances': {'transport': '200.00'},
                'deductions': {'tax': '100.00'},
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert response.status_code == 201
        assert response.json()['data']['payroll']['net'] < response.json()['data']['payroll']['gross']

    def test_create_event_returns_fee_line_items(self, tenant_a, admin_token_tenant_a):
        response = self.client.post(
            '/api/v1/events',
            data=json.dumps({
                'title': 'Science Fair',
                'event_date': '2026-09-20',
                'registration_deadline': '2026-09-17',
                'location': 'Auditorium',
                'description': 'Annual exhibition',
                'fee_amount': '15.00',
                'capacity': 100,
                'requires_permission_slip': True,
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert response.status_code == 201
        assert response.json()['data']['invoice_line_items'][0]['amount'] == 15.0

    def test_procurement_account_endpoint(self, tenant_a, admin_token_tenant_a):
        vendor = Vendor.objects.create(tenant=tenant_a, name='Lab Supplier', contact_name='Mia')
        requisition = Requisition.objects.create(
            tenant=tenant_a,
            vendor=vendor,
            requester_id=uuid.uuid4(),
            item_name='Microscope',
            quantity=1,
            amount=Decimal('500.00'),
        )
        PurchaseOrder.objects.create(
            tenant=tenant_a,
            vendor=vendor,
            requisition=requisition,
            po_number='PO-900',
            amount=Decimal('500.00'),
            status='Issued',
        )

        response = self.client.get(
            f'/api/v1/vendors/{vendor.vendor_id}/account',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert response.status_code == 200
        assert response.json()['data']['bo'] == 'VendorAccount'

    def test_emergency_broadcast(self, tenant_a, admin_token_tenant_a):
        response = self.client.post(
            '/api/v1/broadcasts/emergency',
            data=json.dumps({
                'subject': 'Weather Alert',
                'body': 'Pickup now',
                'recipients': [str(uuid.uuid4()), str(uuid.uuid4())],
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {admin_token_tenant_a}',
        )
        assert response.status_code == 201
        messages = response.json()['data']['messages']
        assert len(messages) == 2
        assert all(message['opt_out_ignored'] for message in messages)
