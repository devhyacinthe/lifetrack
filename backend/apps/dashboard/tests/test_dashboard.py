"""Tableau de bord : indicateurs calculés, états vides, isolation et nombre de requêtes."""

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.dashboard.selectors import LATEST_COUNT, active_balances, build_dashboard
from apps.finance.models import TransactionType
from apps.finance.tests.factories import (
    AccountFactory,
    BudgetFactory,
    CategoryFactory,
    TransactionFactory,
    TransferFactory,
)
from apps.workouts.models import WorkoutStatus
from apps.workouts.tests.factories import ActivityTypeFactory, WorkoutFactory, WorkoutGoalFactory

pytestmark = pytest.mark.django_db

DASHBOARD = reverse("dashboard:dashboard")
DAY = datetime.date(2026, 10, 15)


def at(month, day, hour=7):
    return datetime.datetime(2026, month, day, hour, 0, tzinfo=datetime.UTC)


def get(client, day="2026-10-15"):
    response = client.get(f"{DASHBOARD}?date={day}")
    assert response.status_code == 200
    return response.json()


# --- États vides ------------------------------------------------------------------------------


def test_new_user_gets_zeros_and_empty_lists(auth_client):
    body = get(auth_client)

    assert body["period_start"] == "2026-10-01"
    assert body["period_end"] == "2026-10-31"
    assert body["currency"] == "XOF"
    assert body["finance"] == {
        "income": "0.00",
        "expense": "0.00",
        "net": "0.00",
        "balance": "0.00",
        "accounts_count": 1,  # compte « Espèces » créé à l'inscription
        "other_currencies": [],
    }
    assert body["workouts"]["sessions_count"] == 0
    assert body["workouts"]["total_duration_seconds"] == 0
    assert body["ongoing_session"] is None
    for key in ("budgets", "workout_goals", "latest_transactions", "latest_sessions"):
        assert body[key] == []


def test_dashboard_requires_authentication(api_client):
    assert api_client.get(DASHBOARD).status_code == 401


def test_invalid_reference_date_is_rejected(auth_client):
    response = auth_client.get(f"{DASHBOARD}?date=demain")

    assert response.status_code == 400
    assert "date" in response.json()


# --- Finances ---------------------------------------------------------------------------------


def test_month_totals_and_balance_of_active_accounts(auth_client, user):
    bank = AccountFactory(user=user, initial_balance=Decimal("100000"))
    savings = AccountFactory(user=user, initial_balance=Decimal("20000"))
    AccountFactory(user=user, initial_balance=Decimal("999999"), is_archived=True)
    AccountFactory(user=user, currency="EUR", initial_balance=Decimal("150"))
    salary = CategoryFactory(user=user, type=TransactionType.INCOME)
    TransactionFactory(
        user=user,
        account=bank,
        type=TransactionType.INCOME,
        category=salary,
        amount=Decimal("300000"),
        date=DAY,
    )
    TransactionFactory(user=user, account=bank, amount=Decimal("45000"), date=DAY)
    TransactionFactory(
        user=user, account=bank, amount=Decimal("5000"), date=datetime.date(2026, 9, 30)
    )
    # Un transfert déplace de l'argent sans changer le solde total ni les revenus/dépenses.
    TransferFactory(user=user, from_account=bank, to_account=savings, amount=Decimal("10000"))

    finance = get(auth_client)["finance"]

    assert finance["income"] == "300000.00"
    assert finance["expense"] == "45000.00"
    assert finance["net"] == "255000.00"
    # 100 000 + 300 000 − 45 000 − 5 000 + 20 000 (+ Espèces à 0) ; archivé et EUR exclus.
    assert finance["balance"] == "370000.00"
    assert finance["accounts_count"] == 3
    assert finance["other_currencies"] == [
        {"currency": "EUR", "balance": "150.00", "accounts_count": 1}
    ]


def test_active_balances_group_by_currency(user):
    AccountFactory(user=user, currency="EUR", initial_balance=Decimal("10"))
    AccountFactory(user=user, currency="EUR", initial_balance=Decimal("-2.5"))

    balances = active_balances(user)

    assert balances["EUR"].balance == Decimal("7.5")
    assert balances["EUR"].accounts_count == 2
    assert balances["XOF"].balance == Decimal("0")


def test_budgets_show_their_progress(auth_client, user):
    category = CategoryFactory(user=user)
    BudgetFactory(user=user, category=category, amount=Decimal("50000"))
    TransactionFactory(user=user, category=category, amount=Decimal("12500"), date=DAY)

    budgets = get(auth_client)["budgets"]

    assert len(budgets) == 1
    assert budgets[0]["spent"] == "12500.00"
    assert budgets[0]["percent_used"] == "25.0"


def test_latest_transactions_are_the_five_most_recent(auth_client, user):
    for day in range(1, 8):
        TransactionFactory(user=user, date=datetime.date(2026, 10, day), description=f"J{day}")

    latest = get(auth_client)["latest_transactions"]

    assert len(latest) == LATEST_COUNT
    assert [t["description"] for t in latest] == ["J7", "J6", "J5", "J4", "J3"]
    assert {"category_name", "account_name", "currency"} <= latest[0].keys()


# --- Sport ------------------------------------------------------------------------------------


def test_workouts_of_month_ongoing_session_and_goals(auth_client, user):
    activity = ActivityTypeFactory(user=user)
    WorkoutFactory(user=user, activity=activity, started_at=at(10, 3), duration_seconds=1800)
    WorkoutFactory(user=user, activity=activity, started_at=at(10, 12), duration_seconds=3600)
    WorkoutFactory(user=user, activity=activity, started_at=at(9, 28))  # mois précédent
    ongoing = WorkoutFactory(
        user=user,
        activity=activity,
        started_at=at(10, 15),
        status=WorkoutStatus.IN_PROGRESS,
        duration_seconds=None,
        intensity=None,
    )
    WorkoutGoalFactory(user=user, period="monthly", target_value=Decimal("4"))

    body = get(auth_client)

    assert body["workouts"]["sessions_count"] == 2
    assert body["workouts"]["total_duration_seconds"] == 5400
    assert body["ongoing_session"]["id"] == str(ongoing.pk)
    assert body["workout_goals"][0]["current_value"] == "2.00"
    assert body["workout_goals"][0]["percent"] == "50.0"
    # Dernières séances : terminées seulement, la plus récente d'abord.
    assert [s["started_at"][:10] for s in body["latest_sessions"]] == [
        "2026-10-12",
        "2026-10-03",
        "2026-09-28",
    ]


# --- Isolation et performance -----------------------------------------------------------------


def test_other_user_data_never_appears(auth_client, other_user):
    account = AccountFactory(user=other_user, initial_balance=Decimal("1000000"))
    TransactionFactory(user=other_user, account=account, date=DAY)
    BudgetFactory(user=other_user)
    WorkoutFactory(user=other_user, started_at=at(10, 10))
    WorkoutGoalFactory(user=other_user)

    body = get(auth_client)

    assert body["finance"]["balance"] == "0.00"
    assert body["finance"]["expense"] == "0.00"
    assert body["workouts"]["sessions_count"] == 0
    for key in ("budgets", "workout_goals", "latest_transactions", "latest_sessions"):
        assert body[key] == []


def test_query_count_does_not_grow_with_data(auth_client, user, django_assert_max_num_queries):
    activity = ActivityTypeFactory(user=user)
    for day in range(1, 11):
        TransactionFactory(user=user, date=datetime.date(2026, 10, day))
        WorkoutFactory(user=user, activity=activity, started_at=at(10, day))
    for _ in range(3):
        BudgetFactory(user=user)
    WorkoutGoalFactory(user=user, period="weekly")
    WorkoutGoalFactory(user=user, period="monthly", activity=activity)

    # 13 requêtes mesurées (authentification comprise), quel que soit le nombre d'objets.
    with django_assert_max_num_queries(13):
        get(auth_client)


def test_build_dashboard_uses_reference_date(user):
    TransactionFactory(user=user, amount=Decimal("700"), date=datetime.date(2026, 3, 10))

    march = build_dashboard(user, datetime.date(2026, 3, 31))
    october = build_dashboard(user, DAY)

    assert (march.period_start, march.finance.expense) == (
        datetime.date(2026, 3, 1),
        Decimal("700"),
    )
    assert october.finance.expense == Decimal("0")
