import json
import uuid
from datetime import date

import pytest
from django.conf import settings
from django.test import Client
from jose import jwt

from core.models import AuditLog, CareEvent, LearningObservation, Message, Student


def _make_token(tenant_id, role, user_id=None, email=None, assigned_class_ids=None, linked_student_ids=None):
    payload = {
        "sub": str(user_id or uuid.uuid4()),
        "user_id": str(user_id or uuid.uuid4()),
        "tenant_id": str(tenant_id),
        "role": role,
    }
    if email:
        payload["email"] = email
    if assigned_class_ids is not None:
        payload["assigned_class_ids"] = [str(c) for c in assigned_class_ids]
    if linked_student_ids is not None:
        payload["linked_student_ids"] = [str(s) for s in linked_student_ids]
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


@pytest.mark.django_db
class TestCaregiverTier2:
    @pytest.fixture
    def setup_cohort(self, tenant_a):
        room_1a_id = uuid.UUID("00000000-0000-0000-0000-0000000001a0")
        maya = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-1001",
            name="Maya Lin",
            grade="Toddler & Pre-K",
            section="Room 1A",
            class_id=room_1a_id,
            dob=date(2022, 9, 15),
            status="Active",
        )
        noah = Student.objects.create(
            tenant=tenant_a,
            student_number="SUN-1004",
            name="Noah Parker",
            grade="Toddler & Pre-K",
            section="Room 1A",
            class_id=room_1a_id,
            dob=date(2022, 11, 12),
            status="Active",
        )
        cg_token = _make_token(tenant_a.tenant_id, "CareGiver", assigned_class_ids=[room_1a_id])
        principal_token = _make_token(tenant_a.tenant_id, "Principal")
        parent_token = _make_token(tenant_a.tenant_id, "Parent", linked_student_ids=[maya.student_id])
        return {
            "tenant": tenant_a,
            "maya": maya,
            "noah": noah,
            "cg_token": cg_token,
            "principal_token": principal_token,
            "parent_token": parent_token,
        }

    def test_us_cg_09_health_screen_clean_block_and_supervisor_override(self, setup_cohort):
        client = Client()
        cg_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_cohort['cg_token']}"}
        prin_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_cohort['principal_token']}"}
        maya = setup_cohort["maya"]
        noah = setup_cohort["noah"]

        # 1. Clean check-in -> 200 + CareEvent(health_screen) created
        r_clean = client.post(
            "/api/v1/attendance/check-in",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "symptoms": [],
                "temperature_c": 36.7,
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_clean.status_code == 200
        assert r_clean.json()["data"]["status"] == "Present"
        assert r_clean.json()["data"]["health_screen"]["event_type"] == "health_screen"
        assert CareEvent.objects.filter(student=maya, event_type="health_screen").exists()

        # 2. Positive symptom screen (fever + 38.6C) without override -> 422 + Admin alert
        r_block = client.post(
            "/api/v1/attendance/check-in",
            data=json.dumps({
                "student_id": str(noah.student_id),
                "symptoms": ["fever"],
                "temperature_c": 38.6,
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_block.status_code == 422
        assert "Do Not Admit" in r_block.json()["errors"][0]["message"]
        assert Message.objects.filter(trigger_event="Health_Screen_Flagged").exists()

        # 3. Caregiver cannot self-override -> 422
        r_cg_override = client.post(
            "/api/v1/attendance/check-in",
            data=json.dumps({
                "student_id": str(noah.student_id),
                "symptoms": ["cough"],
                "supervisor_override": True,
                "override_reason": "Attempting self override",
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_cg_override.status_code == 422

        # 4. Principal Supervisor override -> 200 + AuditLog written
        r_override = client.post(
            "/api/v1/attendance/check-in",
            data=json.dumps({
                "student_id": str(noah.student_id),
                "symptoms": ["cough"],
                "temperature_c": 37.1,
                "supervisor_override": True,
                "override_reason": "Seasonal allergy cleared with parent note",
            }),
            content_type="application/json",
            **prin_headers,
        )
        assert r_override.status_code == 200
        assert r_override.json()["data"]["status"] == "Present"
        assert AuditLog.objects.filter(
            entity_id=str(noah.student_id),
            entity="HealthScreenOverride",
        ).exists()

    def test_us_cg_10_learning_observations_summary_and_parent_visibility(self, setup_cohort):
        client = Client()
        cg_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_cohort['cg_token']}"}
        p_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_cohort['parent_token']}"}
        maya = setup_cohort["maya"]

        # 1. Frameworks endpoint auto-seeds ELECT, HDLH, EYFS
        r_fw = client.get("/api/v1/learning-frameworks", **cg_headers)
        assert r_fw.status_code == 200
        codes = [f["code"] for f in r_fw.json()["data"]["frameworks"]]
        assert "ELECT" in codes

        # 2. Shared observation
        r_shared = client.post(
            "/api/v1/learning-observations",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "framework": "ELECT",
                "domains": ["Fine Motor", "Language"],
                "note": "Sorted colored blocks by size while naming colors.",
                "shared_with_family": True,
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_shared.status_code == 201
        shared_id = r_shared.json()["data"]["observation_id"]

        # 3. Draft (unshared) observation
        r_draft = client.post(
            "/api/v1/learning-observations",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "framework": "ELECT",
                "domains": ["Cognitive"],
                "note": "Internal educator draft note.",
                "shared_with_family": False,
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_draft.status_code == 201
        draft_id = r_draft.json()["data"]["observation_id"]

        # 4. Caregiver sees both + Developmental Summary counts all domains
        r_cg_list = client.get(f"/api/v1/learning-observations?student_id={maya.student_id}", **cg_headers)
        assert r_cg_list.status_code == 200
        assert len(r_cg_list.json()["data"]["observations"]) == 2
        summary = r_cg_list.json()["data"]["developmental_summary"]
        assert summary["domain_counts"]["Fine Motor"] == 1
        assert summary["domain_counts"]["Language"] == 1
        assert summary["domain_counts"]["Cognitive"] == 1

        # 5. Parent API sees ONLY shared_with_family=True (Draft never leaks!)
        r_p_list = client.get(f"/api/v1/learning-observations?student_id={maya.student_id}", **p_headers)
        assert r_p_list.status_code == 200
        p_ids = [o["observation_id"] for o in r_p_list.json()["data"]["observations"]]
        assert shared_id in p_ids
        assert draft_id not in p_ids

        # Parent feed also includes shared observation only
        r_feed = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **p_headers)
        assert r_feed.status_code == 200
        feed_ids = [item["item_id"] for item in r_feed.json()["data"]["feed"]]
        assert shared_id in feed_ids
        assert draft_id not in feed_ids

        # 6. Update & Delete
        r_patch = client.patch(
            f"/api/v1/learning-observations/{draft_id}",
            data=json.dumps({"shared_with_family": True}),
            content_type="application/json",
            **cg_headers,
        )
        assert r_patch.status_code == 200
        assert r_patch.json()["data"]["shared_with_family"] is True

        r_del = client.delete(f"/api/v1/learning-observations/{draft_id}", **cg_headers)
        assert r_del.status_code == 200
        assert LearningObservation.objects.get(observation_id=draft_id).is_deleted is True
