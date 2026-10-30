from decimal import Decimal

import pytest
from django.urls import reverse

from apps.finance.models import Transaction, Transfer

from .factories import AccountFactory, TransferFactory

pytestmark = pytest.mark.django_db

LIST = reverse("finance:transfer-list")
ACCOUNTS = reverse("finance:account-list")


def detail(transfer):
    return reverse("finance:transfer-detail", args=[transfer.pk])


@pytest.fixture
def accounts(user):
    return (
        AccountFactory(user=user, name="Banque", initial_balance=Decimal("100000")),
        AccountFactory(user=user, name="Épargne", type="savings"),
    )


def balances(client):
    results = client.get(ACCOUNTS, {"page_size": 100}).json()["results"]
    return {a["name"]: a["balance"] for a in results}


def test_create_transfer_moves_money_without_income_or_expense(auth_client, user, accounts):
    bank, savings = accounts

    response = auth_client.post(
        LIST,
        {
            "from_account": str(bank.pk),
            "to_account": str(savings.pk),
            "amount": "40000",
            "date": "2026-10-20",
            "description": "Épargne du mois",
        },
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert (body["from_account_name"], body["to_account_name"], body["currency"]) == (
        "Banque",
        "Épargne",
        "XOF",
    )
    assert balances(auth_client)["Banque"] == "60000.00"
    assert balances(auth_client)["Épargne"] == "40000.00"
    assert not Transaction.objects.filter(user=user).exists()


def test_same_account_is_rejected(auth_client, accounts):
    bank, _ = accounts

    response = auth_client.post(
        LIST,
        {
            "from_account": str(bank.pk),
            "to_account": str(bank.pk),
            "amount": "10",
            "date": "2026-10-20",
        },
        format="json",
    )

    assert response.status_code == 400
    assert not Transfer.objects.exists()


def test_different_currencies_are_rejected(auth_client, user, accounts):
    bank, _ = accounts
    euro = AccountFactory(user=user, currency="EUR")

    response = auth_client.post(
        LIST,
        {
            "from_account": str(bank.pk),
            "to_account": str(euro.pk),
            "amount": "10",
            "date": "2026-10-20",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "to_account" in response.json()


def test_other_users_account_is_rejected(auth_client, other_user, accounts):
    bank, _ = accounts
    foreign = AccountFactory(user=other_user)

    response = auth_client.post(
        LIST,
        {
            "from_account": str(bank.pk),
            "to_account": str(foreign.pk),
            "amount": "10",
            "date": "2026-10-20",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["to_account"] == ["Objet introuvable."]


def test_archived_account_is_rejected(auth_client, accounts):
    bank, savings = accounts
    savings.is_archived = True
    savings.save()

    response = auth_client.post(
        LIST,
        {
            "from_account": str(bank.pk),
            "to_account": str(savings.pk),
            "amount": "10",
            "date": "2026-10-20",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "to_account" in response.json()


def test_update_to_same_account_is_rejected(auth_client, user, accounts):
    bank, savings = accounts
    transfer = TransferFactory(user=user, from_account=bank, to_account=savings)

    response = auth_client.patch(detail(transfer), {"to_account": str(bank.pk)}, format="json")

    assert response.status_code == 400


def test_delete_transfer_restores_balances(auth_client, user, accounts):
    bank, savings = accounts
    transfer = TransferFactory(
        user=user, from_account=bank, to_account=savings, amount=Decimal("5000")
    )

    assert auth_client.delete(detail(transfer)).status_code == 204
    assert balances(auth_client)["Banque"] == "100000.00"
    assert balances(auth_client)["Épargne"] == "0.00"


def test_filter_by_account_matches_both_sides(auth_client, user, accounts):
    bank, savings = accounts
    other = AccountFactory(user=user)
    out = TransferFactory(user=user, from_account=bank, to_account=savings)
    back = TransferFactory(user=user, from_account=savings, to_account=bank)
    TransferFactory(user=user, from_account=savings, to_account=other)

    ids = {t["id"] for t in auth_client.get(LIST, {"account": str(bank.pk)}).json()["results"]}

    assert ids == {str(out.pk), str(back.pk)}


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_transfer_is_not_found(auth_client, other_user, method):
    transfer = TransferFactory(user=other_user, amount=Decimal("100"))

    response = getattr(auth_client, method)(detail(transfer), {"amount": "1"}, format="json")

    assert response.status_code == 404
    transfer.refresh_from_db()
    assert transfer.amount == Decimal("100")


def test_list_excludes_other_users(auth_client, user, other_user):
    TransferFactory(user=user)
    TransferFactory(user=other_user)

    assert auth_client.get(LIST).json()["count"] == 1
