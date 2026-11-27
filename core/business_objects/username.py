"""Domain business logic for generating globally unique system usernames."""

import re
import secrets
import unicodedata

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from core.models import UsernameNumberReservation


class UsernameGenerationError(Exception):
    def __init__(self, code: str, message: str, status: int, field: str = "username"):
        self.code = code
        self.message = message
        self.status = status
        self.field = field
        super().__init__(message)


class UsernameGeneratorBO:
    """Generates usernames as `<fi><li><8digits>_<school_code>` with global 8-digit reservation."""

    MAX_ATTEMPTS = 20
    _ASCII_LETTER_RE = re.compile(r"[A-Za-z]")

    @classmethod
    def extract_initial(cls, name: str, field: str) -> str:
        cleaned = (name or "").strip()
        normalized = unicodedata.normalize("NFKD", cleaned)
        ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
        match = cls._ASCII_LETTER_RE.search(ascii_only)
        if not match:
            label = field.replace("_", " ").title()
            raise UsernameGenerationError(
                "INVALID_NAME",
                f"{label} must contain at least one letter.",
                400,
                field=field,
            )
        return match.group(0).lower()

    @staticmethod
    def split_full_name(full_name: str) -> tuple[str, str]:
        parts = (full_name or "").strip().split()
        if len(parts) < 2:
            raise UsernameGenerationError(
                "LAST_NAME_REQUIRED",
                "First name and last name are required.",
                400,
                field="last_name",
            )
        return parts[0], " ".join(parts[1:])

    @staticmethod
    def generate_8_digit_number() -> str:
        return str(secrets.randbelow(90_000_000) + 10_000_000)

    @classmethod
    def create_user_with_generated_username(
        cls,
        *,
        first_name: str,
        last_name: str,
        email: str,
        password: str,
        school_code: str,
        is_active: bool,
    ):
        fi = cls.extract_initial(first_name, "first_name")
        li = cls.extract_initial(last_name, "last_name")
        trimmed_first = first_name.strip()[:150]
        trimmed_last = last_name.strip()[:150]
        user_model = get_user_model()

        for _ in range(cls.MAX_ATTEMPTS):
            number_code = cls.generate_8_digit_number()
            username = f"{fi}{li}{number_code}_{school_code}"
            if (
                UsernameNumberReservation.objects.filter(number_code=number_code).exists()
                or user_model.objects.filter(username__iexact=username).exists()
            ):
                continue

            try:
                with transaction.atomic():
                    user = user_model.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        first_name=trimmed_first,
                        last_name=trimmed_last,
                        is_active=is_active,
                    )
                    UsernameNumberReservation.objects.create(
                        number_code=number_code,
                        user=user,
                    )
                    return user
            except IntegrityError:
                continue

        raise UsernameGenerationError(
            "USERNAME_UNAVAILABLE",
            "Could not generate a unique username. Please try again.",
            503,
        )
