"""Lectures et calculs financiers (sans écriture)."""

from decimal import Decimal

from django.db.models import DecimalField, F, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from .models import (
    AMOUNT_DECIMAL_PLACES,
    AMOUNT_MAX_DIGITS,
    Account,
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


def _summed_per_account(queryset, account_field):
    """Somme des montants de queryset pour le compte de la requête englobante."""
    totals = (
        queryset.filter(**{account_field: OuterRef("pk")})
        .order_by()
        .values(account_field)
        .annotate(total=Sum("amount"))
        .values("total")
    )
    return Coalesce(Subquery(totals), Value(ZERO), output_field=_amount_field())


def accounts_with_balance(user):
    """
    Comptes de l'utilisateur annotés de leur solde, en une seule requête SQL.

    Même formule que account_balance() ; les deux sont comparées dans les tests.
    """
    return Account.objects.filter(user=user).annotate(
        balance=F("initial_balance")
        + _summed_per_account(Transaction.objects.filter(type=TransactionType.INCOME), "account")
        - _summed_per_account(Transaction.objects.filter(type=TransactionType.EXPENSE), "account")
        + _summed_per_account(Transfer.objects.all(), "to_account")
        - _summed_per_account(Transfer.objects.all(), "from_account")
    )


def account_has_operations(account):
    return (
        account.transactions.exists()
        or account.transfers_in.exists()
        or account.transfers_out.exists()
    )
