import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_schema_is_served_and_lists_health_endpoint(api_client):
    response = api_client.get(reverse("schema"), {"format": "json"})

    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "LifeTrack API"
    assert "/api/v1/health/" in schema["paths"]


@pytest.mark.django_db
@pytest.mark.parametrize("url_name", ["swagger-ui", "redoc"])
def test_documentation_pages_are_served(api_client, url_name):
    response = api_client.get(reverse(url_name))

    assert response.status_code == 200
    assert "text/html" in response["Content-Type"]


@pytest.mark.django_db
def test_schema_documents_jwt_authentication(api_client):
    schema = api_client.get(reverse("schema"), {"format": "json"}).json()

    assert schema["components"]["securitySchemes"]["jwtAuth"]["scheme"] == "bearer"
    for path in ["register", "login", "token/refresh", "logout", "me", "me/password", "me/delete"]:
        assert f"/api/v1/auth/{path}/" in schema["paths"]
