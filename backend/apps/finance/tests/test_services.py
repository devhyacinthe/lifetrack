"""Données initiales, création des opérations et calcul des soldes."""

import datetime
import importlib
from decimal import Decimal

import pytest
from django.apps import apps as django_apps
from django.core.exceptions import ValidationError

from apps.finance import services
from apps.finance.defaults import DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES
from apps.finance.models import Account, Category, Transaction, TransactionType, Transfer
from apps.finance.selectors import account_balance
from apps.users.models import User
from apps.users.tests.factories import UserFactory

from .factories import AccountFactory, CategoryFactory, TransactionFactory, TransferFactory

pytestmark = pytest.mark.django_db

DAY = datetime.date(2026, 10, 15)


# --- Données initiales ----------------------------------------------------------


def test_new_user_receives_default_categories_and_account():
    user = UserFactory(preferred_currency="EUR")

    expenses = set(
        user.categories.filter(type=TransactionType.EXPENSE).values_list("name", flat=True)
    )
    incomes = set(
        user.categories.filter(type=TransactionType.INCOME).values_list("name", flat=True)
    )
    assert expenses == set(DEFAULT_EXPENSE_CATEGORIES)
    assert incomes == set(DEFAULT_INCOME_CATEGORIES)

    account = user.accounts.get()
    assert (account.name, account.type, account.currency) == ("Espèces", "cash", "EUR")


def test_default_data_is_not_duplicated_on_user_update():
    user = UserFactory()
    count = user.categories.count()

    user.first_name = "Kojo"
    user.save()

    assert user.categories.count() == count
    assert user.accounts.count() == 1


def test_superuser_also_receives_default_data():
    admin = User.objects.create_superuser("admin@example.com", password="Secret-2026-ok")

    assert admin.accounts.count() == 1


def test_data_migration_backfills_users_created_before_finance():
    user = UserFactory()
    user.categories.all().delete()
    user.accounts.all().delete()
    already_set_up = UserFactory()
    migration = importlib.import_module(
        "apps.finance.migrations.0002_default_data_for_existing_users"
    )

    migration.create_default_data(django_apps, schema_editor=None)
    migration.create_default_data(django_apps, schema_editor=None)  # idempotente

    assert user.categories.count() == len(DEFAULT_EXPENSE_CATEGORIES + DEFAULT_INCOME_CATEGORIES)
    assert user.accounts.count() == 1
    assert already_set_up.accounts.count() == 1


# --- Création des opérations ------------------------------------------------------


def test_create_transaction_validates_ownership():
    user = UserFactory()
    foreign_account = AccountFactory()

    with pytest.raises(ValidationError):
        services.create_transaction(
            user,
            type=TransactionType.EXPENSE,
            amount=Decimal("500"),
            account=foreign_account,
            category=CategoryFactory(user=user),
            date=DAY,
        )
    assert not Transaction.objects.filter(user=user).exists()


def test_create_transaction_rejects_non_positive_amount():
    user = UserFactory()

    with pytest.raises(ValidationError):
        services.create_transaction(
            user,
            type=TransactionType.EXPENSE,
            amount=Decimal("0"),
            account=AccountFactory(user=user),
            category=CategoryFactory(user=user),
            date=DAY,
        )


def test_create_transfer_does_not_create_income_or_expense():
    user = UserFactory()
    source = AccountFactory(user=user)
    target = AccountFactory(user=user)

    services.create_transfer(
        user, from_account=source, to_account=target, amount=Decimal("2500"), date=DAY
    )

    assert Transfer.objects.filter(user=user).count() == 1
    assert not Transaction.objects.filter(user=user).exists()


def test_failed_transfer_writes_nothing():
    user = UserFactory()

    with pytest.raises(ValidationError):
        services.create_transfer(
            user,
            from_account=AccountFactory(user=user, currency="XOF"),
            to_account=AccountFactory(user=user, currency="EUR"),
            amount=Decimal("100"),
            date=DAY,
        )
    assert not Transfer.objects.exists()


# --- Soldes -------------------------------------------------------------------------


def test_balance_of_new_account_is_initial_balance():
    account = AccountFactory(initial_balance=Decimal("15000"))

    assert account_balance(account) == Decimal("15000")


def test_balance_combines_transactions_and_transfers():
    user = UserFactory()
    account = AccountFactory(user=user, initial_balance=Decimal("10000"))
    savings = AccountFactory(user=user)
    TransactionFactory(
        user=user, account=account, type=TransactionType.INCOME, amount=Decimal("50000")
    )
    TransactionFactory(
        user=user, account=account, type=TransactionType.EXPENSE, amount=Decimal("12500")
    )
    TransferFactory(user=user, from_account=account, to_account=savings, amount=Decimal("20000"))
    TransferFactory(user=user, from_account=savings, to_account=account, amount=Decimal("5000"))

    # 10 000 + 50 000 - 12 500 - 20 000 + 5 000
    assert account_balance(account) == Decimal("32500")
    assert account_balance(savings) == Decimal("15000")


def test_transfer_keeps_total_balance_unchanged():
    user = UserFactory()
    a = AccountFactory(user=user, initial_balance=Decimal("8000"))
    b = AccountFactory(user=user, initial_balance=Decimal("2000"))

    services.create_transfer(user, from_account=a, to_account=b, amount=Decimal("3000"), date=DAY)

    assert account_balance(a) + account_balance(b) == Decimal("10000")


def test_balance_is_exact_with_decimals():
    user = UserFactory()
    account = AccountFactory(user=user, currency="EUR")
    for amount in ["0.10", "0.20", "0.10", "0.20", "0.10", "0.20"]:
        TransactionFactory(
            user=user, account=account, type=TransactionType.INCOME, amount=Decimal(amount)
        )

    assert account_balance(account) == Decimal("0.90")


def test_balance_can_be_negative():
    account = AccountFactory()
    TransactionFactory(user=account.user, account=account, amount=Decimal("700"))

    assert account_balance(account) == Decimal("-700")


def test_balance_ignores_other_accounts_and_users():
    account = AccountFactory()
    TransactionFactory(user=account.user, amount=Decimal("999"))  # autre compte, même utilisateur
    TransactionFactory(amount=Decimal("999"))  # autre utilisateur
    TransactionFactory(
        user=account.user, account=account, type=TransactionType.INCOME, amount=Decimal("100")
    )

    assert account_balance(account) == Decimal("100")


def test_default_category_counts():
    user = UserFactory()

    assert Category.objects.filter(user=user).count() == 17
    assert Account.objects.filter(user=user).count() == 1
