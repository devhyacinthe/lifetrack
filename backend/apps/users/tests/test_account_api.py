"""Profil, changement de mot de passe et suppression du compte."""

import pytest
from django.urls import reverse

from apps.users.models import User

from .factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.django_db

ME = reverse("users:me")
CHANGE_PASSWORD = reverse("users:change-password")
DELETE_ACCOUNT = reverse("users:delete-account")
REFRESH = reverse("users:token-refresh")
NEW_PASSWORD = "Nouveau-mot-de-passe-2026"


# --- Profil --------------------------------------------------------------------


def test_me_returns_own_profile_without_sensitive_fields(auth_client, user):
    response = auth_client.get(ME)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(user.id)
    assert body["email"] == user.email
    assert not {"password", "is_staff", "is_superuser"} & set(body)


def test_me_never_exposes_another_user(auth_client, user, other_user):
    # Aucun identifiant n'est accepté : le profil est toujours celui du porteur du jeton.
    response = auth_client.get(ME, {"id": str(other_user.id)})

    assert response.json()["id"] == str(user.id)


def test_me_update_profile(auth_client, user):
    response = auth_client.patch(
        ME,
        {"first_name": "Akosua", "preferred_currency": "EUR", "timezone": "Europe/Paris"},
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert (user.first_name, user.preferred_currency, user.timezone) == (
        "Akosua",
        "EUR",
        "Europe/Paris",
    )


def test_me_cannot_change_email_or_privileges(auth_client, user):
    original_email = user.email

    auth_client.patch(
        ME,
        {
            "email": "autre@example.com",
            "is_staff": True,
            "id": "00000000-0000-0000-0000-000000000000",
        },
        format="json",
    )

    user.refresh_from_db()
    assert user.email == original_email
    assert user.is_staff is False


@pytest.mark.parametrize("payload", [{"timezone": "Mars/Olympus"}, {"preferred_currency": "euro"}])
def test_me_rejects_invalid_values(auth_client, payload):
    response = auth_client.patch(ME, payload, format="json")

    assert response.status_code == 400
    assert set(payload) <= set(response.json())


def test_me_put_is_not_allowed(auth_client):
    response = auth_client.put(ME, {"first_name": "X"}, format="json")

    assert response.status_code == 405


# --- Changement de mot de passe -----------------------------------------------


def test_change_password(auth_client, user):
    response = auth_client.post(
        CHANGE_PASSWORD,
        {"current_password": DEFAULT_PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == 204
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(DEFAULT_PASSWORD)


def test_change_password_requires_current_password(auth_client, user):
    response = auth_client.post(
        CHANGE_PASSWORD,
        {"current_password": "mauvais", "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == 400
    assert "current_password" in response.json()
    user.refresh_from_db()
    assert user.check_password(DEFAULT_PASSWORD)


def test_change_password_rejects_weak_password(auth_client):
    response = auth_client.post(
        CHANGE_PASSWORD,
        {"current_password": DEFAULT_PASSWORD, "new_password": "123"},
        format="json",
    )

    assert response.status_code == 400
    assert "new_password" in response.json()


def test_change_password_revokes_existing_sessions(api_client, auth_client, user, tokens_for):
    refresh = tokens_for(user)["refresh"]

    auth_client.post(
        CHANGE_PASSWORD,
        {"current_password": DEFAULT_PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )

    assert api_client.post(REFRESH, {"refresh": refresh}, format="json").status_code == 401


def test_change_password_requires_authentication(api_client):
    response = api_client.post(
        CHANGE_PASSWORD,
        {"current_password": DEFAULT_PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == 401


# --- Suppression du compte -----------------------------------------------------


def test_delete_account(api_client, auth_client, user, tokens_for):
    refresh = tokens_for(user)["refresh"]

    response = auth_client.post(DELETE_ACCOUNT, {"password": DEFAULT_PASSWORD}, format="json")

    assert response.status_code == 204
    assert not User.objects.filter(pk=user.pk).exists()
    # Les jetons existants deviennent inutilisables.
    assert auth_client.get(ME).status_code == 401
    assert api_client.post(REFRESH, {"refresh": refresh}, format="json").status_code == 401


def test_delete_account_requires_password(auth_client, user):
    response = auth_client.post(DELETE_ACCOUNT, {"password": "mauvais"}, format="json")

    assert response.status_code == 400
    assert User.objects.filter(pk=user.pk).exists()


def test_delete_account_only_deletes_own_account(auth_client, user, other_user):
    auth_client.post(DELETE_ACCOUNT, {"password": DEFAULT_PASSWORD}, format="json")

    assert User.objects.filter(pk=other_user.pk).exists()


def test_delete_account_requires_authentication(api_client):
    response = api_client.post(DELETE_ACCOUNT, {"password": DEFAULT_PASSWORD}, format="json")

    assert response.status_code == 401


def test_delete_account_with_financial_history(auth_client, user):
    # Régression : la suppression ne doit pas être bloquée par les transactions et transferts.
    from apps.finance.tests.factories import TransactionFactory, TransferFactory

    TransactionFactory(user=user)
    TransferFactory(user=user)

    response = auth_client.post(DELETE_ACCOUNT, {"password": DEFAULT_PASSWORD}, format="json")

    assert response.status_code == 204
    assert not User.objects.filter(pk=user.pk).exists()
