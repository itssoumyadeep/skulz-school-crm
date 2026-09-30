import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client
from datetime import date
from jose import jwt
from django.conf import settings

from core.models import PortalRoleMembership, Student


@pytest.mark.django_db
class TestLoginAPI:
    def setup_method(self):
        self.client = Client()

    def create_user(self, tenant, *, with_membership=True):
        user = get_user_model().objects.create_user(
            username=f"teacher1_{tenant.subdomain}",
            password="stored-password",
            first_name="Taylor",
            last_name="Teacher",
        )
        if with_membership:
            group = Group.objects.create(name="Teacher")
            PortalRoleMembership.objects.create(
                user=user,
                tenant=tenant,
                group=group,
                role="Teacher",
            )
        return user

    def login(self, tenant, password="stored-password"):
        return self.client.post(
            "/api/v1/auth/login",
            data={
                "username": f"teacher1_{tenant.subdomain}",
                "password": password,
            },
            content_type="application/json",
        )

    def signup(self, tenant, email="new.parent@example.com"):
        return self.client.post(
            "/api/v1/auth/signup",
            data={
                "full_name": "New Parent",
                "email": email,
                "password": "strong-parent-password-2026",
                "tenant": tenant.subdomain,
                "role": "Owner",
            },
            content_type="application/json",
        )

    def signup(self, tenant, email="new.parent@example.com"):
        return self.client.post(
            "/api/v1/auth/signup",
            data={
                "full_name": "New Parent",
                "email": email,
                "password": "strong-parent-password-2026",
                "tenant": tenant.subdomain,
            },
            content_type="application/json",
        )

    def test_login_uses_django_password_and_returns_signed_role_token(self, tenant_a):
        self.create_user(tenant_a)

        response = self.login(tenant_a)

        assert response.status_code == 200
        data = response.json()["data"]
        claims = jwt.decode(
            data["access_token"],
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"],
        )
        assert data["role"] == "teacher"
        assert data["user"]["username"] == f"teacher1_{tenant_a.subdomain}"
        assert claims["role"] == "teacher"
        assert claims["tenant_id"] == str(tenant_a.tenant_id)

    def test_login_username_suffix_resolves_the_tenant(self, tenant_a):
        self.create_user(tenant_a)

        response = self.login(tenant_a)

        assert response.status_code == 200
        assert response.json()["data"]["tenant_id"] == str(tenant_a.tenant_id)
        assert response.json()["data"]["tenant_code"] == tenant_a.subdomain

    def test_login_rejects_username_when_suffix_tenant_has_no_membership(
        self, tenant_a, tenant_b
    ):
        user = self.create_user(tenant_a)
        user.username = f"teacher1_{tenant_b.subdomain}"
        user.save(update_fields=["username"])

        response = self.login(tenant_b)

        assert response.status_code == 403
        assert response.json()["errors"][0]["code"] == "ROLE_MEMBERSHIP_REQUIRED"

    def test_login_rejects_username_without_school_suffix(self, tenant_a):
        self.create_user(tenant_a)
        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "teacher1", "password": "stored-password"},
            content_type="application/json",
        )

        assert response.status_code == 400
        assert response.json()["errors"][0]["code"] == "SCHOOL_CODE_REQUIRED"

    def test_login_rejects_wrong_django_password(self, tenant_a):
        self.create_user(tenant_a)

        response = self.login(tenant_a, password="wrong-password")

        assert response.status_code == 401
        assert response.json()["errors"][0]["code"] == "AUTH_INVALID"

    def test_login_requires_active_tenant_role_membership(self, tenant_a):
        self.create_user(tenant_a, with_membership=False)

        response = self.login(tenant_a)

        assert response.status_code == 403
        assert response.json()["errors"][0]["code"] == "ROLE_MEMBERSHIP_REQUIRED"

    def test_login_accepts_matching_django_group_when_membership_record_is_missing(self, tenant_a):
        user = self.create_user(tenant_a, with_membership=False)
        group = Group.objects.create(name="Teacher")
        user.groups.add(group)

        response = self.login(tenant_a)

        assert response.status_code == 200
        assert response.json()["data"]["role"] == "teacher"

    def test_login_syncs_tenant_membership_to_single_assigned_role_group(self, tenant_a):
        user = self.create_user(tenant_a, with_membership=False)
        parent_group = Group.objects.create(name="Parent")
        teacher_group = Group.objects.create(name="Teacher")
        PortalRoleMembership.objects.create(
            user=user,
            tenant=tenant_a,
            group=parent_group,
            role="Parent",
        )
        user.groups.add(teacher_group)

        response = self.login(tenant_a)

        assert response.status_code == 200
        assert response.json()["data"]["role"] == "teacher"
        membership = PortalRoleMembership.objects.get(user=user, tenant=tenant_a)
        assert membership.role == "Teacher"
        assert membership.group == teacher_group

    def test_signup_creates_parent_user_with_hashed_password_and_tenant_membership(
        self, tenant_a
    ):
        response = self.signup(tenant_a)

        assert response.status_code == 201
        data = response.json()["data"]
        user = get_user_model().objects.get(username="new.parent@example.com_oakridge")
        membership = PortalRoleMembership.objects.get(user=user, tenant=tenant_a)
        assert user.check_password("strong-parent-password-2026")
        assert not user.is_active
        assert data["role"] == "parent"
        assert data["status"] == "pending_activation"
        assert membership.role == "Parent"
        assert membership.group.name == "Parent"

    def test_signup_rejects_duplicate_email(self, tenant_a):
        self.signup(tenant_a)

        response = self.signup(tenant_a)

        assert response.status_code == 409
        assert response.json()["errors"][0]["code"] == "ACCOUNT_EXISTS"

    def test_signup_rejects_unknown_school_code(self, tenant_a):
        response = self.client.post(
            "/api/v1/auth/signup",
            data={
                "full_name": "New Parent",
                "email": "new.parent@example.com",
                "password": "strong-parent-password-2026",
                "tenant": "not-a-school",
            },
            content_type="application/json",
        )

        assert response.status_code == 400
        assert response.json()["errors"][0]["code"] == "SCHOOL_NOT_FOUND"

    def test_signup_creates_django_user_and_parent_membership(self, tenant_a):
        response = self.signup(tenant_a)

        assert response.status_code == 201
        user = get_user_model().objects.get(username="new.parent@example.com_oakridge")
        membership = PortalRoleMembership.objects.get(user=user, tenant=tenant_a)
        assert user.check_password("strong-parent-password-2026")
        assert membership.role == "Parent"
        assert membership.group.name == "Parent"

    def test_signup_rejects_duplicate_email(self, tenant_a):
        self.signup(tenant_a)

        response = self.signup(tenant_a)

        assert response.status_code == 409
        assert response.json()["errors"][0]["code"] == "ACCOUNT_EXISTS"

    def test_new_parent_cannot_list_unlinked_students(self, tenant_a):
        self.create_user(tenant_a, with_membership=False)
        user = get_user_model().objects.get(username=f"teacher1_{tenant_a.subdomain}")
        user.email = "parent@example.com"
        user.save(update_fields=["email"])
        group = Group.objects.create(name="Parent")
        PortalRoleMembership.objects.create(
            user=user,
            tenant=tenant_a,
            group=group,
            role="Parent",
        )
        Student.objects.create(
            tenant=tenant_a,
            student_number="OAK-2026-0001",
            name="Unlinked Student",
            dob=date(2019, 1, 1),
            grade="Grade 1",
        )
        token = jwt.encode(
            {
                "sub": "parent-subject",
                "tenant_id": str(tenant_a.tenant_id),
                "role": "Parent",
                "user_id": "parent-user-id",
                "user_name": "New Parent",
                "email": "parent@example.com",
            },
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

        response = self.client.get(
            "/api/v1/students",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        assert response.status_code == 200
        assert response.json()["data"] == []
