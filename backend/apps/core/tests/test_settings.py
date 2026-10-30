"""Vérifie que les paramètres de production refusent une configuration incomplète."""

import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[3]

PROD_ENV = {
    "DJANGO_SECRET_KEY": "x" * 60,
    "DJANGO_ALLOWED_HOSTS": "api.example.com",
    "DATABASE_URL": "sqlite:///prod-check.sqlite3",
}


def load_prod_settings(**overrides):
    """Charge config.settings.prod dans un processus séparé, sans fichier .env."""
    env = {k: v for k, v in os.environ.items() if not k.startswith(("DJANGO_", "DATABASE"))}
    env.update(PROD_ENV)
    env.update(overrides)
    # Une valeur None retire la variable de l'environnement.
    env = {k: v for k, v in env.items() if v is not None}
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.prod"
    code = (
        "import environ; environ.Env.read_env = lambda *a, **k: None\n"
        "import django; from django.conf import settings; django.setup()\n"
        "print(settings.DEBUG, settings.SECURE_SSL_REDIRECT)"
    )
    return subprocess.run(
        [sys.executable, "-c", code], cwd=BACKEND_DIR, env=env, capture_output=True, text=True
    )


def test_prod_settings_load_with_required_variables():
    result = load_prod_settings()

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "False True"


def test_prod_settings_require_secret_key():
    result = load_prod_settings(DJANGO_SECRET_KEY="")

    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr


def test_prod_settings_require_allowed_hosts():
    result = load_prod_settings(DJANGO_ALLOWED_HOSTS="")

    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr


def test_prod_settings_require_database_url():
    result = load_prod_settings(DATABASE_URL=None)

    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
