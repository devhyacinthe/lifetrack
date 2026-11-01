"""Budgets récurrents : périodes, consommation calculée et API."""

import datetime
from decimal import Decimal

import pytest
from django.db import IntegrityError
from django.urls import reverse

from apps.finance.models import Budget, BudgetPeriod, TransactionType
from apps.finance.selectors import attach_budget_usage, period_bounds

from .factories import (
    AccountFactory,
    BudgetFactory,
    CategoryFactory,
    TransactionFactory,
    TransferFactory,
)

pytestmark = pytest.mark.django_db

LIST = reverse("finance:budget-list")
DAY = datetime.date(2026, 10, 15)  # jeudi


def detail(budget):
    return reverse("finance:budget-detail", args=[budget.pk])


# --- Périodes -------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("period", "reference", "expected"),
    [
        # Semaine ISO : du lundi au dimanche, y compris à cheval sur deux mois.
        ("weekly", datetime.date(2026, 10, 15), ("2026-10-12", "2026-10-18")),
        ("weekly", datetime.date(2026, 10, 12), ("2026-10-12", "2026-10-18")),
        ("weekly", datetime.date(2026, 10, 18), ("2026-10-12", "2026-10-18")),
        ("weekly", datetime.date(2026, 11, 1), ("2026-10-26", "2026-11-01")),
        ("monthly", datetime.date(2026, 10, 15), ("2026-10-01", "2026-10-31")),
        ("monthly", datetime.date(2026, 2, 10), ("2026-02-01", "2026-02-28")),
        ("monthly", datetime.date(2028, 2, 10), ("2028-02-01", "2028-02-29")),  # bissextile
        ("yearly", datetime.date(2026, 10, 15), ("2026-01-01", "2026-12-31")),
    ],
)
def test_period_bounds(period, reference, expected):
    start, end = period_bounds(period, reference)

    assert (start.isoformat(), end.isoformat()) == expected


# --- Consommation ----------------------------------------------------------------------


def test_usage_counts_only_expenses_of_category_in_period(user):
    category = CategoryFactory(user=user)
    account = AccountFactory(user=user)
    budget = BudgetFactory(user=user, category=category, amount=Decimal("50000"))
    TransactionFactory(user=user, account=account, category=category, amount=Decimal("12000.50"))
    TransactionFactory(user=user, account=account, category=category, amount=Decimal("8000"))
    # Exclus : autre catégorie, hors période, revenu, transfert.
    TransactionFactory(user=user, account=account, amount=Decimal("99999"))
    TransactionFactory(
        user=user,
        account=account,
        category=category,
        amount=Decimal("99999"),
        date=datetime.date(2026, 9, 30),
    )
    TransactionFactory(
        user=user, account=account, type=TransactionType.INCOME, amount=Decimal("99999")
    )
    TransferFactory(user=user, from_account=account, amount=Decimal("99999"))

    [budget] = attach_budget_usage([budget], user, DAY)

    assert budget.usage.period_start == datetime.date(2026, 10, 1)
    assert budget.usage.period_end == datetime.date(2026, 10, 31)
    assert budget.usage.spent == Decimal("20000.50")
    assert budget.usage.remaining == Decimal("29999.50")
    assert budget.usage.percent_used == Decimal("40.0")


def test_global_budget_counts_all_expense_categories(user):
    account = AccountFactory(user=user)
    budget = BudgetFactory(user=user, category=None, amount=Decimal("1000"))
    TransactionFactory(user=user, account=account, amount=Decimal("300"))
    TransactionFactory(user=user, account=account, amount=Decimal("450"))

    [budget] = attach_budget_usage([budget], user, DAY)

    assert budget.usage.spent == Decimal("750")
    assert budget.usage.percent_used == Decimal("75.0")


def test_usage_ignores_other_currencies_and_users(user, other_user):
    category = CategoryFactory(user=user)
    budget = BudgetFactory(user=user, category=category, currency="XOF")
    eur = AccountFactory(user=user, currency="EUR")
    TransactionFactory(user=user, account=eur, category=category, amount=Decimal("10"))
    TransactionFactory(user=other_user, amount=Decimal("5000"))

    [budget] = attach_budget_usage([budget], user, DAY)

    assert budget.usage.spent == Decimal("0")
    assert budget.usage.percent_used == Decimal("0.0")


def test_usage_can_exceed_the_budget(user):
    category = CategoryFactory(user=user)
    budget = BudgetFactory(user=user, category=category, amount=Decimal("1000"))
    TransactionFactory(user=user, category=category, amount=Decimal("1250"))

    [budget] = attach_budget_usage([budget], user, DAY)

    assert budget.usage.remaining == Decimal("-250")
    assert budget.usage.percent_used == Decimal("125.0")


def test_usage_of_mixed_periods_uses_one_query_per_period(user, django_assert_num_queries):
    category = CategoryFactory(user=user)
    budgets = [
        BudgetFactory(user=user, category=category, period=BudgetPeriod.WEEKLY),
        BudgetFactory(user=user, category=category, period=BudgetPeriod.MONTHLY),
        BudgetFactory(user=user, category=None, period=BudgetPeriod.MONTHLY),
        BudgetFactory(user=user, category=category, period=BudgetPeriod.YEARLY),
    ]
    TransactionFactory(user=user, category=category, amount=Decimal("100"), date=DAY)
    TransactionFactory(
        user=user, category=category, amount=Decimal("10"), date=datetime.date(2026, 3, 1)
    )

    with django_assert_num_queries(3):
        weekly, monthly, global_monthly, yearly = attach_budget_usage(budgets, user, DAY)

    assert weekly.usage.spent == Decimal("100")
    assert monthly.usage.spent == Decimal("100")
    assert global_monthly.usage.spent == Decimal("100")
    assert yearly.usage.spent == Decimal("110")


def test_database_rejects_duplicate_category_budget(user):
    category = CategoryFactory(user=user)
    BudgetFactory(user=user, category=category)

    with pytest.raises(IntegrityError):
        BudgetFactory(user=user, category=category)


# --- API ----------------------------------------------------------------------------------


def test_create_category_budget_returns_current_usage(auth_client, user):
    category = CategoryFactory(user=user)
    TransactionFactory(user=user, category=category, amount=Decimal("2500"), date=DAY)

    response = auth_client.post(
        f"{LIST}?date=2026-10-20",
        {"category": str(category.pk), "amount": "10000", "period": "monthly"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["currency"] == user.preferred_currency
    assert body["category_name"] == category.name
    assert body["period_start"] == "2026-10-01"
    assert body["spent"] == "2500.00"
    assert body["remaining"] == "7500.00"
    assert body["percent_used"] == "25.0"


def test_create_global_budget(auth_client):
    response = auth_client.post(LIST, {"amount": "200000", "period": "monthly"}, format="json")

    assert response.status_code == 201
    assert response.json()["category"] is None
    assert response.json()["category_name"] is None


def test_global_budget_is_unique_per_period_and_currency(auth_client, user):
    BudgetFactory(user=user, category=None, period=BudgetPeriod.MONTHLY)

    duplicate = auth_client.post(LIST, {"amount": "1", "period": "monthly"}, format="json")
    other_period = auth_client.post(LIST, {"amount": "1", "period": "weekly"}, format="json")

    assert duplicate.status_code == 400
    assert "category" in duplicate.json()
    assert other_period.status_code == 201


def test_create_rejects_duplicate_category_budget(auth_client, user):
    budget = BudgetFactory(user=user)

    response = auth_client.post(
        LIST,
        {"category": str(budget.category_id), "amount": "10", "period": "monthly"},
        format="json",
    )

    assert response.status_code == 400
    assert "category" in response.json()


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"amount": "0"}, "amount"),
        ({"amount": "-5"}, "amount"),
        ({"amount": "1.234"}, "amount"),
        ({"period": "daily"}, "period"),
        ({"currency": "euro"}, "currency"),
    ],
)
def test_create_validates_fields(auth_client, payload, field):
    data = {"amount": "1000", "period": "monthly", **payload}

    response = auth_client.post(LIST, data, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_create_rejects_income_inactive_and_foreign_categories(auth_client, user, other_user):
    income = CategoryFactory(user=user, type=TransactionType.INCOME)
    inactive = CategoryFactory(user=user, is_active=False)
    foreign = CategoryFactory(user=other_user)

    for category in [income, inactive, foreign]:
        response = auth_client.post(
            LIST,
            {"category": str(category.pk), "amount": "10", "period": "monthly"},
            format="json",
        )
        assert response.status_code == 400
        assert "category" in response.json()

    assert not Budget.objects.exists()


def test_list_supports_reference_date_for_past_periods(auth_client, user):
    category = CategoryFactory(user=user)
    BudgetFactory(user=user, category=category, amount=Decimal("1000"))
    TransactionFactory(
        user=user, category=category, amount=Decimal("400"), date=datetime.date(2026, 9, 3)
    )

    september = auth_client.get(f"{LIST}?date=2026-09-15").json()["results"][0]
    october = auth_client.get(f"{LIST}?date=2026-10-15").json()["results"][0]

    assert (september["period_start"], september["spent"]) == ("2026-09-01", "400.00")
    assert (october["period_start"], october["spent"]) == ("2026-10-01", "0.00")


def test_list_rejects_invalid_reference_date(auth_client):
    response = auth_client.get(f"{LIST}?date=31-10-2026")

    assert response.status_code == 400
    assert "date" in response.json()


def test_default_reference_date_uses_user_timezone(auth_client, user, monkeypatch):
    # 31 octobre à 23 h 30 UTC : déjà le 1er novembre à Tokyo, encore le 31 octobre à Lomé.
    from django.utils import timezone

    fixed = datetime.datetime(2026, 10, 31, 23, 30, tzinfo=datetime.UTC)
    monkeypatch.setattr(timezone, "now", lambda: fixed)
    BudgetFactory(user=user, category=None, period=BudgetPeriod.MONTHLY)

    user.timezone = "Asia/Tokyo"
    user.save()
    tokyo = auth_client.get(LIST).json()["results"][0]
    user.timezone = "Africa/Lome"
    user.save()
    lome = auth_client.get(LIST).json()["results"][0]

    assert tokyo["period_start"] == "2026-11-01"
    assert lome["period_start"] == "2026-10-01"


def test_list_filters_by_period_and_global(auth_client, user):
    BudgetFactory(user=user, period=BudgetPeriod.WEEKLY)
    BudgetFactory(user=user, category=None, period=BudgetPeriod.MONTHLY)

    weekly = auth_client.get(f"{LIST}?period=weekly").json()
    global_only = auth_client.get(f"{LIST}?is_global=true").json()

    assert [b["period"] for b in weekly["results"]] == ["weekly"]
    assert [b["category"] for b in global_only["results"]] == [None]


def test_update_amount_returns_fresh_usage(auth_client, user):
    category = CategoryFactory(user=user)
    budget = BudgetFactory(user=user, category=category, amount=Decimal("1000"))
    TransactionFactory(user=user, category=category, amount=Decimal("500"), date=DAY)

    response = auth_client.patch(
        f"{detail(budget)}?date=2026-10-15", {"amount": "2000"}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["percent_used"] == "25.0"


def test_budget_keeps_inactive_category_on_update(auth_client, user):
    category = CategoryFactory(user=user)
    budget = BudgetFactory(user=user, category=category)
    category.is_active = False
    category.save()

    response = auth_client.patch(
        detail(budget), {"category": str(category.pk), "amount": "10"}, format="json"
    )

    assert response.status_code == 200


def test_budget_of_other_user_is_not_found(auth_client, other_user):
    budget = BudgetFactory(user=other_user)

    assert auth_client.get(detail(budget)).status_code == 404
    assert auth_client.patch(detail(budget), {"amount": "1"}, format="json").status_code == 404
    assert auth_client.delete(detail(budget)).status_code == 404
    assert auth_client.get(LIST).json()["count"] == 0


def test_delete_budget_keeps_transactions(auth_client, user):
    budget = BudgetFactory(user=user)
    TransactionFactory(user=user, category=budget.category)

    assert auth_client.delete(detail(budget)).status_code == 204
    assert budget.category.transactions.count() == 1


def test_category_with_budget_cannot_be_deleted(auth_client, user):
    budget = BudgetFactory(user=user)

    response = auth_client.delete(reverse("finance:category-detail", args=[budget.category_id]))

    assert response.status_code == 409
    assert "budget" in response.json()["detail"]


def test_requires_authentication(api_client):
    assert api_client.get(LIST).status_code == 401
