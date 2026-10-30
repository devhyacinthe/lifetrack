import datetime
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.finance.models import Transaction, TransactionType

from .factories import AccountFactory, CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db

LIST = reverse("finance:transaction-list")


def detail(tx):
    return reverse("finance:transaction-detail", args=[tx.pk])


@pytest.fixture
def account(user):
    return AccountFactory(user=user, name="Banque", currency="XOF")


@pytest.fixture
def expense_category(user):
    return CategoryFactory(user=user, name="Courses", type=TransactionType.EXPENSE)


@pytest.fixture
def payload(account, expense_category):
    return {
        "type": "expense",
        "amount": "15000",
        "account": str(account.pk),
        "category": str(expense_category.pk),
        "date": "2026-10-20",
        "description": "Marché",
        "payment_method": "mobile_money",
    }


# --- Création ---------------------------------------------------------------------


def test_create_transaction(auth_client, user, payload):
    response = auth_client.post(LIST, payload, format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == "15000.00"
    assert body["currency"] == "XOF"
    assert body["account_name"] == "Banque"
    assert body["category_name"] == "Courses"
    assert Transaction.objects.get(pk=body["id"]).user == user


@pytest.mark.parametrize("amount", ["0", "-10", "0.001", "abc", "10000000000000.00"])
def test_invalid_amount_is_rejected(auth_client, payload, amount):
    response = auth_client.post(LIST, {**payload, "amount": amount}, format="json")

    assert response.status_code == 400
    assert "amount" in response.json()


@pytest.mark.parametrize("field", ["type", "amount", "account", "category", "date"])
def test_required_fields(auth_client, payload, field):
    del payload[field]

    response = auth_client.post(LIST, payload, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_other_users_account_is_rejected(auth_client, other_user, payload):
    foreign = AccountFactory(user=other_user)

    response = auth_client.post(LIST, {**payload, "account": str(foreign.pk)}, format="json")

    assert response.status_code == 400
    assert response.json()["account"] == ["Objet introuvable."]


def test_other_users_category_is_rejected(auth_client, other_user, payload):
    foreign = CategoryFactory(user=other_user)

    response = auth_client.post(LIST, {**payload, "category": str(foreign.pk)}, format="json")

    assert response.status_code == 400
    assert response.json()["category"] == ["Objet introuvable."]


def test_category_type_must_match(auth_client, user, payload):
    income = CategoryFactory(user=user, type=TransactionType.INCOME)

    response = auth_client.post(LIST, {**payload, "category": str(income.pk)}, format="json")

    assert response.status_code == 400
    assert "category" in response.json()


def test_archived_account_is_rejected_for_new_transaction(auth_client, account, payload):
    account.is_archived = True
    account.save()

    response = auth_client.post(LIST, payload, format="json")

    assert response.status_code == 400
    assert "account" in response.json()


def test_inactive_category_is_rejected_for_new_transaction(auth_client, expense_category, payload):
    expense_category.is_active = False
    expense_category.save()

    response = auth_client.post(LIST, payload, format="json")

    assert response.status_code == 400
    assert "category" in response.json()


def test_user_field_cannot_be_forced(auth_client, user, other_user, payload):
    response = auth_client.post(LIST, {**payload, "user": str(other_user.pk)}, format="json")

    assert response.status_code == 201
    assert Transaction.objects.get(pk=response.json()["id"]).user == user


# --- Modification et suppression -------------------------------------------------------


def test_update_transaction(auth_client, user):
    tx = TransactionFactory(user=user, amount=Decimal("100"))

    response = auth_client.patch(detail(tx), {"amount": "250.50"}, format="json")

    assert response.status_code == 200
    tx.refresh_from_db()
    assert tx.amount == Decimal("250.50")


def test_changing_type_requires_matching_category(auth_client, user):
    tx = TransactionFactory(user=user, type=TransactionType.EXPENSE)

    response = auth_client.patch(detail(tx), {"type": "income"}, format="json")

    assert response.status_code == 400
    assert "category" in response.json()


def test_existing_transaction_stays_editable_after_archiving(auth_client, user):
    tx = TransactionFactory(user=user)
    tx.account.is_archived = True
    tx.account.save()
    tx.category.is_active = False
    tx.category.save()

    response = auth_client.patch(detail(tx), {"description": "Corrigée"}, format="json")

    assert response.status_code == 200


def test_delete_transaction(auth_client, user):
    tx = TransactionFactory(user=user)

    assert auth_client.delete(detail(tx)).status_code == 204
    assert not Transaction.objects.filter(pk=tx.pk).exists()


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_transaction_is_not_found(auth_client, other_user, method):
    tx = TransactionFactory(user=other_user, amount=Decimal("100"))

    response = getattr(auth_client, method)(detail(tx), {"amount": "1"}, format="json")

    assert response.status_code == 404
    tx.refresh_from_db()
    assert tx.amount == Decimal("100")


def test_cannot_move_transaction_to_other_users_account(auth_client, user, other_user):
    tx = TransactionFactory(user=user)
    foreign = AccountFactory(user=other_user)

    response = auth_client.patch(detail(tx), {"account": str(foreign.pk)}, format="json")

    assert response.status_code == 400


# --- Liste : isolation, pagination, filtres, recherche, tri ------------------------------


def test_list_excludes_other_users(auth_client, user, other_user):
    TransactionFactory(user=user)
    TransactionFactory(user=other_user)

    response = auth_client.get(LIST)

    assert response.json()["count"] == 1


def test_list_is_paginated(auth_client, user):
    account = AccountFactory(user=user)
    category = CategoryFactory(user=user)
    for _ in range(25):
        TransactionFactory(user=user, account=account, category=category)

    first = auth_client.get(LIST).json()
    custom = auth_client.get(LIST, {"page_size": 5, "page": 2}).json()

    assert (first["count"], len(first["results"])) == (25, 20)
    assert first["next"] is not None
    assert len(custom["results"]) == 5


def test_default_order_is_most_recent_first(auth_client, user):
    TransactionFactory(user=user, date=datetime.date(2026, 1, 1))
    TransactionFactory(user=user, date=datetime.date(2026, 6, 1))

    dates = [t["date"] for t in auth_client.get(LIST).json()["results"]]

    assert dates == ["2026-06-01", "2026-01-01"]


def test_order_by_amount(auth_client, user):
    for amount in ["300", "100", "200"]:
        TransactionFactory(user=user, amount=Decimal(amount))

    amounts = [t["amount"] for t in auth_client.get(LIST, {"ordering": "amount"}).json()["results"]]

    assert amounts == ["100.00", "200.00", "300.00"]


@pytest.fixture
def mixed_transactions(user):
    account = AccountFactory(user=user)
    category = CategoryFactory(user=user, type=TransactionType.INCOME)
    return {
        "salary": TransactionFactory(
            user=user,
            type=TransactionType.INCOME,
            category=category,
            account=account,
            amount=Decimal("300000"),
            date=datetime.date(2026, 9, 30),
            description="Salaire septembre",
        ),
        "taxi": TransactionFactory(
            user=user,
            amount=Decimal("2000"),
            date=datetime.date(2026, 10, 5),
            description="Taxi moto",
            payment_method="cash",
        ),
        "rent": TransactionFactory(
            user=user,
            amount=Decimal("75000"),
            date=datetime.date(2026, 10, 1),
            description="Loyer",
            payment_method="bank_transfer",
        ),
    }


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ({"type": "income"}, {"salary"}),
        ({"type": "expense"}, {"taxi", "rent"}),
        ({"date_after": "2026-10-01"}, {"taxi", "rent"}),
        ({"date_before": "2026-09-30"}, {"salary"}),
        ({"date_after": "2026-10-01", "date_before": "2026-10-01"}, {"rent"}),
        ({"amount_min": "10000"}, {"salary", "rent"}),
        ({"amount_max": "2000"}, {"taxi"}),
        ({"payment_method": "cash"}, {"taxi"}),
        ({"search": "taxi"}, {"taxi"}),
    ],
)
def test_filters(auth_client, mixed_transactions, query, expected):
    ids = {t["id"] for t in auth_client.get(LIST, query).json()["results"]}

    assert ids == {str(mixed_transactions[name].pk) for name in expected}


def test_filter_by_account_and_category(auth_client, mixed_transactions):
    salary = mixed_transactions["salary"]

    by_account = auth_client.get(LIST, {"account": str(salary.account_id)}).json()
    by_category = auth_client.get(LIST, {"category": str(salary.category_id)}).json()

    assert [t["id"] for t in by_account["results"]] == [str(salary.pk)]
    assert [t["id"] for t in by_category["results"]] == [str(salary.pk)]


def test_filter_with_other_users_account_returns_nothing(auth_client, user, other_user):
    TransactionFactory(user=user)
    foreign = TransactionFactory(user=other_user)

    response = auth_client.get(LIST, {"account": str(foreign.account_id)})

    assert response.status_code == 200
    assert response.json()["count"] == 0


def test_invalid_filter_value_is_rejected(auth_client):
    response = auth_client.get(LIST, {"date_after": "pas-une-date"})

    assert response.status_code == 400


def test_list_query_count_does_not_grow(auth_client, user, django_assert_max_num_queries):
    for _ in range(15):
        TransactionFactory(user=user)

    # Authentification + comptage + liste (compte et catégorie joints).
    with django_assert_max_num_queries(3):
        assert auth_client.get(LIST).status_code == 200
