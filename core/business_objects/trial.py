"""Domain business logic for self-service daycare free trial onboarding, configurable duration, and lifecycle enforcement."""

import hashlib
import math
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction

from core.models import AuditLog, PortalRoleMembership, Tenant


class TrialSignupError(Exception):
    def __init__(self, code: str, message: str, status: int):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


class TrialExpiredError(Exception):
    def __init__(
        self,
        message: str = "Your free trial has expired. Please upgrade or extend your subscription to continue editing.",
        *,
        trial_ends_at: Optional[str] = None,
    ):
        self.code = "TRIAL_EXPIRED"
        self.message = message
        self.trial_ends_at = trial_ends_at
        self.status = 402
        super().__init__(message)


class TrialSignupBO:
    CODE_ALPHABET = string.ascii_uppercase + string.digits
    DEFAULT_FALLBACK_DAYS = 14

    @classmethod
    def get_default_trial_days(cls) -> int:
        raw = getattr(settings, "DEFAULT_FREE_TRIAL_DAYS", cls.DEFAULT_FALLBACK_DAYS)
        try:
            days = int(raw)
        except (TypeError, ValueError):
            days = cls.DEFAULT_FALLBACK_DAYS
        return max(1, min(days, 365))

    @staticmethod
    def _parse_iso_utc(raw: Any) -> Optional[datetime]:
        if not raw or not isinstance(raw, str):
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @classmethod
    def evaluate_trial_status(
        cls,
        tenant: Tenant,
        *,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        cfg = tenant.config if isinstance(tenant.config, dict) else {}
        account_type = str(cfg.get("account_type") or "standard")
        is_trial = account_type == "free_trial"
        duration_raw = cfg.get("trial_duration_days")
        try:
            duration_days = int(duration_raw) if duration_raw is not None else cls.get_default_trial_days()
        except (TypeError, ValueError):
            duration_days = cls.get_default_trial_days()

        started_dt = cls._parse_iso_utc(cfg.get("trial_started_at"))
        ends_dt = cls._parse_iso_utc(cfg.get("trial_ends_at"))
        if is_trial and started_dt is not None and ends_dt is None:
            ends_dt = started_dt + timedelta(days=duration_days)

        current_utc = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        is_expired = False
        days_remaining: Optional[int] = None
        if is_trial and ends_dt is not None:
            seconds_left = (ends_dt - current_utc).total_seconds()
            is_expired = seconds_left <= 0
            days_remaining = 0 if is_expired else max(1, math.ceil(seconds_left / 86400))

        trial_status = (
            "converted"
            if not is_trial
            else ("expired" if is_expired else str(cfg.get("trial_status") or "active"))
        )
        return {
            "account_type": account_type,
            "is_trial": is_trial,
            "is_expired": is_expired,
            "trial_status": trial_status,
            "trial_duration_days": duration_days if is_trial else None,
            "trial_started_at": started_dt.isoformat() if started_dt else None,
            "trial_ends_at": ends_dt.isoformat() if ends_dt else None,
            "days_remaining": days_remaining,
        }

    @classmethod
    def update_trial_window(
        cls,
        tenant: Tenant,
        *,
        extend_days: Optional[int] = None,
        convert_to_paid: bool = False,
        reason: str = "",
        actor_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        with transaction.atomic():
            locked = Tenant.objects.select_for_update().get(tenant_id=tenant.tenant_id)
            old_cfg = dict(locked.config) if isinstance(locked.config, dict) else {}
            cfg = dict(old_cfg)
            now_utc = datetime.now(timezone.utc)

            if convert_to_paid:
                cfg["account_type"] = "paid"
                cfg["trial_status"] = "converted"
                cfg["converted_at"] = now_utc.isoformat()
            elif extend_days is not None:
                if extend_days < 1 or extend_days > 365:
                    raise TrialSignupError(
                        "INVALID_TRIAL_EXTENSION",
                        "Trial extension must be between 1 and 365 days.",
                        422,
                    )
                existing_end = cls._parse_iso_utc(cfg.get("trial_ends_at"))
                base_dt = max(existing_end, now_utc) if existing_end else now_utc
                new_end = base_dt + timedelta(days=extend_days)
                started_dt = cls._parse_iso_utc(cfg.get("trial_started_at")) or now_utc
                cfg["account_type"] = "free_trial"
                cfg["trial_started_at"] = started_dt.isoformat()
                cfg["trial_ends_at"] = new_end.isoformat()
                cfg["trial_duration_days"] = max(1, math.ceil((new_end - started_dt).total_seconds() / 86400))
                cfg["trial_status"] = "active"
            else:
                raise TrialSignupError(
                    "TRIAL_UPDATE_REQUIRED",
                    "Provide extend_days or set convert_to_paid=true.",
                    422,
                )

            locked.config = cfg
            locked.save(update_fields=["config", "updated_at"])

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT set_config('app.current_tenant_id', %s, FALSE)",
                    [str(locked.tenant_id)],
                )
            AuditLog.objects.create(
                tenant=locked,
                actor_id=actor_id,
                action="UPDATE",
                entity="Tenant",
                entity_id=str(locked.tenant_id),
                old_values={"trial": old_cfg.get("trial_status"), "trial_ends_at": old_cfg.get("trial_ends_at"), "account_type": old_cfg.get("account_type")},
                new_values={
                    "account_type": cfg.get("account_type"),
                    "trial_status": cfg.get("trial_status"),
                    "trial_duration_days": cfg.get("trial_duration_days"),
                    "trial_ends_at": cfg.get("trial_ends_at"),
                    "reason": reason,
                },
            )
            tenant.config = locked.config
            return cls.evaluate_trial_status(locked, now=now_utc)

    @classmethod
    def _create_tenant(cls, daycare_name: str, *, trial_days: Optional[int] = None) -> Tenant:
        days = trial_days if trial_days is not None else cls.get_default_trial_days()
        started_at = datetime.now(timezone.utc)
        ends_at = started_at + timedelta(days=days)
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
                            "trial_duration_days": days,
                            "trial_started_at": started_at.isoformat(),
                            "trial_ends_at": ends_at.isoformat(),
                            "trial_status": "active",
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