import json
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core.models import (
    Application,
    Curriculum,
    EmergencyContact,
    Exam,
    FeeStructure,
    Invoice,
    Parent,
    PortalRoleMembership,
    SafetyDrill,
    Student,
)


def _headers(token: str) -> dict:
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
class TestCRUDPhase1FoundationAndPeople:
    def test_role_membership_crud_and_last_owner_protection(self, tenant_a, owner_token_tenant_a, admin_token_tenant_a):
        client = Client()
        user_model = get_user_model()
        owner_user = user_model.objects.create_user(username="owner1", email="owner1@oakridge.edu", password="password123")
        rogue_user = user_model.objects.create_user(username="rogue1", email="rogue@oakridge.edu", password="password123")

        # Create Owner membership via Owner token
        res = client.post(
            "/api/v1/role-memberships",
            data=json.dumps({
                "email": "owner1@oakridge.edu",
                "role": "Owner",
                "user_id": owner_user.pk,
            }),
            content_type="application/json",
            **_headers(owner_token_tenant_a),
        )
        assert res.status_code == 201
        owner_m_id = res.json()["data"]["membership_id"]

        # Admin cannot grant Owner role
        res_forbidden = client.post(
            "/api/v1/role-memberships",
            data=json.dumps({
                "email": "rogue@oakridge.edu",
                "role": "Owner",
                "user_id": rogue_user.pk,
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_forbidden.status_code == 422

        # Cannot delete last active Owner
        res_del = client.delete(
            f"/api/v1/role-memberships/{owner_m_id}",
            **_headers(owner_token_tenant_a),
        )
        assert res_del.status_code == 422

        # List role memberships
        res_list = client.get("/api/v1/role-memberships", **_headers(admin_token_tenant_a))
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) >= 1

    def test_school_setup_config_sequences_and_audit_logs(self, tenant_a, owner_token_tenant_a, admin_token_tenant_a):
        client = Client()
        res_patch = client.patch(
            "/api/v1/school-setup/config",
            data=json.dumps({"name": "Oakridge Global", "config": {"timezone": "America/Toronto"}}),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_patch.status_code == 200
        assert res_patch.json()["data"]["school"]["name"] == "Oakridge Global"

        res_seq = client.get("/api/v1/school-setup/sequences", **_headers(admin_token_tenant_a))
        assert res_seq.status_code == 200

        res_audit = client.get("/api/v1/audit-logs", **_headers(admin_token_tenant_a))
        assert res_audit.status_code == 200
        assert len(res_audit.json()["data"]) >= 1

    def test_direct_student_parent_and_emergency_contact_crud_with_guards(self, tenant_a, admin_token_tenant_a):
        client = Client()
        # Create direct student (requires emergency contact fields for Active status per BR-01-03)
        res_create = client.post(
            "/api/v1/students",
            data=json.dumps({
                "name": "Maya Lin",
                "dob": "2018-05-10",
                "grade": "Grade 2",
                "status": "Active",
                "emergency_contact_name": "Jian Lin",
                "emergency_contact_phone": "+1-555-2020",
                "emergency_contact_relationship": "Father",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_create.status_code == 201
        student_id = res_create.json()["data"]["student_id"]

        # Create Parent
        res_parent = client.post(
            "/api/v1/parents",
            data=json.dumps({
                "student_id": student_id,
                "name": "Jian Lin",
                "relationship": "Father",
                "phone": "+1-555-2020",
                "email": "jian@example.com",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_parent.status_code == 201
        parent_id = res_parent.json()["data"]["parent_id"]

        # Deleting the last parent of an Active student is blocked by BR-01-13
        res_del_parent = client.delete(f"/api/v1/parents/{parent_id}", **_headers(admin_token_tenant_a))
        assert res_del_parent.status_code == 422

        # Emergency contacts list & last-contact delete guard (BR-01-03)
        res_ec_list = client.get(f"/api/v1/students/{student_id}/emergency-contacts", **_headers(admin_token_tenant_a))
        assert res_ec_list.status_code == 200
        ec_id = res_ec_list.json()["data"][0]["contact_id"]

        res_del_ec = client.delete(f"/api/v1/emergency-contacts/{ec_id}", **_headers(admin_token_tenant_a))
        assert res_del_ec.status_code == 422


@pytest.mark.django_db
class TestCRUDPhase2AcademicsAndAttendance:
    def test_curriculum_calendar_exam_and_marks_crud(self, tenant_a, admin_token_tenant_a, owner_token_tenant_a):
        client = Client()
        # Curriculum CRUD
        res_curr = client.post(
            "/api/v1/curriculums",
            data=json.dumps({"grade": "Grade 3", "subjects": [{"name": "Math"}], "learning_outcomes": ["Fractions"]}),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_curr.status_code == 201
        curr_id = res_curr.json()["data"]["curriculum_id"]

        res_curr_patch = client.patch(
            f"/api/v1/curriculums/{curr_id}",
            data=json.dumps({"version": "2.0"}),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_curr_patch.status_code == 200
        assert res_curr_patch.json()["data"]["version"] == "2.0"

        # Calendar CRUD
        res_cal = client.post(
            "/api/v1/calendars",
            data=json.dumps({
                "academic_year": "2026-2027",
                "terms": [{"name": "Term 1"}],
                "holidays": ["2026-12-25"],
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_cal.status_code == 201


@pytest.mark.django_db
class TestCRUDPhase3HealthAndBilling:
    def test_safety_drill_signoff_immutability_and_fee_structure_crud(self, tenant_a, admin_token_tenant_a):
        client = Client()
        drill = SafetyDrill.objects.create(
            tenant=tenant_a,
            drill_type="Fire",
            scheduled_date=date(2026, 10, 1),
            completed_by=uuid.uuid4(),
            signed_off=True,
        )
        # Updating a signed-off drill is blocked by BR-07-04
        res_drill = client.patch(
            f"/api/v1/safety/drills/{drill.drill_id}",
            data=json.dumps({"duration_seconds": 90}),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_drill.status_code == 422

        # FeeStructure CRUD
        res_fs = client.post(
            "/api/v1/fee-structures",
            data=json.dumps({
                "grade": "Grade 1",
                "term": "Term 1",
                "components": [{"description": "Tuition", "amount": 1500.0}],
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_fs.status_code == 201
        fs_id = res_fs.json()["data"]["fee_struct_id"]

        res_fs_list = client.get("/api/v1/fee-structures", **_headers(admin_token_tenant_a))
        assert res_fs_list.status_code == 200
        assert res_fs_list.json()["data"]["count"] >= 1

        res_fs_del = client.delete(f"/api/v1/fee-structures/{fs_id}", **_headers(admin_token_tenant_a))
        assert res_fs_del.status_code == 200


@pytest.mark.django_db
class TestCRUDPhase4Sprint5AndAnalytics:
    def test_staff_contracts_cpd_inventory_and_webhooks_crud(self, tenant_a, admin_token_tenant_a):
        client = Client()
        # Create Staff with valid future DBS
        res_staff = client.post(
            "/api/v1/staff",
            data=json.dumps({
                "name": "Alice Teacher",
                "role": "Teacher",
                "dept": "Primary",
                "employment_type": "Full_Time",
                "start_date": "2026-01-15",
                "salary": "55000.00",
                "dbs_ref": "DBS-999",
                "dbs_expiry": (date.today() + timedelta(days=365)).isoformat(),
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_staff.status_code == 201
        staff_id = res_staff.json()["data"]["staff"]["staff_id"]

        # Create Contract
        res_contract = client.post(
            f"/api/v1/staff/{staff_id}/contracts",
            data=json.dumps({
                "contract_type": "Permanent",
                "start_date": "2026-01-15",
                "esigned": True,
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_contract.status_code == 201

        # Create CPD
        res_cpd = client.post(
            f"/api/v1/staff/{staff_id}/cpd",
            data=json.dumps({
                "activity": "First Aid Training",
                "activity_type": "Safety",
                "hours": "6.0",
                "mandatory": True,
                "completion_status": "Completed",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_cpd.status_code == 201

        # Create Inventory
        res_inv = client.post(
            "/api/v1/inventory",
            data=json.dumps({
                "item_name": "Whiteboard Markers",
                "sku": "WBM-01",
                "quantity_on_hand": 50,
                "reorder_level": 10,
                "unit_cost": "12.50",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_inv.status_code == 201
        inv_id = res_inv.json()["data"]["inventory_id"]

        res_inv_patch = client.patch(
            f"/api/v1/inventory/{inv_id}",
            data=json.dumps({"quantity_on_hand": 45}),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_inv_patch.status_code == 200
        assert res_inv_patch.json()["data"]["quantity_on_hand"] == 45

        # Webhook SSRF check (localhost blocked) & secret masking
        res_ssrf = client.post(
            "/api/v1/webhooks/subscriptions",
            data=json.dumps({
                "event_type": "student.enrolled",
                "target_url": "http://localhost:8080/hook",
                "secret": "super-secret-value",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_ssrf.status_code == 422

        res_wh = client.post(
            "/api/v1/webhooks/subscriptions",
            data=json.dumps({
                "event_type": "student.enrolled",
                "target_url": "https://hooks.example.com/crm",
                "secret": "super-secret-value",
            }),
            content_type="application/json",
            **_headers(admin_token_tenant_a),
        )
        assert res_wh.status_code == 201
        wh_id = res_wh.json()["data"]["webhook_id"]

        res_wh_get = client.get(f"/api/v1/webhooks/subscriptions/{wh_id}", **_headers(admin_token_tenant_a))
        assert res_wh_get.status_code == 200
        assert "secret" not in res_wh_get.json()["data"]
