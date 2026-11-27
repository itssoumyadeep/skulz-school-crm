import re
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from core.business_objects.username import UsernameGenerationError, UsernameGeneratorBO
from core.models import UsernameNumberReservation


@pytest.mark.django_db
class TestUsernameGeneratorBO:
    def test_extract_initial_folds_unicode_accents_and_lowercases(self):
        assert UsernameGeneratorBO.extract_initial("José", "first_name") == "j"
        assert UsernameGeneratorBO.extract_initial("  Álvarez ", "last_name") == "a"
        assert UsernameGeneratorBO.extract_initial("Élodie", "first_name") == "e"
        assert UsernameGeneratorBO.extract_initial("123 María", "first_name") == "m"

    @pytest.mark.parametrize("bad_value", ["", "   ", "12345", "---", "🎉"])
    def test_extract_initial_rejects_non_letter_names(self, bad_value):
        with pytest.raises(UsernameGenerationError) as exc_info:
            UsernameGeneratorBO.extract_initial(bad_value, "first_name")

        assert exc_info.value.code == "INVALID_NAME"
        assert exc_info.value.status == 400
        assert exc_info.value.field == "first_name"

    def test_split_full_name_accepts_multi_part_and_rejects_single_word(self):
        first, last = UsernameGeneratorBO.split_full_name("  Mary Ann   Smith ")
        assert first == "Mary"
        assert last == "Ann Smith"

        for invalid in ["", "   ", "Cher"]:
            with pytest.raises(UsernameGenerationError) as exc_info:
                UsernameGeneratorBO.split_full_name(invalid)
            assert exc_info.value.code == "LAST_NAME_REQUIRED"
            assert exc_info.value.status == 400
            assert exc_info.value.field == "last_name"

    def test_creates_formatted_username_and_global_reservation(self):
        user = UsernameGeneratorBO.create_user_with_generated_username(
            first_name="José",
            last_name="Álvarez",
            email="jose.alvarez@example.com",
            password="StrongPassword!2026",
            school_code="SC1234567",
            is_active=True,
        )

        assert re.fullmatch(r"ja\d{8}_SC1234567", user.username)
        assert user.first_name == "José"
        assert user.last_name == "Álvarez"
        reservation = UsernameNumberReservation.objects.get(user=user)
        assert reservation.number_code == user.username[2:10]

    def test_enforces_system_wide_8_digit_uniqueness_across_tenants_and_initials(self):
        existing_user = get_user_model().objects.create_user(
            username="ab12345678_schoolA",
            email="ab@example.com",
            password="StrongPassword!2026",
        )
        UsernameNumberReservation.objects.create(
            number_code="12345678",
            user=existing_user,
        )

        with patch.object(
            UsernameGeneratorBO,
            "generate_8_digit_number",
            side_effect=["12345678", "87654321"],
        ) as mock_gen:
            second_user = UsernameGeneratorBO.create_user_with_generated_username(
                first_name="Zara",
                last_name="Khan",
                email="zk@example.com",
                password="StrongPassword!2026",
                school_code="schoolB",
                is_active=True,
            )

        assert mock_gen.call_count == 2
        assert second_user.username == "zk87654321_schoolB"
        assert UsernameNumberReservation.objects.filter(
            number_code="87654321", user=second_user
        ).exists()

    def test_retries_on_savepoint_integrity_error_and_succeeds(self):
        original_create = UsernameNumberReservation.objects.create
        calls = {"count": 0}

        def flaky_reservation_create(*args, **kwargs):
            calls["count"] += 1
            if calls["count"] == 1:
                raise IntegrityError("concurrent reservation collision")
            return original_create(*args, **kwargs)

        with (
            patch.object(
                UsernameGeneratorBO,
                "generate_8_digit_number",
                side_effect=["11111111", "22222222"],
            ),
            patch.object(
                UsernameNumberReservation.objects,
                "create",
                side_effect=flaky_reservation_create,
            ),
        ):
            user = UsernameGeneratorBO.create_user_with_generated_username(
                first_name="Elena",
                last_name="Rostova",
                email="elena@example.com",
                password="StrongPassword!2026",
                school_code="oakridge",
                is_active=False,
            )

        assert user.username == "er22222222_oakridge"
        assert not get_user_model().objects.filter(username="er11111111_oakridge").exists()
        assert UsernameNumberReservation.objects.filter(
            number_code="22222222", user=user
        ).exists()

    def test_raises_503_username_unavailable_when_attempts_exhausted(self):
        existing_user = get_user_model().objects.create_user(
            username="aa99999999_oakridge",
            email="aa@example.com",
            password="StrongPassword!2026",
        )
        UsernameNumberReservation.objects.create(
            number_code="99999999",
            user=existing_user,
        )

        with patch.object(
            UsernameGeneratorBO,
            "generate_8_digit_number",
            return_value="99999999",
        ):
            with pytest.raises(UsernameGenerationError) as exc_info:
                UsernameGeneratorBO.create_user_with_generated_username(
                    first_name="Jane",
                    last_name="Doe",
                    email="jane@example.com",
                    password="StrongPassword!2026",
                    school_code="oakridge",
                    is_active=True,
                )

        assert exc_info.value.code == "USERNAME_UNAVAILABLE"
        assert exc_info.value.status == 503
