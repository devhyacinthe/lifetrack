from decimal import Decimal

import pytest
from django.urls import reverse

from apps.finance.models import Account, TransactionType
from apps.finance.selectors import account_balance, accounts_with_balance

from .factories import AccountFactory, TransactionFactory, TransferFactory

pytestmark = pytest.mark.django_db

LIST = reverse("finance:account-list")


def detail(account):
    return reverse("finance:account-detail", args=[account.pk])


def test_list_returns_only_own_accounts_with_balance(auth_client, user, other_user):
    account = AccountFactory(user=user, name="Banque", initial_balance=Decimal("1000"))
    TransactionFactory(
        user=user, account=account, type=TransactionType.INCOME, amount=Decimal("500")
    )
    AccountFactory(user=other_user, name="Compte de B")

    response = auth_client.get(LIST)

    assert response.status_code == 200
    body = response.json()
    names = {a["name"] for a in body["results"]}
    assert names == {"Espèces", "Banque"}  # compte par défaut + compte créé
    banque = next(a for a in body["results"] if a["name"] == "Banque")
    assert banque["balance"] == "1500.00"
    assert banque["initial_balance"] == "1000.00"


def test_create_account_uses_preferred_currency_by_default(auth_client, user):
    response = auth_client.post(
        LIST, {"name": "Orange Money", "type": "mobile_money"}, format="json"
    )

    assert response.status_code == 201
    body = response.json()
    assert body["currency"] == user.preferred_currency
    assert body["balance"] == "0.00"
    assert Account.objects.get(pk=body["id"]).user == user


def test_create_account_with_initial_balance_returns_balance(auth_client):
    response = auth_client.post(
        LIST,
        {"name": "Banque", "type": "bank", "currency": "EUR", "initial_balance": "250.50"},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["balance"] == "250.50"


def test_create_account_rejects_duplicate_name(auth_client):
    response = auth_client.post(LIST, {"name": "Espèces", "type": "cash"}, format="json")

    assert response.status_code == 400
    assert "name" in response.json()


@pytest.mark.parametrize("payload", [{"type": "crypto"}, {"currency": "euro"}, {"name": ""}])
def test_create_account_validates_fields(auth_client, payload):
    data = {"name": "Nouveau", "type": "bank", **payload}

    response = auth_client.post(LIST, data, format="json")

    assert response.status_code == 400
    assert set(payload) <= set(response.json())


def test_update_initial_balance_returns_fresh_balance(auth_client, user):
    account = AccountFactory(user=user, initial_balance=Decimal("100"))

    response = auth_client.patch(detail(account), {"initial_balance": "300"}, format="json")

    assert response.status_code == 200
    assert response.json()["balance"] == "300.00"


def test_currency_can_change_without_operations(auth_client, user):
    account = AccountFactory(user=user, currency="XOF")

    response = auth_client.patch(detail(account), {"currency": "EUR"}, format="json")

    assert response.status_code == 200
    assert response.json()["currency"] == "EUR"


def test_currency_is_frozen_once_account_has_operations(auth_client, user):
    account = AccountFactory(user=user, currency="XOF")
    TransactionFactory(user=user, account=account)

    response = auth_client.patch(detail(account), {"currency": "EUR"}, format="json")

    assert response.status_code == 400
    assert "currency" in response.json()


def test_archive_account(auth_client, user):
    account = AccountFactory(user=user)

    response = auth_client.patch(detail(account), {"is_archived": True}, format="json")

    assert response.status_code == 200
    account.refresh_from_db()
    assert account.is_archived is True


def test_filter_archived_accounts(auth_client, user):
    AccountFactory(user=user, name="Ancien", is_archived=True)

    response = auth_client.get(LIST, {"is_archived": "true"})

    assert [a["name"] for a in response.json()["results"]] == ["Ancien"]


def test_delete_unused_account(auth_client, user):
    account = AccountFactory(user=user)

    response = auth_client.delete(detail(account))

    assert response.status_code == 204
    assert not Account.objects.filter(pk=account.pk).exists()


def test_delete_used_account_returns_conflict(auth_client, user):
    account = AccountFactory(user=user)
    TransactionFactory(user=user, account=account)

    response = auth_client.delete(detail(account))

    assert response.status_code == 409
    assert "archivez" in response.json()["detail"]
    assert Account.objects.filter(pk=account.pk).exists()


def test_put_is_not_allowed(auth_client, user):
    account = AccountFactory(user=user)

    response = auth_client.put(detail(account), {"name": "X", "type": "bank"}, format="json")

    assert response.status_code == 405


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_account_is_not_found(auth_client, other_user, method):
    account = AccountFactory(user=other_user)

    response = getattr(auth_client, method)(detail(account), {"name": "Piraté"}, format="json")

    assert response.status_code == 404
    account.refresh_from_db()
    assert account.name != "Piraté"


def test_requires_authentication(api_client):
    assert api_client.get(LIST).status_code == 401


def test_annotated_balance_matches_python_calculation(user):
    a = AccountFactory(user=user, initial_balance=Decimal("1000.50"))
    b = AccountFactory(user=user)
    TransactionFactory(user=user, account=a, type=TransactionType.INCOME, amount=Decimal("200.25"))
    TransactionFactory(user=user, account=a, type=TransactionType.EXPENSE, amount=Decimal("50.10"))
    TransferFactory(user=user, from_account=a, to_account=b, amount=Decimal("300"))
    TransferFactory(user=user, from_account=b, to_account=a, amount=Decimal("100.05"))

    for account in accounts_with_balance(user):
        assert account.balance == account_balance(account)


def test_list_query_count_does_not_grow_with_accounts(
    auth_client, user, django_assert_max_num_queries
):
    for _ in range(10):
        account = AccountFactory(user=user)
        TransactionFactory(user=user, account=account)
        TransferFactory(user=user, from_account=account)

    # Authentification + comptage (pagination) + liste avec soldes.
    with django_assert_max_num_queries(3):
        response = auth_client.get(LIST)
    assert response.status_code == 200
