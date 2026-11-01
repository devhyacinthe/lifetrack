"""Lectures et calculs financiers (sans écriture)."""

import datetime
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, DecimalField, F, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, ExtractMonth, ExtractYear

from apps.core.periods import (  # noqa: F401  (réexportés)
    MONTHLY,
    period_bounds,
    period_sequence,
    user_today,
)

from .models import (
    AMOUNT_DECIMAL_PLACES,
    AMOUNT_MAX_DIGITS,
    Account,
    SavingsGoal,
    Transaction,
    TransactionType,
    Transfer,
)

ZERO = Decimal("0")


def _amount_field():
    return DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)


def _sum_amount(queryset):
    return queryset.aggregate(
        total=Coalesce(Sum("amount"), Value(ZERO), output_field=_amount_field())
    )["total"]


def account_balance(account):
    """
    Solde = solde initial + revenus - dépenses + transferts reçus - transferts émis.

    Calculé à partir des opérations enregistrées : il ne peut pas être désynchronisé.
    """
    incomes = _sum_amount(account.transactions.filter(type=TransactionType.INCOME))
    expenses = _sum_amount(account.transactions.filter(type=TransactionType.EXPENSE))
    transfers_in = _sum_amount(account.transfers_in.all())
    transfers_out = _sum_amount(account.transfers_out.all())
    return account.initial_balance + incomes - expenses + transfers_in - transfers_out


def _summed_per_account(queryset, account_field, outer_ref):
    """Somme des montants de queryset pour le compte désigné par outer_ref (requête englobante)."""
    totals = (
        queryset.filter(**{account_field: OuterRef(outer_ref)})
        .order_by()
        .values(account_field)
        .annotate(total=Sum("amount"))
        .values("total")
    )
    return Coalesce(Subquery(totals), Value(ZERO), output_field=_amount_field())


def _balance_expression(account_path=""):
    """
    Expression SQL du solde du compte atteint par account_path (vide : le modèle Account).

    Même formule que account_balance() ; les deux sont comparées dans les tests.
    """
    prefix = f"{account_path}__" if account_path else ""
    outer_ref = account_path or "pk"
    return (
        F(f"{prefix}initial_balance")
        + _summed_per_account(
            Transaction.objects.filter(type=TransactionType.INCOME), "account", outer_ref
        )
        - _summed_per_account(
            Transaction.objects.filter(type=TransactionType.EXPENSE), "account", outer_ref
        )
        + _summed_per_account(Transfer.objects.all(), "to_account", outer_ref)
        - _summed_per_account(Transfer.objects.all(), "from_account", outer_ref)
    )


def accounts_with_balance(user):
    """Comptes de l'utilisateur annotés de leur solde, en une seule requête SQL."""
    return Account.objects.filter(user=user).annotate(balance=_balance_expression())


def account_has_operations(account):
    return (
        account.transactions.exists()
        or account.transfers_in.exists()
        or account.transfers_out.exists()
    )


# --- Budgets ------------------------------------------------------------------------


@dataclass(frozen=True)
class BudgetUsage:
    period_start: datetime.date
    period_end: datetime.date
    spent: Decimal
    remaining: Decimal
    percent_used: Decimal


def _percent(part, whole):
    return (part * 100 / whole).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def attach_budget_usage(budgets, user, reference_date):
    """
    Calcule la consommation de chaque budget pour la période contenant reference_date,
    et l'attache à l'attribut `usage`.

    Dépenses comptées : celles de l'utilisateur, datées dans la période, sur un compte de la
    devise du budget, et de la catégorie du budget (toutes pour un budget global). Les
    revenus et les transferts ne sont jamais comptés.

    Une seule requête SQL par type de période présent, quel que soit le nombre de budgets.
    """
    budgets = list(budgets)
    totals_by_period = {}
    for period in {budget.period for budget in budgets}:
        start, end = period_bounds(period, reference_date)
        rows = (
            Transaction.objects.filter(
                user=user, type=TransactionType.EXPENSE, date__gte=start, date__lte=end
            )
            .order_by()
            .values("category_id", "account__currency")
            .annotate(total=Sum("amount"))
        )
        totals = {}
        for row in rows:
            currency = row["account__currency"]
            # Clé (catégorie, devise) pour un budget par catégorie, (None, devise) pour un global.
            for key in [(row["category_id"], currency), (None, currency)]:
                totals[key] = totals.get(key, ZERO) + row["total"]
        totals_by_period[period] = (start, end, totals)

    for budget in budgets:
        start, end, totals = totals_by_period[budget.period]
        spent = totals.get((budget.category_id, budget.currency), ZERO)
        budget.usage = BudgetUsage(
            period_start=start,
            period_end=end,
            spent=spent,
            remaining=budget.amount - spent,
            percent_used=_percent(spent, budget.amount),
        )
    return budgets


# --- Objectifs d'épargne ------------------------------------------------------------


def goals_with_progress(user):
    """Objectifs annotés du solde actuel de leur compte (current_amount), en une requête."""
    return (
        SavingsGoal.objects.filter(user=user)
        .select_related("account")
        .annotate(current_amount=_balance_expression("account"))
    )


def goal_progress(goal):
    """Montant restant (jamais négatif) et pourcentage atteint (borné entre 0 et 100)."""
    current = goal.current_amount
    remaining = max(goal.target_amount - current, ZERO)
    percent = min(max(_percent(current, goal.target_amount), ZERO), Decimal("100.0"))
    return remaining, percent


# --- Statistiques ---------------------------------------------------------------------
# Les montants de devises différentes ne s'additionnent pas : chaque calcul porte sur les
# comptes d'une seule devise. Les transferts ne sont jamais comptés (ni revenu ni dépense).


@dataclass(frozen=True)
class MonthTotals:
    period_start: datetime.date
    period_end: datetime.date
    income: Decimal
    expense: Decimal
    net: Decimal


def monthly_totals(user, currency, reference_date, months):
    """
    Revenus, dépenses et solde (revenus - dépenses) des `months` derniers mois calendaires,
    du plus ancien au mois de reference_date. Un mois sans transaction vaut zéro.
    """
    periods = period_sequence(MONTHLY, reference_date, months)
    rows = (
        Transaction.objects.filter(
            user=user,
            account__currency=currency,
            date__gte=periods[0][0],
            date__lte=periods[-1][1],
        )
        .order_by()
        .annotate(year=ExtractYear("date"), month=ExtractMonth("date"))
        .values("year", "month", "type")
        .annotate(total=Sum("amount"))
    )
    totals = {(row["year"], row["month"], row["type"]): row["total"] for row in rows}

    result = []
    for start, end in periods:
        income = totals.get((start.year, start.month, TransactionType.INCOME), ZERO)
        expense = totals.get((start.year, start.month, TransactionType.EXPENSE), ZERO)
        result.append(MonthTotals(start, end, income, expense, income - expense))
    return result


@dataclass(frozen=True)
class CategoryTotal:
    category_id: object
    category_name: str
    total: Decimal
    transactions_count: int
    percent: Decimal


def category_totals(user, transaction_type, currency, start, end):
    """
    Montant de chaque catégorie (revenus ou dépenses) entre deux dates incluses, du plus
    élevé au plus faible, avec sa part du total (arrondie à 0,1 %).
    """
    rows = (
        Transaction.objects.filter(
            user=user,
            type=transaction_type,
            account__currency=currency,
            date__gte=start,
            date__lte=end,
        )
        .order_by()
        .values("category_id", "category__name")
        .annotate(total=Sum("amount"), count=Count("id"))
    )
    grand_total = sum((row["total"] for row in rows), ZERO)
    items = [
        CategoryTotal(
            category_id=row["category_id"],
            category_name=row["category__name"],
            total=row["total"],
            transactions_count=row["count"],
            percent=_percent(row["total"], grand_total),
        )
        for row in rows
    ]
    items.sort(key=lambda item: (-item.total, item.category_name))
    return grand_total, items
