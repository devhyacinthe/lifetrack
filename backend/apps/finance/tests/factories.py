import datetime
from decimal import Decimal

import factory

from apps.finance.models import (
    Account,
    AccountType,
    Budget,
    BudgetPeriod,
    Category,
    SavingsGoal,
    Transaction,
    TransactionType,
    Transfer,
)
from apps.users.tests.factories import UserFactory


class AccountFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Account

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Compte {n}")
    type = AccountType.BANK
    currency = "XOF"
    initial_balance = Decimal("0")


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Catégorie {n}")
    type = TransactionType.EXPENSE


class TransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transaction

    user = factory.SubFactory(UserFactory)
    type = TransactionType.EXPENSE
    amount = Decimal("1000")
    account = factory.SubFactory(AccountFactory, user=factory.SelfAttribute("..user"))
    category = factory.SubFactory(
        CategoryFactory, user=factory.SelfAttribute("..user"), type=factory.SelfAttribute("..type")
    )
    date = datetime.date(2026, 10, 15)


class TransferFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transfer

    user = factory.SubFactory(UserFactory)
    from_account = factory.SubFactory(AccountFactory, user=factory.SelfAttribute("..user"))
    to_account = factory.SubFactory(AccountFactory, user=factory.SelfAttribute("..user"))
    amount = Decimal("1000")
    date = datetime.date(2026, 10, 15)


class BudgetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Budget

    user = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory, user=factory.SelfAttribute("..user"))
    amount = Decimal("50000")
    currency = "XOF"
    period = BudgetPeriod.MONTHLY


class SavingsGoalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SavingsGoal

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Objectif {n}")
    account = factory.SubFactory(
        AccountFactory, user=factory.SelfAttribute("..user"), type=AccountType.SAVINGS
    )
    target_amount = Decimal("100000")
