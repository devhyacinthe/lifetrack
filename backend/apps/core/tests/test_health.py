from unittest import mock

import pytest
from django.db import OperationalError
from django.urls import reverse

URL = reverse("core:health")


@pytest.mark.django_db
def test_health_returns_ok(api_client):
    response = api_client.get(URL)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_url_is_versioned():
    assert URL == "/api/v1/health/"


@pytest.mark.django_db
def test_health_is_public(api_client):
    # Aucun en-tête d'authentification : l'endpoint reste accessible.
    response = api_client.get(URL)

    assert response.status_code == 200


@pytest.mark.django_db
def test_health_reports_database_failure_without_details(api_client):
    error = OperationalError("Access denied for user 'secret_user'@'localhost'")
    with mock.patch("apps.core.views.connection.ensure_connection", side_effect=error):
        response = api_client.get(URL)

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
    assert "secret_user" not in response.content.decode()


@pytest.mark.django_db
@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_health_rejects_write_methods(api_client, method):
    response = getattr(api_client, method)(URL)

    assert response.status_code == 405
