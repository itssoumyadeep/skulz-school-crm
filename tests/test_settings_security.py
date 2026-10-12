import os
import secrets
import subprocess
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONFIG_VARIABLES = {
    "DJANGO_DEBUG",
    "DJANGO_SECRET_KEY",
    "JWT_SECRET_KEY",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
    "DJANGO_ALLOWED_HOSTS",
    "CORS_ALLOWED_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "DJANGO_SECURE_SSL_REDIRECT",
    "DJANGO_SECURE_HSTS_SECONDS",
}


def _base_environment():
    environment = os.environ.copy()
    environment["PYTHON_DOTENV_DISABLED"] = "true"
    for name in CONFIG_VARIABLES:
        environment.pop(name, None)
    return environment


def _production_environment():
    return {
        **_base_environment(),
        "DJANGO_SECRET_KEY": secrets.token_urlsafe(64),
        "JWT_SECRET_KEY": secrets.token_urlsafe(64),
        "DB_NAME": "school_crm_test",
        "DB_USER": "school_crm_test_user",
        "DB_PASSWORD": secrets.token_urlsafe(32),
        "DB_HOST": "db.example.test",
        "DB_PORT": "5432",
        "DJANGO_ALLOWED_HOSTS": "api.example.test",
        "CORS_ALLOWED_ORIGINS": "https://portal.example.test",
        "CSRF_TRUSTED_ORIGINS": "https://portal.example.test",
        "STRIPE_SECRET_KEY": "sk_test_" + secrets.token_urlsafe(48),
        "STRIPE_WEBHOOK_SECRET": "whsec_" + secrets.token_urlsafe(48),
    }


def _run_settings(environment, code="import config.settings"):
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=PROJECT_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


def test_debug_defaults_to_false_and_production_security_is_enabled():
    environment = _production_environment()
    result = _run_settings(
        environment,
        """import config.settings as settings
assert settings.DEBUG is False
assert settings.SESSION_COOKIE_SECURE is True
assert settings.CSRF_COOKIE_SECURE is True
assert settings.SECURE_SSL_REDIRECT is True
assert settings.SECURE_HSTS_SECONDS > 0
print('settings-ok')""",
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "settings-ok"


@pytest.mark.parametrize("missing_secret", ["DJANGO_SECRET_KEY", "JWT_SECRET_KEY"])
def test_startup_fails_when_signing_secret_is_missing(missing_secret):
    environment = _production_environment()
    environment.pop(missing_secret)

    result = _run_settings(environment)

    assert result.returncode != 0
    assert f"{missing_secret} must be set" in result.stderr


@pytest.mark.parametrize(
    "missing_setting",
    ["DB_PASSWORD", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
)
def test_production_startup_fails_when_required_secret_is_missing(missing_setting):
    environment = _production_environment()
    environment.pop(missing_setting)

    result = _run_settings(environment)

    assert result.returncode != 0
    assert missing_setting in result.stderr


def test_production_rejects_http_origins_and_insecure_transport():
    environment = _production_environment()
    environment["CORS_ALLOWED_ORIGINS"] = "http://portal.example.test"

    result = _run_settings(environment)

    assert result.returncode != 0
    assert "CORS_ALLOWED_ORIGINS must use HTTPS" in result.stderr


def test_development_requires_explicit_secrets_but_allows_local_http():
    environment = {
        **_base_environment(),
        "DJANGO_DEBUG": "true",
        "DJANGO_SECRET_KEY": secrets.token_urlsafe(64),
        "JWT_SECRET_KEY": secrets.token_urlsafe(64),
    }
    result = _run_settings(
        environment,
        """import config.settings as settings
assert settings.DEBUG is True
assert settings.SESSION_COOKIE_SECURE is False
assert settings.SECURE_SSL_REDIRECT is False
print('settings-ok')""",
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "settings-ok"