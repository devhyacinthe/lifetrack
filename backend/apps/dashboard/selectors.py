"""
Indicateurs du tableau de bord.

Aucune donnée n'est stockée ni dupliquée : chaque valeur est recalculée par les fonctions
des modules finance et workouts, déjà testées (soldes, budgets, statistiques, objectifs).
"""

import datetime
from dataclasses import dataclass, field
from decimal import Decimal

from apps.core.periods import MONTHLY, period_bounds
from apps.finance.models import Budget, Transaction
from apps.finance.selectors import accounts_with_balance, monthly_totals
from apps.workouts.models import Workout, WorkoutGoal, WorkoutStatus
from apps.workouts.selectors import WorkoutStats, workout_stats

LATEST_COUNT = 5
ZERO = Decimal("0")


@dataclass(frozen=True)
class CurrencyBalance:
    currency: str
    balance: Decimal
    accounts_count: int


@dataclass(frozen=True)
class FinanceSummary:
    income: Decimal
    expense: Decimal
    net: Decimal
    # Somme des soldes des comptes actifs dans la devise préférée.
    balance: Decimal
    accounts_count: int
    # Comptes actifs d'autres devises : jamais additionnés au solde principal.
    other_currencies: list = field(default_factory=list)


@dataclass(frozen=True)
class Dashboard:
    reference_date: datetime.date
    period_start: datetime.date
    period_end: datetime.date
    currency: str
    finance: FinanceSummary
    budgets: list
    workouts: WorkoutStats
    ongoing_session: Workout | None
    workout_goals: list
    latest_transactions: list
    latest_sessions: list


def active_balances(user):
    """Soldes des comptes non archivés, regroupés par devise (une requête SQL)."""
    totals = {}
    for account in accounts_with_balance(user).filter(is_archived=False):
        balance, count = totals.get(account.currency, (ZERO, 0))
        totals[account.currency] = (balance + account.balance, count + 1)
    return {
        currency: CurrencyBalance(currency, balance, count)
        for currency, (balance, count) in totals.items()
    }


def finance_summary(user, currency, reference_date):
    """Revenus, dépenses et solde du mois, et solde estimé des comptes actifs."""
    month = monthly_totals(user, currency, reference_date, months=1)[0]
    balances = active_balances(user)
    main = balances.pop(currency, CurrencyBalance(currency, ZERO, 0))
    return FinanceSummary(
        income=month.income,
        expense=month.expense,
        net=month.net,
        balance=main.balance,
        accounts_count=main.accounts_count,
        other_currencies=sorted(balances.values(), key=lambda item: item.currency),
    )


def build_dashboard(user, reference_date):
    """
    Indicateurs du mois contenant reference_date (fuseau de l'utilisateur), dans sa devise
    préférée. Budgets et objectifs sportifs gardent leur propre période (semaine, mois…).

    Les budgets et objectifs sont renvoyés sans leur progression : les serializers la
    calculent pour toute la liste en quelques requêtes (BudgetListSerializer…).
    """
    currency = user.preferred_currency
    start, end = period_bounds(MONTHLY, reference_date)
    sessions = Workout.objects.filter(user=user).select_related("activity")
    return Dashboard(
        reference_date=reference_date,
        period_start=start,
        period_end=end,
        currency=currency,
        finance=finance_summary(user, currency, reference_date),
        budgets=list(Budget.objects.filter(user=user).select_related("category")),
        workouts=workout_stats(user, MONTHLY, reference_date),
        ongoing_session=sessions.filter(status=WorkoutStatus.IN_PROGRESS).first(),
        workout_goals=list(WorkoutGoal.objects.filter(user=user).select_related("activity")),
        latest_transactions=list(
            Transaction.objects.filter(user=user)
            .select_related("account", "category")
            .order_by("-date", "-created_at")[:LATEST_COUNT]
        ),
        latest_sessions=list(
            sessions.filter(status=WorkoutStatus.COMPLETED).order_by("-started_at")[:LATEST_COUNT]
        ),
    )
