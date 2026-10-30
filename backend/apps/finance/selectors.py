"""Lectures et calculs financiers (sans écriture)."""

from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce

from .models import AMOUNT_DECIMAL_PLACES, AMOUNT_MAX_DIGITS, TransactionType

ZERO = Decimal("0")


def _sum_amount(queryset):
    output = DecimalField(max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES)
    return queryset.aggregate(total=Coalesce(Sum("amount"), Value(ZERO), output_field=output))[
        "total"
    ]


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
