"""Objectifs d'épargne : progression issue du solde du compte, sans double comptage."""

import datetime
from decimal import Decimal

import pytest
from django.db import IntegrityError
from django.urls import reverse

from apps.finance.models import SavingsGoal, TransactionType
from apps.finance.selectors import goals_with_progress

from .factories import AccountFactory, SavingsGoalFactory, TransactionFactory, TransferFactory

pytestmark = pytest.mark.django_db

LIST = reverse("finance:goal-list")


def detail(goal):
    return reverse("finance:goal-detail", args=[goal.pk])


def test_progress_is_the_account_balance_including_transfers(user):
    savings = AccountFactory(user=user, initial_balance=Decimal("10000"))
    cash = AccountFactory(user=user)
    goal = SavingsGoalFactory(user=user, account=savings, target_amount=Decimal("100000"))
    TransactionFactory(
        user=user, account=savings, type=TransactionType.INCOME, amount=Decimal("5000")
    )
    TransferFactory(user=user, from_account=cash, to_account=savings, amount=Decimal("25000"))
    TransactionFactory(user=user, account=savings, amount=Decimal("2500.50"))

    [annotated] = goals_with_progress(user).filter(pk=goal.pk)

    assert annotated.current_amount == Decimal("37499.50")


def test_an_account_serves_a_single_goal(user):
    goal = SavingsGoalFactory(user=user)

    with pytest.raises(IntegrityError):
        SavingsGoalFactory(user=user, account=goal.account)


def test_create_goal_returns_progress(auth_client, user):
    account = AccountFactory(user=user, initial_balance=Decimal("25000"))

    response = auth_client.post(
        LIST,
        {"name": "Moto", "account": str(account.pk), "target_amount": "100000"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["account_name"] == account.name
    assert body["currency"] == "XOF"
    assert body["current_amount"] == "25000.00"
    assert body["remaining_amount"] == "75000.00"
    assert body["percent"] == "25.0"
    assert body["is_reached"] is False
    assert body["deadline"] is None


def test_reached_goal_is_capped_at_100_percent(auth_client, user):
    goal = SavingsGoalFactory(
        user=user,
        account=AccountFactory(user=user, initial_balance=Decimal("150000")),
        target_amount=Decimal("100000"),
    )

    body = auth_client.get(detail(goal)).json()

    assert body["current_amount"] == "150000.00"
    assert body["remaining_amount"] == "0.00"
    assert body["percent"] == "100.0"
    assert body["is_reached"] is True


def test_negative_balance_gives_zero_percent(auth_client, user):
    goal = SavingsGoalFactory(
        user=user, account=AccountFactory(user=user, initial_balance=Decimal("-500"))
    )

    body = auth_client.get(detail(goal)).json()

    assert body["percent"] == "0.0"
    assert body["remaining_amount"] == "100500.00"


def test_list_shows_progress_of_each_goal(auth_client, user, other_user):
    SavingsGoalFactory(
        user=user, account=AccountFactory(user=user, initial_balance=Decimal("1000"))
    )
    SavingsGoalFactory(user=other_user)

    body = auth_client.get(LIST).json()

    assert body["count"] == 1
    assert body["results"][0]["current_amount"] == "1000.00"


def test_create_rejects_account_already_used(auth_client, user):
    goal = SavingsGoalFactory(user=user)

    response = auth_client.post(
        LIST,
        {"name": "Autre", "account": str(goal.account_id), "target_amount": "10"},
        format="json",
    )

    assert response.status_code == 400
    assert "account" in response.json()


def test_create_rejects_archived_and_foreign_accounts(auth_client, user, other_user):
    archived = AccountFactory(user=user, is_archived=True)
    foreign = AccountFactory(user=other_user)

    for account in [archived, foreign]:
        response = auth_client.post(
            LIST,
            {"name": "Test", "account": str(account.pk), "target_amount": "10"},
            format="json",
        )
        assert response.status_code == 400
        assert "account" in response.json()

    assert not SavingsGoal.objects.exists()


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"target_amount": "0"}, "target_amount"),
        ({"target_amount": "-1"}, "target_amount"),
        ({"name": ""}, "name"),
        ({"deadline": "2000-01-01"}, "deadline"),
    ],
)
def test_create_validates_fields(auth_client, user, payload, field):
    account = AccountFactory(user=user)
    data = {"name": "Voyage", "account": str(account.pk), "target_amount": "1000", **payload}

    response = auth_client.post(LIST, data, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_past_deadline_is_kept_when_editing_other_fields(auth_client, user):
    goal = SavingsGoalFactory(user=user, deadline=datetime.date(2020, 1, 1))

    response = auth_client.patch(
        detail(goal), {"name": "Renommé", "deadline": "2020-01-01"}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["deadline"] == "2020-01-01"


def test_changing_account_returns_progress_of_new_account(auth_client, user):
    goal = SavingsGoalFactory(user=user)
    new_account = AccountFactory(user=user, initial_balance=Decimal("4000"))

    response = auth_client.patch(detail(goal), {"account": str(new_account.pk)}, format="json")

    assert response.status_code == 200
    assert response.json()["current_amount"] == "4000.00"


def test_goal_of_other_user_is_not_found(auth_client, other_user):
    goal = SavingsGoalFactory(user=other_user)

    assert auth_client.get(detail(goal)).status_code == 404
    assert auth_client.patch(detail(goal), {"name": "x"}, format="json").status_code == 404
    assert auth_client.delete(detail(goal)).status_code == 404


def test_delete_goal_keeps_the_account(auth_client, user):
    goal = SavingsGoalFactory(user=user)

    assert auth_client.delete(detail(goal)).status_code == 204
    assert goal.account.__class__.objects.filter(pk=goal.account_id).exists()


def test_account_with_goal_cannot_be_deleted(auth_client, user):
    goal = SavingsGoalFactory(user=user)

    response = auth_client.delete(reverse("finance:account-detail", args=[goal.account_id]))

    assert response.status_code == 409
    assert "objectif" in response.json()["detail"]


def test_requires_authentication(api_client):
    assert api_client.get(LIST).status_code == 401
