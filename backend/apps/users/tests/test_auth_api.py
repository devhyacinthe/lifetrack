"""Inscription, connexion, renouvellement et déconnexion."""

import pytest
from django.urls import reverse

from apps.users.models import User

from .factories import DEFAULT_PASSWORD, UserFactory

pytestmark = pytest.mark.django_db

REGISTER = reverse("users:register")
LOGIN = reverse("users:login")
REFRESH = reverse("users:token-refresh")
LOGOUT = reverse("users:logout")
ME = reverse("users:me")


def login(client, email, password=DEFAULT_PASSWORD):
    return client.post(LOGIN, {"email": email, "password": password}, format="json")


# --- Inscription ---------------------------------------------------------------


def test_register_creates_account(api_client):
    payload = {
        "email": "Kwame@Example.com",
        "password": "Un-mot-de-passe-solide-2026",
        "first_name": "Kwame",
        "last_name": "Asante",
    }

    response = api_client.post(REGISTER, payload, format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "kwame@example.com"
    assert body["preferred_currency"] == "XOF"
    assert "password" not in body
    assert User.objects.get(email="kwame@example.com").check_password(payload["password"])


def test_register_rejects_duplicate_email_case_insensitive(api_client):
    UserFactory(email="kwame@example.com")

    response = api_client.post(
        REGISTER,
        {"email": "KWAME@example.com", "password": "Un-mot-de-passe-solide-2026"},
        format="json",
    )

    assert response.status_code == 400
    assert "email" in response.json()


@pytest.mark.parametrize("password", ["123", "password", "12345678901"])
def test_register_rejects_weak_password(api_client, password):
    response = api_client.post(
        REGISTER, {"email": "new@example.com", "password": password}, format="json"
    )

    assert response.status_code == 400
    assert "password" in response.json()
    assert not User.objects.filter(email="new@example.com").exists()


def test_register_rejects_password_similar_to_email(api_client):
    response = api_client.post(
        REGISTER,
        {"email": "abenaboateng@example.com", "password": "abenaboateng"},
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.json()


def test_register_rejects_invalid_email(api_client):
    response = api_client.post(
        REGISTER,
        {"email": "pas-un-email", "password": "Un-mot-de-passe-solide-2026"},
        format="json",
    )

    assert response.status_code == 400
    assert "email" in response.json()


def test_register_ignores_privilege_fields(api_client):
    response = api_client.post(
        REGISTER,
        {
            "email": "pirate@example.com",
            "password": "Un-mot-de-passe-solide-2026",
            "is_staff": True,
            "is_superuser": True,
        },
        format="json",
    )

    assert response.status_code == 201
    user = User.objects.get(email="pirate@example.com")
    assert user.is_staff is False
    assert user.is_superuser is False


def test_register_rejects_oversized_password(api_client):
    response = api_client.post(
        REGISTER, {"email": "long@example.com", "password": "A1-" + "x" * 200}, format="json"
    )

    assert response.status_code == 400


# --- Connexion -----------------------------------------------------------------


def test_login_returns_tokens(api_client, user):
    response = login(api_client, user.email)

    assert response.status_code == 200
    assert set(response.json()) == {"access", "refresh"}


def test_login_is_case_insensitive_on_email(api_client, user):
    response = login(api_client, user.email.upper())

    assert response.status_code == 200


def test_login_with_wrong_password_fails(api_client, user):
    response = login(api_client, user.email, "mauvais-mot-de-passe")

    assert response.status_code == 401


def test_login_with_unknown_email_gives_same_error(api_client, user):
    wrong_password = login(api_client, user.email, "mauvais-mot-de-passe")
    unknown_email = login(api_client, "inconnu@example.com")

    # Ne révèle pas si l'adresse e-mail existe.
    assert unknown_email.status_code == wrong_password.status_code == 401
    assert unknown_email.json() == wrong_password.json()


def test_inactive_user_cannot_login(api_client):
    user = UserFactory(is_active=False)

    response = login(api_client, user.email)

    assert response.status_code == 401


def test_login_is_throttled_after_5_attempts(api_client, user):
    for _ in range(5):
        assert login(api_client, user.email, "mauvais").status_code == 401

    response = login(api_client, user.email)

    assert response.status_code == 429


def test_login_throttle_ignores_spoofed_forwarded_for(api_client, user):
    # Changer X-Forwarded-For ne doit pas permettre de contourner la limite.
    for i in range(5):
        api_client.post(
            LOGIN,
            {"email": user.email, "password": "mauvais"},
            format="json",
            HTTP_X_FORWARDED_FOR=f"10.0.0.{i}",
        )

    response = api_client.post(
        LOGIN,
        {"email": user.email, "password": DEFAULT_PASSWORD},
        format="json",
        HTTP_X_FORWARDED_FOR="10.0.0.99",
    )

    assert response.status_code == 429


# --- Accès protégé -------------------------------------------------------------


def test_protected_endpoint_requires_token(api_client):
    response = api_client.get(ME)

    assert response.status_code == 401


def test_protected_endpoint_rejects_invalid_token(api_client):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer jeton.invalide.xyz")

    response = api_client.get(ME)

    assert response.status_code == 401


def test_refresh_token_cannot_be_used_as_access_token(api_client, user, tokens_for):
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens_for(user)['refresh']}")

    response = api_client.get(ME)

    assert response.status_code == 401


def test_access_token_of_deactivated_user_is_rejected(api_client, user, tokens_for):
    access = tokens_for(user)["access"]
    user.is_active = False
    user.save()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    response = api_client.get(ME)

    assert response.status_code == 401


# --- Renouvellement ------------------------------------------------------------


def test_refresh_rotates_and_revokes_previous_token(api_client, user):
    tokens = login(api_client, user.email).json()

    first = api_client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert first.status_code == 200
    assert first.json()["refresh"] != tokens["refresh"]

    reused = api_client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert reused.status_code == 401


def test_refresh_with_invalid_token_fails(api_client):
    response = api_client.post(REFRESH, {"refresh": "invalide"}, format="json")

    assert response.status_code == 401


# --- Déconnexion ---------------------------------------------------------------


def test_logout_revokes_refresh_token(api_client, user):
    tokens = login(api_client, user.email).json()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    response = api_client.post(LOGOUT, {"refresh": tokens["refresh"]}, format="json")

    assert response.status_code == 204
    api_client.credentials()
    assert (
        api_client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json").status_code == 401
    )


def test_logout_requires_authentication(api_client, user, tokens_for):
    response = api_client.post(LOGOUT, {"refresh": tokens_for(user)["refresh"]}, format="json")

    assert response.status_code == 401


def test_logout_twice_fails(auth_client, user, tokens_for):
    refresh = tokens_for(user)["refresh"]

    assert auth_client.post(LOGOUT, {"refresh": refresh}, format="json").status_code == 204
    assert auth_client.post(LOGOUT, {"refresh": refresh}, format="json").status_code == 400


def test_user_cannot_revoke_another_users_token(api_client, auth_client, other_user, tokens_for):
    other_refresh = tokens_for(other_user)["refresh"]

    response = auth_client.post(LOGOUT, {"refresh": other_refresh}, format="json")

    assert response.status_code == 400
    # Le jeton de l'autre utilisateur reste valide.
    assert api_client.post(REFRESH, {"refresh": other_refresh}, format="json").status_code == 200
