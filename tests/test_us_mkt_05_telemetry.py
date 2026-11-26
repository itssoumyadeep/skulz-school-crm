import json

import pytest
from django.test import Client

from core.telemetry import registry, scrub_pii


class TestTelemetryPIIScrubber:
    def test_scrubs_credentials_tokens_emails_and_child_health_fields(self):
        sample = {
            "event": "care_update",
            "student_name": "Maya Lin",
            "email": "parent@example.com",
            "password": "SuperSecretPassword123!",
            "pickup_pin": "8841",
            "allergies": "Peanut allergy",
            "medication_notes": "Amoxicillin 5ml",
            "note": "Contact parent@example.com with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sig123456",
            "safe_count": 5,
            "role": "admin",
        }
        cleaned = scrub_pii(sample)
        serialized = json.dumps(cleaned)
        assert cleaned["safe_count"] == 5
        assert cleaned["role"] == "admin"
        for sensitive in (
            "Maya Lin",
            "parent@example.com",
            "SuperSecretPassword123!",
            "8841",
            "Peanut allergy",
            "Amoxicillin 5ml",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        ):
            assert sensitive not in serialized


@pytest.mark.django_db
class TestUSMkt05TelemetryAndProbes:
    def setup_method(self):
        self.client = Client()
        registry.reset()

    def test_healthz_readyz_and_request_id_propagation(self):
        health = self.client.get(
            "/api/v1/healthz",
            HTTP_X_REQUEST_ID="req-correlation-001",
        )
        assert health.status_code == 200
        assert health["X-Request-ID"] == "req-correlation-001"
        assert health.json()["status"] == "ok"

        ready = self.client.get("/api/v1/readyz")
        assert ready.status_code == 200
        assert ready.json()["database"] == "ok"
        assert ready["X-Request-ID"]

    def test_telemetry_batch_ingestion_scrubs_pii_and_summary_enforces_rbac(
        self, admin_token_tenant_a, parent_token_tenant_a
    ):
        ingest = self.client.post(
            "/api/v1/telemetry/events",
            data={
                "app": "skulz_marketing",
                "events": [
                    {
                        "event_name": "trial_created",
                        "path": "/start-free-trial",
                        "status_code": 201,
                        "duration_ms": 142.5,
                        "properties": {
                            "role": "Admin",
                            "email": "leak@example.com",
                            "password": "NeverLogPassword!",
                        },
                    }
                ],
            },
            content_type="application/json",
            HTTP_X_REQUEST_ID="mkt-trace-12345",
        )
        assert ingest.status_code == 202
        assert ingest.json()["data"]["accepted"] == 1
        assert ingest["X-Request-ID"] == "mkt-trace-12345"

        recent_serialized = json.dumps(registry.recent())
        assert "leak@example.com" not in recent_serialized
        assert "NeverLogPassword!" not in recent_serialized

        # Oversized batch (>25 events) rejected with HTTP 422
        oversized = self.client.post(
            "/api/v1/telemetry/events",
            data={
                "app": "skool_crm_web",
                "events": [{"event_name": f"e{i}"} for i in range(26)],
            },
            content_type="application/json",
        )
        assert oversized.status_code == 422

        # Summary RBAC: unauthenticated -> 401, Parent -> 403, Admin -> 200
        assert self.client.get("/api/v1/telemetry/summary").status_code == 401
        assert (
            self.client.get(
                "/api/v1/telemetry/summary",
                HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
            ).status_code
            == 403
        )
        summary = self.client.get(
            "/api/v1/telemetry/summary",
            HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
        )
        assert summary.status_code == 200
        body = summary.json()["data"]
        assert body["event_counts"]["trial_created"] == 1
        assert body["source_counts"]["skulz_marketing"] == 1
