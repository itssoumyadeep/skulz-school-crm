import base64
import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from django.core.cache import cache
from django.test import Client, override_settings
import jwt

from core.models import Student

CRM_ROOT = Path(__file__).resolve().parents[1]
SKULZ_FRONTEND = (
    CRM_ROOT.parent / "Skulz" / "frontend"
)


def _unsigned_none_jwt(payload):
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "none", "typ": "JWT"}).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    body = base64.urlsafe_b64encode(
        json.dumps(payload).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    return f"{header}.{body}."


@pytest.mark.django_db
class TestUSMkt04SecurityVAPT:
    def setup_method(self):
        self.client = Client()
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_security_headers_and_auth_cache_control(self):
        health = self.client.get("/api/v1/healthz")
        assert health.status_code == 200
        assert health["X-Content-Type-Options"] == "nosniff"
        assert health["X-Frame-Options"] == "DENY"
        assert health["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "Permissions-Policy" in health
        assert "Server" not in health

        auth_res = self.client.post(
            "/api/v1/auth/login",
            data={"username": "missing", "password": "wrong"},
            content_type="application/json",
        )
        assert "no-store" in auth_res["Cache-Control"]

    @override_settings(ALLOW_INSECURE_DEV_TOKENS=False)
    def test_rejects_alg_none_jwt_and_missing_exp_when_enforced(self, tenant_a):
        none_tok = _unsigned_none_jwt(
            {
                "sub": "00000000-0000-0000-0000-000000000001",
                "tenant_id": str(tenant_a.tenant_id),
                "role": "admin",
                "exp": int(datetime.now(timezone.utc).timestamp()) + 3600,
            }
        )
        res = self.client.get(
            "/api/v1/students",
            HTTP_AUTHORIZATION=f"Bearer {none_tok}",
        )
        assert res.status_code == 401

        from django.conf import settings

        no_exp_tok = jwt.encode(
            {
                "sub": "00000000-0000-0000-0000-000000000001",
                "tenant_id": str(tenant_a.tenant_id),
                "role": "Admin",
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )
        with override_settings(REQUIRE_JWT_EXP=True):
            res_no_exp = self.client.get(
                "/api/v1/students",
                HTTP_AUTHORIZATION=f"Bearer {no_exp_tok}",
            )
            assert res_no_exp.status_code == 401

    @override_settings(RATE_LIMIT_ENABLED=True, RATE_LIMIT_AUTH_PER_MIN=2)
    def test_rate_limit_returns_429_with_retry_after(self):
        payload = {"username": "bad_demo", "password": "wrong"}
        r1 = self.client.post("/api/v1/auth/login", data=payload, content_type="application/json")
        r2 = self.client.post("/api/v1/auth/login", data=payload, content_type="application/json")
        r3 = self.client.post("/api/v1/auth/login", data=payload, content_type="application/json")
        assert r1.status_code == 401
        assert r2.status_code == 401
        assert r3.status_code == 429
        assert int(r3["Retry-After"]) >= 1
        assert r3.json()["errors"][0]["code"] == "RATE_LIMIT_EXCEEDED"

    def test_csv_formula_injection_rolls_back_atomically_while_valid_phone_imports(
        self, tenant_a, admin_token_tenant_a
    ):
        malicious = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "students",
                "records": [
                    {
                        "first_name": "Clean",
                        "last_name": "Child",
                        "grade": "Pre-K",
                        "parent_name": "Good Parent",
                        "parent_phone": "+15550100",
                    },
                    {
                        "first_name": "=CMD|'/C calc'!A0",
                        "last_name": "Evil",
                        "grade": "Pre-K",
                        "parent_name": "Bad Parent",
                    },
                ],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert malicious.status_code == 422
        assert Student.objects.filter(tenant=tenant_a).count() == 0

        clean = self.client.post(
            "/api/v1/school-setup/import",
            data={
                "dataset": "students",
                "records": [
                    {
                        "first_name": "Safe",
                        "last_name": "Toddler",
                        "grade": "Toddler & Pre-K",
                        "parent_name": "Safe Parent",
                        "parent_phone": "+15550100",
                    }
                ],
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert clean.status_code == 201
        assert Student.objects.filter(tenant=tenant_a).count() == 1


def test_cross_app_frontend_security_manifests_present():
    next_cfg = (CRM_ROOT / "frontend" / "next.config.ts").read_text(encoding="utf-8")
    assert "192.168.10.101" not in next_cfg
    assert "10.0.0.156" not in next_cfg
    assert "Strict-Transport-Security" in next_cfg
    assert "X-Frame-Options" in next_cfg

    crm_headers = (CRM_ROOT / "frontend" / "public" / "_headers").read_text(encoding="utf-8")
    assert "Content-Security-Policy" in crm_headers
    assert "X-Frame-Options: DENY" in crm_headers
    assert "X-Content-Type-Options: nosniff" in crm_headers
    assert "unsafe-eval" not in crm_headers

    skulz_headers_path = SKULZ_FRONTEND / "public" / "_headers"
    if skulz_headers_path.exists():
        skulz_headers = skulz_headers_path.read_text(encoding="utf-8")
        assert "Content-Security-Policy" in skulz_headers
        assert "X-Frame-Options: DENY" in skulz_headers
        assert "X-Content-Type-Options: nosniff" in skulz_headers
        assert "unsafe-eval" not in skulz_headers
