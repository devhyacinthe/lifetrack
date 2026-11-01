"""Statistiques financières : totaux mensuels et répartition par catégorie."""

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.finance.models import TransactionType
from apps.finance.selectors import category_totals, monthly_totals

from .factories import AccountFactory, CategoryFactory, TransactionFactory, TransferFactory

pytestmark = pytest.mark.django_db

MONTHLY = reverse("finance:stats-monthly")
CATEGORIES = reverse("finance:stats-categories")
DAY = datetime.date(2026, 10, 15)


def income(user, account, amount, day):
    return TransactionFactory(
        user=user,
        account=account,
        type=TransactionType.INCOME,
        amount=Decimal(amount),
        date=day,
        category=CategoryFactory(user=user, type=TransactionType.INCOME),
    )


def expense(user, account, amount, day, category=None):
    return TransactionFactory(
        user=user,
        account=account,
        type=TransactionType.EXPENSE,
        amount=Decimal(amount),
        date=day,
        category=category or CategoryFactory(user=user),
    )


# --- Totaux mensuels ------------------------------------------------------------------------


def test_monthly_totals_cover_each_month_with_zeros(user):
    account = AccountFactory(user=user)
    income(user, account, "300000", datetime.date(2026, 10, 1))
    expense(user, account, "120000", datetime.date(2026, 10, 31))
    expense(user, account, "50000", datetime.date(2026, 8, 5))
    expense(user, account, "999", datetime.date(2026, 4, 30))  # hors des 6 mois

    months = monthly_totals(user, "XOF", DAY, months=6)

    assert [m.period_start for m in months] == [
        datetime.date(2026, month, 1) for month in range(5, 11)
    ]
    assert months[-1].period_end == datetime.date(2026, 10, 31)
    by_month = {m.period_start.month: (m.income, m.expense, m.net) for m in months}
    assert by_month[10] == (Decimal("300000"), Decimal("120000"), Decimal("180000"))
    assert by_month[8] == (Decimal("0"), Decimal("50000"), Decimal("-50000"))
    assert by_month[5] == (Decimal("0"), Decimal("0"), Decimal("0"))


def test_monthly_totals_span_years(user):
    account = AccountFactory(user=user)
    expense(user, account, "1000", datetime.date(2025, 12, 31))

    months = monthly_totals(user, "XOF", datetime.date(2026, 2, 10), months=3)

    assert [(m.period_start, m.expense) for m in months] == [
        (datetime.date(2025, 12, 1), Decimal("1000")),
        (datetime.date(2026, 1, 1), Decimal("0")),
        (datetime.date(2026, 2, 1), Decimal("0")),
    ]


def test_monthly_totals_ignore_transfers_other_currencies_and_users(user, other_user):
    xof = AccountFactory(user=user)
    eur = AccountFactory(user=user, currency="EUR")
    expense(user, xof, "1000", DAY)
    expense(user, eur, "50", DAY)
    TransferFactory(user=user, from_account=xof, to_account=AccountFactory(user=user), date=DAY)
    expense(other_user, AccountFactory(user=other_user), "777", DAY)

    xof_month = monthly_totals(user, "XOF", DAY, months=1)[0]
    eur_month = monthly_totals(user, "EUR", DAY, months=1)[0]

    assert xof_month.expense == Decimal("1000")
    assert xof_month.income == Decimal("0")
    assert eur_month.expense == Decimal("50")


def test_monthly_endpoint_defaults_and_validation(auth_client, user):
    expense(user, AccountFactory(user=user), "2500.50", DAY)

    body = auth_client.get(f"{MONTHLY}?date=2026-10-20").json()

    assert body["currency"] == "XOF"  # devise préférée par défaut
    assert len(body["months"]) == 6
    assert body["months"][-1] == {
        "period_start": "2026-10-01",
        "period_end": "2026-10-31",
        "income": "0.00",
        "expense": "2500.50",
        "net": "-2500.50",
    }
    for query in ("months=0", "months=25", "currency=euro", "date=demain"):
        response = auth_client.get(f"{MONTHLY}?{query}")
        assert response.status_code == 400, query
        assert query.split("=")[0] in response.json()


# --- Répartition par catégorie --------------------------------------------------------------


def test_category_totals_sorted_with_percentages(user):
    account = AccountFactory(user=user)
    food = CategoryFactory(user=user, name="Repas test")
    transport = CategoryFactory(user=user, name="Bus test")
    expense(user, account, "30000", DAY, food)
    expense(user, account, "15000", DAY.replace(day=2), food)
    expense(user, account, "15000", DAY, transport)
    expense(user, account, "9999", datetime.date(2026, 9, 30), transport)  # mois précédent
    income(user, account, "100000", DAY)

    total, items = category_totals(
        user,
        TransactionType.EXPENSE,
        "XOF",
        datetime.date(2026, 10, 1),
        datetime.date(2026, 10, 31),
    )

    assert total == Decimal("60000")
    assert [(i.category_name, i.total, i.transactions_count, i.percent) for i in items] == [
        ("Repas test", Decimal("45000"), 2, Decimal("75.0")),
        ("Bus test", Decimal("15000"), 1, Decimal("25.0")),
    ]


def test_categories_endpoint(auth_client, user, other_user):
    account = AccountFactory(user=user)
    salary = CategoryFactory(user=user, name="Prime test", type=TransactionType.INCOME)
    TransactionFactory(
        user=user,
        account=account,
        category=salary,
        type=TransactionType.INCOME,
        amount=Decimal("250000"),
        date=DAY,
    )
    expense(other_user, AccountFactory(user=other_user), "5000", DAY)

    expenses = auth_client.get(f"{CATEGORIES}?date=2026-10-15").json()
    incomes = auth_client.get(f"{CATEGORIES}?type=income&period=yearly&date=2026-10-15").json()

    assert expenses["type"] == "expense"
    assert expenses["period_start"] == "2026-10-01"
    assert expenses["total"] == "0.00"
    assert expenses["categories"] == []
    assert incomes["period_start"] == "2026-01-01"
    assert incomes["period_end"] == "2026-12-31"
    assert incomes["categories"] == [
        {
            "category": str(salary.pk),
            "category_name": "Prime test",
            "total": "250000.00",
            "transactions_count": 1,
            "percent": "100.0",
        }
    ]
    assert auth_client.get(f"{CATEGORIES}?type=transfer").status_code == 400
    assert auth_client.get(f"{CATEGORIES}?period=daily").status_code == 400


def test_stats_require_authentication(api_client):
    assert api_client.get(MONTHLY).status_code == 401
    assert api_client.get(CATEGORIES).status_code == 401
