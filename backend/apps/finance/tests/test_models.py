"""Contraintes de la base et règles de validation des modèles financiers."""

import datetime
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import RestrictedError

from apps.finance.models import Account, Category, Transaction, TransactionType, Transfer
from apps.users.tests.factories import UserFactory

from .factories import AccountFactory, CategoryFactory, TransactionFactory, TransferFactory

pytestmark = pytest.mark.django_db

DAY = datetime.date(2026, 10, 1)


def unsaved_transaction(user, **overrides):
    """Transaction non enregistrée, avec un compte et une catégorie de l'utilisateur."""
    data = {
        "user": user,
        "type": TransactionType.EXPENSE,
        "amount": Decimal("1000"),
        "account": AccountFactory(user=user),
        "category": CategoryFactory(user=user, type=TransactionType.EXPENSE),
        "date": DAY,
    }
    data.update(overrides)
    return Transaction(**data)


# --- Contraintes de la base ----------------------------------------------------


@pytest.mark.parametrize("amount", [Decimal("0"), Decimal("-500")])
def test_transaction_amount_must_be_positive_in_database(amount):
    tx = unsaved_transaction(UserFactory(), amount=amount)

    with pytest.raises(IntegrityError), transaction.atomic():
        tx.save()


def test_transaction_type_is_constrained_in_database():
    tx = TransactionFactory()

    with pytest.raises(IntegrityError), transaction.atomic():
        Transaction.objects.filter(pk=tx.pk).update(type="gift")


@pytest.mark.parametrize("amount", [Decimal("0"), Decimal("-1")])
def test_transfer_amount_must_be_positive_in_database(amount):
    transfer = TransferFactory()

    with pytest.raises(IntegrityError), transaction.atomic():
        Transfer.objects.filter(pk=transfer.pk).update(amount=amount)


def test_transfer_accounts_must_differ_in_database():
    account = AccountFactory()

    with pytest.raises(IntegrityError), transaction.atomic():
        Transfer.objects.create(
            user=account.user,
            from_account=account,
            to_account=account,
            amount=Decimal("100"),
            date=datetime.date(2026, 10, 1),
        )


def test_account_name_is_unique_per_user():
    account = AccountFactory(name="Banque")

    with pytest.raises(IntegrityError), transaction.atomic():
        AccountFactory(user=account.user, name="Banque")


def test_same_account_name_allowed_for_different_users():
    AccountFactory(name="Banque")
    AccountFactory(name="Banque")


def test_category_name_unique_per_user_and_type():
    category = CategoryFactory(name="Divers", type=TransactionType.EXPENSE)

    CategoryFactory(user=category.user, name="Divers", type=TransactionType.INCOME)
    with pytest.raises(IntegrityError), transaction.atomic():
        CategoryFactory(user=category.user, name="Divers", type=TransactionType.EXPENSE)


def test_amount_keeps_two_decimal_places():
    tx = TransactionFactory(amount=Decimal("1234.56"))

    tx.refresh_from_db()
    assert tx.amount == Decimal("1234.56")


# --- Validation (clean) -----------------------------------------------------------


def test_valid_transaction_passes_validation():
    unsaved_transaction(UserFactory()).full_clean()


def test_transaction_rejects_account_of_another_user():
    tx = unsaved_transaction(UserFactory(), account=AccountFactory())

    with pytest.raises(ValidationError) as exc:
        tx.full_clean()
    assert "account" in exc.value.message_dict


def test_transaction_rejects_category_of_another_user():
    tx = unsaved_transaction(UserFactory(), category=CategoryFactory())

    with pytest.raises(ValidationError) as exc:
        tx.full_clean()
    assert "category" in exc.value.message_dict


def test_transaction_rejects_category_of_wrong_type():
    user = UserFactory()
    tx = unsaved_transaction(user, category=CategoryFactory(user=user, type=TransactionType.INCOME))

    with pytest.raises(ValidationError) as exc:
        tx.full_clean()
    assert "category" in exc.value.message_dict


def test_transaction_currency_is_account_currency():
    tx = TransactionFactory(account__currency="EUR")

    assert tx.currency == "EUR"


def test_account_rejects_invalid_currency():
    account = AccountFactory.build(user=UserFactory(), currency="euro")

    with pytest.raises(ValidationError) as exc:
        account.full_clean()
    assert "currency" in exc.value.message_dict


def test_transfer_rejects_account_of_another_user():
    user = UserFactory()
    transfer = Transfer(
        user=user,
        from_account=AccountFactory(user=user),
        to_account=AccountFactory(),  # autre utilisateur
        amount=Decimal("10"),
        date=DAY,
    )

    with pytest.raises(ValidationError) as exc:
        transfer.full_clean()
    assert "to_account" in exc.value.message_dict


def test_transfer_rejects_same_account():
    account = AccountFactory()
    transfer = Transfer(
        user=account.user,
        from_account=account,
        to_account=account,
        amount=Decimal("10"),
        date=datetime.date(2026, 10, 1),
    )

    with pytest.raises(ValidationError):
        transfer.full_clean()


def test_transfer_rejects_different_currencies():
    user = UserFactory()
    transfer = Transfer(
        user=user,
        from_account=AccountFactory(user=user, currency="XOF"),
        to_account=AccountFactory(user=user, currency="EUR"),
        amount=Decimal("10"),
        date=datetime.date(2026, 10, 1),
    )

    with pytest.raises(ValidationError) as exc:
        transfer.full_clean()
    assert "to_account" in exc.value.message_dict


# --- Suppression et historique ----------------------------------------------------


def test_used_category_cannot_be_deleted():
    tx = TransactionFactory()

    with pytest.raises(RestrictedError):
        tx.category.delete()


def test_used_account_cannot_be_deleted():
    tx = TransactionFactory()

    with pytest.raises(RestrictedError):
        tx.account.delete()


def test_account_used_by_transfer_cannot_be_deleted():
    transfer = TransferFactory()

    with pytest.raises(RestrictedError):
        transfer.to_account.delete()


def test_unused_category_can_be_deleted():
    category = CategoryFactory()

    category.delete()

    assert not Category.objects.filter(pk=category.pk).exists()


def test_deleting_user_deletes_all_financial_data():
    tx = TransactionFactory()
    user = tx.user
    TransferFactory(user=user)
    other = TransactionFactory()

    user.delete()

    for model in (Account, Category, Transaction, Transfer):
        assert not model.objects.filter(user_id=user.pk).exists()
    assert Transaction.objects.filter(pk=other.pk).exists()
