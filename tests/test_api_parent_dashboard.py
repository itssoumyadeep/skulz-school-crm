import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.conf import settings
from django.test import Client
from django.utils import timezone
from jose import jwt

from core.models import (
    Event,
    Invoice,
    Parent,
    Payment,
    Student,
    StudentAttendance,
)


@pytest.mark.django_db
class TestParentDashboardAPI:
    def setup_method(self):
        self.client = Client()

    def parent_token(self, tenant, email):
        return jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "tenant_id": str(tenant.tenant_id),
                "role": "parent",
                "email": email,
                "exp": int((timezone.now() + timedelta(hours=1)).timestamp()),
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

    def get_dashboard(self, token):
        return self.client.get(
            "/api/v1/parent/dashboard",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

    def test_dashboard_aggregates_only_parent_linked_records(
        self, tenant_a, tenant_b
    ):
        email = "parent@example.com"
        active_child = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0001",
            name="Ava",
            grade="Grade 1",
            status="Active",
        )
        inquiry_child = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0002",
            name="Noah",
            grade="Grade 2",
            status="Inactive",
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=active_child,
            name="Parent One",
            relationship="Mother",
            phone="555-0100",
            email=email,
        )
        Parent.objects.create(
            tenant=tenant_a,
            student=inquiry_child,
            name="Parent One",
            relationship="Mother",
            phone="555-0100",
            email=email,
        )
        Student.objects.create(
            tenant=tenant_b,
            student_number="MLA-2026-0001",
            name="Unrelated",
            grade="Grade 1",
            status="Active",
        )

        invoice = Invoice.objects.create(
            tenant=tenant_a,
            student=active_child,
            parent=active_child.parents.first(),
            invoice_date=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=10),
            total=Decimal("500.00"),
            status="Partially_Paid",
        )
        Invoice.objects.create(
            tenant=tenant_a,
            student=active_child,
            parent=active_child.parents.first(),
            invoice_date=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=10),
            total=Decimal("900.00"),
            status="Draft",
        )
        Payment.objects.create(
            tenant=tenant_a,
            invoice=invoice,
            parent=active_child.parents.first(),
            amount=Decimal("120.00"),
            method="Card",
            status="Completed",
        )

        for child, status in (
            (active_child, "Present"),
            (active_child, "Absent"),
            (inquiry_child, "Late"),
        ):
            StudentAttendance.objects.create(
                tenant=tenant_a,
                student=child,
                class_id=uuid.uuid4(),
                date=timezone.localdate(),
                status=status,
                marked_by=uuid.uuid4(),
            )

        Event.objects.create(
            tenant=tenant_a,
            title="Open upcoming event",
            event_date=timezone.localdate() + timedelta(days=5),
            registration_deadline=timezone.localdate() + timedelta(days=3),
            location="Main room",
            status="Open",
        )
        Event.objects.create(
            tenant=tenant_a,
            title="Draft upcoming event",
            event_date=timezone.localdate() + timedelta(days=5),
            registration_deadline=timezone.localdate() + timedelta(days=3),
            location="Main room",
            status="Draft",
        )

        response = self.get_dashboard(self.parent_token(tenant_a, email))

        assert response.status_code == 200
        assert response.json()["data"] == {
            "children_enrolled": 1,
            "outstanding_balance": 380.0,
            "attendance_rate": 66.67,
            "attendance_sessions": 3,
            "upcoming_events": 1,
        }

    def test_dashboard_returns_zero_and_unknown_attendance_without_records(
        self, tenant_a
    ):
        response = self.get_dashboard(
            self.parent_token(tenant_a, "parent@example.com")
        )

        assert response.status_code == 200
        assert response.json()["data"] == {
            "children_enrolled": 0,
            "outstanding_balance": 0.0,
            "attendance_rate": None,
            "attendance_sessions": 0,
            "upcoming_events": 0,
        }
