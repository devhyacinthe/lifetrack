"""Écritures financières : chaque opération est validée puis enregistrée de façon atomique."""

from django.db import transaction

from .defaults import (
    DEFAULT_ACCOUNT_NAME,
    DEFAULT_ACCOUNT_TYPE,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
)
from .models import Account, Category, Transaction, TransactionType, Transfer


@transaction.atomic
def setup_default_finance(user):
    """Crée les catégories initiales et le compte « Espèces » d'un nouvel utilisateur."""
    categories = [
        Category(user=user, name=name, type=TransactionType.EXPENSE)
        for name in DEFAULT_EXPENSE_CATEGORIES
    ] + [
        Category(user=user, name=name, type=TransactionType.INCOME)
        for name in DEFAULT_INCOME_CATEGORIES
    ]
    Category.objects.bulk_create(categories)
    Account.objects.create(
        user=user,
        name=DEFAULT_ACCOUNT_NAME,
        type=DEFAULT_ACCOUNT_TYPE,
        currency=user.preferred_currency,
    )


@transaction.atomic
def create_transaction(user, **data):
    tx = Transaction(user=user, **data)
    tx.full_clean()
    tx.save()
    return tx


@transaction.atomic
def create_transfer(user, **data):
    transfer = Transfer(user=user, **data)
    transfer.full_clean()
    transfer.save()
    return transfer
