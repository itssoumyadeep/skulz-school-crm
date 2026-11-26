import os
import secrets
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from jose import jwt

from django.conf import settings
from core.business_objects.trial import TrialSignupBO
from core.models import AuditLog, Tenant

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _make_token(tenant_id, role="Admin"):
    payload = {
        "sub": str(uuid.uuid4()),
        "user_id": str(uuid.uuid4()),
        "tenant_id": str(tenant_id),
        "role": role,
        "exp": int(datetime.now(timezone.utc).timestamp()) + 3600,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


@pytest.mark.parametrize("bad_value", ["0", "-5", "366", "fourteen"])
def test_invalid_default_free_trial_days_fails_startup(bad_value):
    env = os.environ.copy()
    env["PYTHON_DOTENV_DISABLED"] = "true"
    env["DJANGO_DEBUG"] = "true"
    env["DJANGO_SECRET_KEY"] = secrets.token_urlsafe(64)
    env["JWT_SECRET_KEY"] = secrets.token_urlsafe(64)
    env["DEFAULT_FREE_TRIAL_DAYS"] = bad_value

    result = subprocess.run(
        [sys.executable, "-c", "import config.settings"],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "DEFAULT_FREE_TRIAL_DAYS" in result.stderr


@pytest.mark.django_db
class TestUSMkt03ConfigurableTrialLifecycle:
    def setup_method(self):
        self.client = Client()

    def test_trial_policy_and_configurable_duration_on_signup(self):
        with override_settings(DEFAULT_FREE_TRIAL_DAYS=21):
            policy_res = self.client.get("/api/v1/metadata/trial-policy")
            assert policy_res.status_code == 200
            policy = policy_res.json()["data"]
            assert policy["default_trial_days"] == 21
            assert policy["allowed_roles"] == ["Admin", "Owner", "Teacher"]

            res = self.client.post(
                "/api/v1/auth/trial-signup",
                data={
                    "daycare_name": "Cedar Trial Care",
                    "email": "cedar.trial@example.com",
                    "role": "Owner",
                    "password": "Vx!7qT2#pL9z@2026",
                    "confirm_password": "Vx!7qT2#pL9z@2026",
                },
                content_type="application/json",
            )
            assert res.status_code == 201
            data = res.json()["data"]
            assert "access_token" not in data
            assert data["trial"]["trial_duration_days"] == 21
            assert data["trial"]["is_expired"] is False
            assert data["trial"]["days_remaining"] == 21

            tenant = Tenant.objects.get(tenant_id=data["tenant"]["id"])
            assert tenant.config["trial_duration_days"] == 21
            assert tenant.config["trial_status"] == "active"

    def test_expired_trial_blocks_writes_preserves_reads_and_owner_can_extend(self):
        started = datetime.now(timezone.utc) - timedelta(days=20)
        ended = datetime.now(timezone.utc) - timedelta(days=1)
        tenant = Tenant.objects.create(
            tenant_id=uuid.uuid4(),
            name="Expired Cubs",
            subdomain="SCEXPD001",
            type="Daycare",
            subscription_tier="Basic",
            region="Canada",
            config={
                "account_type": "free_trial",
                "trial_duration_days": 14,
                "trial_started_at": started.isoformat(),
                "trial_ends_at": ended.isoformat(),
                "trial_status": "active",
            },
        )
        admin_token = _make_token(tenant.tenant_id, "Admin")
        owner_token = _make_token(tenant.tenant_id, "Owner")

        # Profile & GET reads still work when trial is expired
        profile_res = self.client.get(
            "/api/v1/auth/profile",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert profile_res.status_code == 200
        assert profile_res.json()["data"]["trial"]["is_expired"] is True
        assert profile_res.json()["data"]["trial"]["days_remaining"] == 0

        get_students_res = self.client.get(
            "/api/v1/students",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert get_students_res.status_code == 200

        # Operational writes fail with HTTP 402 TRIAL_EXPIRED
        blocked_write = self.client.post(
            "/api/v1/students",
            data={
                "name": "Test Toddler",
                "grade": "Toddler",
                "status": "Inactive",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert blocked_write.status_code == 402
        assert blocked_write.json()["errors"][0]["code"] == "TRIAL_EXPIRED"

        # Non-Owner cannot extend trial (403)
        admin_extend = self.client.patch(
            "/api/v1/school-setup/trial",
            data={"extend_days": 7, "reason": "Unauthorized extension"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert admin_extend.status_code == 403

        # Owner can extend trial on exempt route -> restores operational writes + writes AuditLog
        owner_extend = self.client.patch(
            "/api/v1/school-setup/trial",
            data={"extend_days": 7, "reason": "Extended pilot for inspection"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {owner_token}",
        )
        assert owner_extend.status_code == 200
        assert owner_extend.json()["data"]["trial"]["is_expired"] is False
        assert owner_extend.json()["data"]["trial"]["days_remaining"] >= 7

        assert AuditLog.objects.filter(
            tenant=tenant, action="UPDATE", entity="Tenant"
        ).exists()

        # After extension, student creation succeeds
        allowed_write = self.client.post(
            "/api/v1/students",
            data={
                "name": "Test Toddler",
                "grade": "Toddler",
                "status": "Inactive",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token}",
        )
        assert allowed_write.status_code == 201
