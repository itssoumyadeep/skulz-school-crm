import re

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client

from core.models import PortalRoleMembership, Tenant


@pytest.mark.django_db
class TestTrialSignupAPI:
    def setup_method(self):
        self.client = Client()

    def signup(self, **overrides):
        payload = {
            "daycare_name": "Sunshine Daycare",
            "email": "owner@sunshine.example",
            "role": "Owner",
            "password": "Vx!7qT2#pL9z",
            "confirm_password": "Vx!7qT2#pL9z",
        }
        payload.update(overrides)
        return self.client.post(
            "/api/v1/auth/trial-signup",
            data=payload,
            content_type="application/json",
        )

    @pytest.mark.parametrize(
        ("role", "portal_path"),
        [
            ("Admin", "/admin"),
            ("Teacher", "/teacher"),
            ("Owner", "/governance/owner"),
        ],
    )
    def test_trial_signup_creates_school_and_selected_user_role(
        self, role, portal_path
    ):
        response = self.signup(role=role)

        assert response.status_code == 201
        data = response.json()["data"]
        tenant = Tenant.objects.get(tenant_id=data["tenant"]["id"])
        user = get_user_model().objects.get(email="owner@sunshine.example")
        membership = PortalRoleMembership.objects.get(user=user, tenant=tenant)

        assert tenant.name == "Sunshine Daycare"
        assert re.fullmatch(r"SC[A-Z0-9]{7}", data["tenant"]["code"])
        assert user.username.endswith(f"_{tenant.subdomain}")
        assert user.is_active
        assert user.check_password("Vx!7qT2#pL9z")
        assert membership.role == role
        assert membership.group.name == role
        assert "access_token" not in data
        assert data["portal_path"] == portal_path
        assert data["user"]["role"] == role
        assert tenant.config["account_type"] == "free_trial"

    def test_trial_signup_rejects_password_confirmation_mismatch(self):
        response = self.signup(confirm_password="different-password")

        assert response.status_code == 422
        assert Tenant.objects.count() == 0
        assert get_user_model().objects.count() == 0

    def test_trial_signup_rejects_duplicate_email_without_creating_tenant(self):
        get_user_model().objects.create_user(
            username="existing_user",
            email="owner@sunshine.example",
            password="Vx!7qT2#pL9z",
        )

        response = self.signup()

        assert response.status_code == 409
        assert response.json()["errors"][0]["code"] == "ACCOUNT_EXISTS"
        assert Tenant.objects.count() == 0