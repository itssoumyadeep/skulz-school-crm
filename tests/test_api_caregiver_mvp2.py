import json
import struct
import uuid
from datetime import date, timedelta

import pytest
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.utils import timezone
from jose import jwt

from core.models import AuditLog, CareEvent, CareMedia, Parent, Student, StudentAttendance, StudentHealth


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


def _build_jpeg_with_exif() -> bytes:
    """Minimal valid JPEG with an APP1 EXIF/GPS segment so we can verify EXIF stripping."""
    exif_payload = b"Exif\x00\x00GPS_LAT_43.6532_LON_-79.3832_SECRET_CAMERA"
    app1_seg = b"\xff\xe1" + struct.pack(">H", len(exif_payload) + 2) + exif_payload
    # Minimal SOF0 + SOS + EOI
    sof0 = b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    sos = b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xd2\xcf\x20"
    return b"\xff\xd8" + app1_seg + sof0 + sos + b"\xff\xd9"


@pytest.mark.django_db
class TestCaregiverMVP2:
    @pytest.fixture
    def setup_room(self, tenant_a):
        room_1a_id = uuid.UUID("00000000-0000-0000-0000-0000000001a0")
        other_class_id = uuid.UUID("00000000-0000-0000-0000-0000000004b0")

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
        grade4_student = Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-4001",
            name="Lucas Grade4",
            grade="Grade 4B",
            section="B",
            class_id=other_class_id,
            dob=date(2016, 5, 1),
            status="Active",
        )

        StudentHealth.objects.create(
            tenant=tenant_a,
            student=maya,
            consent_flag=True,
            photo_consent=True,
            topical_consent=True,
        )
        StudentHealth.objects.create(
            tenant=tenant_a,
            student=noah,
            consent_flag=False,
            photo_consent=False,
            topical_consent=False,
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=maya,
            class_id=room_1a_id,
            date=timezone.localdate(),
            period="Full_Day",
            status="Present",
            marked_by=uuid.uuid4(),
        )
        StudentAttendance.objects.create(
            tenant=tenant_a,
            student=noah,
            class_id=room_1a_id,
            date=timezone.localdate(),
            period="Full_Day",
            status="Present",
            marked_by=uuid.uuid4(),
        )

        Parent.objects.create(
            tenant=tenant_a,
            student=maya,
            name="Elena Lin",
            relationship="Mother",
            phone="416-555-0120",
            email="elena.lin@example.com",
        )

        cg_token = _make_token(
            tenant_a.tenant_id,
            "CareGiver",
            assigned_class_ids=[room_1a_id],
        )
        maya_parent_token = _make_token(
            tenant_a.tenant_id,
            "Parent",
            email="elena.lin@example.com",
            linked_student_ids=[maya.student_id],
        )
        other_parent_token = _make_token(
            tenant_a.tenant_id,
            "Parent",
            email="other.parent@example.com",
            linked_student_ids=[noah.student_id],
        )

        return {
            "maya": maya,
            "noah": noah,
            "grade4_student": grade4_student,
            "cg_token": cg_token,
            "maya_parent_token": maya_parent_token,
            "other_parent_token": other_parent_token,
        }

    def test_us_cg_06_single_batch_summary_and_topical_consent(self, setup_room):
        client = Client()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['cg_token']}"}
        maya = setup_room["maya"]
        noah = setup_room["noah"]
        g4 = setup_room["grade4_student"]

        # 1. Single events: mood + water + diaper + meal
        r1 = client.post(
            "/api/v1/care-events",
            data=json.dumps({"student_id": str(maya.student_id), "event_type": "mood", "payload": {"mood": "Playful"}}),
            content_type="application/json",
            **headers,
        )
        assert r1.status_code == 201

        r2 = client.post(
            "/api/v1/care-events",
            data=json.dumps({"student_id": str(maya.student_id), "event_type": "water", "payload": {"amount_ml": 250}}),
            content_type="application/json",
            **headers,
        )
        assert r2.status_code == 201

        # 2. Batch nap_start across Maya and Noah
        r_batch = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_ids": [str(maya.student_id), str(noah.student_id)],
                "event_type": "nap_start",
                "payload": {"note": "Cot rest"},
            }),
            content_type="application/json",
            **headers,
        )
        assert r_batch.status_code == 201
        assert r_batch.json()["data"]["count"] == 2

        # 3. Dynamic summary computation
        r_list = client.get("/api/v1/care-events", **headers)
        assert r_list.status_code == 200
        summary = r_list.json()["data"]["summary"]
        assert summary["asleep_count"] == 2
        assert summary["hydration_pct"] == 25  # 250 / (2 * 500) = 25%
        assert summary["per_student"][str(maya.student_id)]["mood"] == "Playful"
        assert summary["per_student"][str(maya.student_id)]["hydration_ml"] == 250

        # 4. Topical consent gate: Noah has topical_consent=False -> 422
        r_no_topical = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(noah.student_id),
                "event_type": "diaper",
                "payload": {"type": "Wet", "barrier_cream": True},
            }),
            content_type="application/json",
            **headers,
        )
        assert r_no_topical.status_code == 422

        # Maya has topical_consent=True -> 201
        r_ok_topical = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "event_type": "diaper",
                "payload": {"type": "BM", "barrier_cream": True, "note": "Clean & dry"},
            }),
            content_type="application/json",
            **headers,
        )
        assert r_ok_topical.status_code == 201

        # 5. Cross-room isolation -> 403
        r_cross = client.post(
            "/api/v1/care-events",
            data=json.dumps({"student_id": str(g4.student_id), "event_type": "mood", "payload": {"mood": "Sunny"}}),
            content_type="application/json",
            **headers,
        )
        assert r_cross.status_code == 403

    def test_us_cg_07_parent_feed_notes_undo_and_isolation(self, setup_room):
        client = Client()
        cg_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['cg_token']}"}
        p_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['maya_parent_token']}"}
        other_p_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['other_parent_token']}"}
        maya = setup_room["maya"]

        # Caregiver logs nap event + sends one-tap message
        r_ev = client.post(
            "/api/v1/care-events",
            data=json.dumps({"student_id": str(maya.student_id), "event_type": "nap_start", "payload": {"note": "Fast asleep"}}),
            content_type="application/json",
            **cg_headers,
        )
        assert r_ev.status_code == 201
        ev_id = r_ev.json()["data"]["events"][0]["event_id"]

        r_msg = client.post(
            "/api/v1/messages",
            data=json.dumps({
                "channel": "In_App",
                "subject": "Room 1A Caregiver Note",
                "body": "Great Lunch 🍓 — Maya finished 100%!",
                "recipient_id": str(maya.student_id),
                "recipient_role": "Parent",
                "payload": {"student_id": str(maya.student_id)},
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_msg.status_code == 201

        # Parent sees both in chronological feed
        r_feed = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **p_headers)
        assert r_feed.status_code == 200
        feed = r_feed.json()["data"]["feed"]
        assert len(feed) == 2
        assert feed[0]["kind"] == "care_event"
        assert feed[1]["kind"] == "note"

        # Unlinked parent gets 403
        r_forbidden = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **other_p_headers)
        assert r_forbidden.status_code == 403

        # Caregiver undoes nap event within 5 mins
        r_undo = client.delete(f"/api/v1/care-events/{ev_id}", **cg_headers)
        assert r_undo.status_code == 200
        assert r_undo.json()["data"]["is_hidden"] is True

        r_feed_after = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **p_headers)
        assert r_feed_after.status_code == 200
        assert len(r_feed_after.json()["data"]["feed"]) == 1

        # Expired undo (> 5 mins) returns 422 for Caregiver
        old_ev = CareEvent.objects.create(
            tenant=maya.tenant,
            student=maya,
            event_type="mood",
            payload={"mood": "Sunny"},
            logged_by=uuid.uuid4(),
        )
        CareEvent.objects.filter(event_id=old_ev.event_id).update(
            created_at=timezone.now() - timedelta(minutes=6)
        )
        r_expired = client.delete(f"/api/v1/care-events/{old_ev.event_id}", **cg_headers)
        assert r_expired.status_code == 422

    def test_us_cg_08_media_exif_strip_consent_gate_and_delete(self, setup_room):
        client = Client()
        cg_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['cg_token']}"}
        p_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['maya_parent_token']}"}
        maya = setup_room["maya"]
        noah = setup_room["noah"]

        raw_jpg = _build_jpeg_with_exif()
        assert b"GPS_LAT_43.6532" in raw_jpg

        # 1. Negative: Noah has photo_consent=False (alone & group) -> 422
        upload_noah = SimpleUploadedFile("noah.jpg", raw_jpg, content_type="image/jpeg")
        r_block_single = client.post(
            "/api/v1/care-media",
            data={"file": upload_noah, "student_ids": str(noah.student_id), "caption": "Blocks"},
            **cg_headers,
        )
        assert r_block_single.status_code == 422

        upload_group = SimpleUploadedFile("group.jpg", raw_jpg, content_type="image/jpeg")
        r_block_group = client.post(
            "/api/v1/care-media",
            data={
                "file": upload_group,
                "student_ids": f"{maya.student_id},{noah.student_id}",
                "caption": "Group",
            },
            **cg_headers,
        )
        assert r_block_group.status_code == 422

        # 2. Positive: Maya has photo_consent=True -> 201 + EXIF stripped
        upload_maya = SimpleUploadedFile("maya.jpg", raw_jpg, content_type="image/jpeg")
        r_ok = client.post(
            "/api/v1/care-media",
            data={"file": upload_maya, "student_ids": str(maya.student_id), "caption": "Painting time"},
            **cg_headers,
        )
        assert r_ok.status_code == 201
        media_data = r_ok.json()["data"]
        media_id = media_data["media_id"]
        signed_url = media_data["signed_url"]

        # Fetch signed URL -> 200 and zero EXIF GPS bytes
        r_file = client.get(signed_url)
        assert r_file.status_code == 200
        served_bytes = b"".join(r_file.streaming_content)
        assert b"GPS_LAT_43.6532" not in served_bytes
        assert b"Exif" not in served_bytes
        assert served_bytes.startswith(b"\xff\xd8")

        # Appears in Maya's parent feed
        r_feed = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **p_headers)
        assert r_feed.status_code == 200
        assert any(item["kind"] == "media" and item["item_id"] == media_id for item in r_feed.json()["data"]["feed"])

        # 3. Delete media -> removed from feed & signed_url returns 404
        r_del = client.delete(f"/api/v1/care-media/{media_id}", **cg_headers)
        assert r_del.status_code == 200

        r_file_after = client.get(signed_url)
        assert r_file_after.status_code == 404

        r_feed_after = client.get(f"/api/v1/parent/children/{maya.student_id}/feed", **p_headers)
        assert not any(item["item_id"] == media_id for item in r_feed_after.json()["data"]["feed"])

    def test_def_033_post_checkout_care_lock_and_supervisor_override(self, setup_room, tenant_a):
        client = Client()
        cg_headers = {"HTTP_AUTHORIZATION": f"Bearer {setup_room['cg_token']}"}
        admin_token = _make_token(tenant_a.tenant_id, "Admin")
        admin_headers = {"HTTP_AUTHORIZATION": f"Bearer {admin_token}"}
        maya = setup_room["maya"]

        # Configure hashed supervisor override PIN on tenant
        cfg = dict(tenant_a.config or {})
        cfg["supervisor_override_pin_hash"] = make_password("2468")
        tenant_a.config = cfg
        tenant_a.save(update_fields=["config", "updated_at"])

        # Mark Maya Lin as checked out today
        StudentAttendance.objects.filter(
            tenant=tenant_a,
            student=maya,
            date=timezone.localdate(),
            is_deleted=False,
        ).update(check_in_at=timezone.now(), check_out_at=timezone.now())

        # 1. Caregiver without supervisor_override is blocked with HTTP 422 STUDENT_CHECKED_OUT
        r_blocked = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "event_type": "water",
                "payload": {"amount_ml": 120},
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_blocked.status_code == 422
        assert r_blocked.json()["errors"][0]["rule"] == "STUDENT_CHECKED_OUT"

        # 2. Verify PIN endpoint rejects wrong PIN and approves valid PIN
        r_bad_pin = client.post(
            "/api/v1/care-events/verify-supervisor-pin",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "supervisor_pin": "0000",
                "override_reason": "Testing invalid pin",
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_bad_pin.status_code == 422

        r_good_pin = client.post(
            "/api/v1/care-events/verify-supervisor-pin",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "supervisor_pin": "2468",
                "override_reason": "Late bottle entry",
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_good_pin.status_code == 200
        assert r_good_pin.json()["data"]["verified"] is True

        # 3. Caregiver submitting with wrong PIN + supervisor_override=True still returns 422
        r_wrong_override = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "event_type": "water",
                "payload": {"amount_ml": 120},
                "supervisor_override": True,
                "supervisor_pin": "9999",
                "override_reason": "Wrong PIN",
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_wrong_override.status_code == 422
        assert r_wrong_override.json()["errors"][0]["rule"] == "SUPERVISOR_OVERRIDE_REQUIRED"

        # 4. Caregiver with valid supervisor_pin + reason succeeds (HTTP 201) & writes immutable AuditLog
        r_pin_override = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "event_type": "water",
                "payload": {"amount_ml": 120},
                "supervisor_override": True,
                "supervisor_pin": "2468",
                "override_reason": "Recorded missed afternoon water bottle",
            }),
            content_type="application/json",
            **cg_headers,
        )
        assert r_pin_override.status_code == 201
        assert AuditLog.objects.filter(
            tenant=tenant_a,
            action="OVERRIDE_POST_CHECKOUT_CARE_EVENT",
            entity="CareEvent",
            entity_id=str(maya.student_id),
        ).exists()

        # 5. Admin token with supervisor_override=True (no PIN needed) succeeds (HTTP 201) & logs AuditLog
        r_admin_override = client.post(
            "/api/v1/care-events",
            data=json.dumps({
                "student_id": str(maya.student_id),
                "event_type": "meal",
                "payload": {"meal_type": "Afternoon Snack", "portion": "All (100%)"},
                "supervisor_override": True,
                "override_reason": "Principal correction after dismissal",
            }),
            content_type="application/json",
            **admin_headers,
        )
        assert r_admin_override.status_code == 201
        assert AuditLog.objects.filter(
            tenant=tenant_a,
            action="OVERRIDE_POST_CHECKOUT_CARE_EVENT",
            entity="CareEvent",
            entity_id=str(maya.student_id),
        ).count() >= 2
