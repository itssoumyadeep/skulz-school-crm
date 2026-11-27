import re
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core.business_objects.username import UsernameGeneratorBO
from core.models import PortalRoleMembership, Tenant, UsernameNumberReservation


@pytest.mark.django_db
class TestTrialSignupAPI:
    def setup_method(self):
        self.client = Client()

    def signup(self, **overrides):
        payload = {
            "daycare_name": "Sunshine Daycare",
            "first_name": "Olivia",
            "last_name": "Parker",
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
        expected_username_pattern = rf"op\d{{8}}_{tenant.subdomain}"
        assert re.fullmatch(expected_username_pattern, user.username)
        assert data["user"]["username"] == user.username
        assert data["user"]["first_name"] == "Olivia"
        assert data["user"]["last_name"] == "Parker"
        assert user.first_name == "Olivia"
        assert user.last_name == "Parker"
        assert UsernameNumberReservation.objects.filter(
            number_code=user.username[2:10], user=user
        ).exists()
        assert user.is_active
        assert user.check_password("Vx!7qT2#pL9z")
        assert membership.role == role
        assert membership.group.name == role
        assert "access_token" not in data
        assert data["portal_path"] == portal_path
        assert data["user"]["role"] == role
        assert tenant.config["account_type"] == "free_trial"

        # Immediate login works with the generated username
        login_res = self.client.post(
            "/api/v1/auth/login",
            data={
                "username": data["user"]["username"],
                "password": "Vx!7qT2#pL9z",
            },
            content_type="application/json",
        )
        assert login_res.status_code == 200
        assert login_res.json()["data"]["tenant_id"] == str(tenant.tenant_id)
        assert login_res.json()["data"]["user"]["username"] == user.username

    def test_trial_signup_enforces_cross_tenant_global_8_digit_uniqueness(self):
        first_res = self.signup(
            daycare_name="First Daycare",
            first_name="Olivia",
            last_name="Parker",
            email="first@sunshine.example",
        )
        assert first_res.status_code == 201
        first_username = first_res.json()["data"]["user"]["username"]
        first_code = first_username[2:10]

        with patch.object(
            UsernameGeneratorBO,
            "generate_8_digit_number",
            side_effect=[first_code, "44556677"],
        ):
            second_res = self.signup(
                daycare_name="Second Daycare",
                first_name="Liam",
                last_name="Carter",
                email="second@sunshine.example",
            )

        assert second_res.status_code == 201
        second_username = second_res.json()["data"]["user"]["username"]
        assert re.fullmatch(r"lc44556677_SC[A-Z0-9]{7}", second_username)
        assert second_username[2:10] != first_code

    @pytest.mark.parametrize(
        "bad_overrides",
        [
            {"first_name": "123", "last_name": "Parker"},
            {"first_name": "Olivia", "last_name": "!!!"},
            {"first_name": "   ", "last_name": "Parker"},
            {"first_name": "Olivia", "last_name": ""},
        ],
    )
    def test_trial_signup_rejects_invalid_names_with_422_and_zero_orphans(
        self, bad_overrides
    ):
        response = self.signup(**bad_overrides)

        assert response.status_code == 422
        assert Tenant.objects.count() == 0
        assert get_user_model().objects.count() == 0

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

    def test_trial_signup_allows_marketing_app_cors_preflight_and_rejects_invalid_role(
        self,
    ):
        preflight = self.client.options(
            "/api/v1/auth/trial-signup",
            HTTP_ORIGIN="http://localhost:5173",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="Content-Type",
        )
        assert preflight.status_code == 200
        assert preflight["Access-Control-Allow-Origin"] == "http://localhost:5173"

        invalid_role = self.client.post(
            "/api/v1/auth/trial-signup",
            data={
                "daycare_name": "Sunshine Daycare",
                "first_name": "Olivia",
                "last_name": "Parker",
                "email": "parent@sunshine.example",
                "role": "Parent",
                "password": "Vx!7qT2#pL9z",
                "confirm_password": "Vx!7qT2#pL9z",
            },
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:5173",
        )
        assert invalid_role.status_code == 422
        assert invalid_role["Access-Control-Allow-Origin"] == "http://localhost:5173"
        assert Tenant.objects.count() == 0