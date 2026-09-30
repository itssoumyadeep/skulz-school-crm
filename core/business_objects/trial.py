import hashlib
import secrets
import string
from datetime import datetime, timezone

from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction

from core.models import PortalRoleMembership, Tenant


class TrialSignupError(Exception):
    def __init__(self, code: str, message: str, status: int):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


class TrialSignupBO:
    CODE_ALPHABET = string.ascii_uppercase + string.digits

    @classmethod
    def _create_tenant(cls, daycare_name: str) -> Tenant:
        for _ in range(10):
            school_code = "SC" + "".join(
                secrets.choice(cls.CODE_ALPHABET) for _ in range(7)
            )
            try:
                with transaction.atomic():
                    return Tenant.objects.create(
                        name=daycare_name,
                        subdomain=school_code,
                        type="Daycare",
                        subscription_tier="Basic",
                        region="Unspecified",
                        config={
                            "account_type": "free_trial",
                            "trial_started_at": datetime.now(timezone.utc).isoformat(),
                        },
                    )
            except IntegrityError:
                continue

        raise TrialSignupError(
            "SCHOOL_CODE_UNAVAILABLE",
            "Could not generate a unique school code. Please try again.",
            503,
        )

    @staticmethod
    def _username(email: str, school_code: str) -> str:
        suffix = f"_{school_code}"
        if len(email) + len(suffix) <= 150:
            return f"{email}{suffix}"

        digest = hashlib.sha256(email.encode()).hexdigest()[:8]
        prefix_length = 150 - len(suffix) - len(digest) - 1
        return f"{email[:prefix_length]}_{digest}{suffix}"

    @classmethod
    def create_trial(cls, *, daycare_name: str, email: str, role: str, password: str):
        normalized_email = email.strip().lower()
        user_model = get_user_model()
        candidate = user_model(email=normalized_email, username=normalized_email)
        try:
            password_validation.validate_password(password, user=candidate)
        except ValidationError as exc:
            raise TrialSignupError("WEAK_PASSWORD", " ".join(exc.messages), 400) from exc

        try:
            with transaction.atomic():
                if user_model.objects.filter(email__iexact=normalized_email).exists():
                    raise TrialSignupError(
                        "ACCOUNT_EXISTS",
                        "An account with this email already exists.",
                        409,
                    )

                tenant = cls._create_tenant(daycare_name.strip())
                username = cls._username(normalized_email, tenant.subdomain)
                if user_model.objects.filter(username__iexact=username).exists():
                    raise TrialSignupError(
                        "ACCOUNT_EXISTS",
                        "An account with this email already exists.",
                        409,
                    )

                user = user_model.objects.create_user(
                    username=username,
                    email=normalized_email,
                    password=password,
                    is_active=True,
                )
                group, _ = Group.objects.get_or_create(name=role)
                user.groups.add(group)
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT set_config('app.current_tenant_id', %s, FALSE)",
                        [str(tenant.tenant_id)],
                    )
                membership = PortalRoleMembership.objects.create(
                    user=user,
                    tenant=tenant,
                    group=group,
                    role=role,
                    is_active=True,
                )
        except IntegrityError as exc:
            raise TrialSignupError(
                "ACCOUNT_EXISTS",
                "An account with this email already exists.",
                409,
            ) from exc

        return tenant, user, membership