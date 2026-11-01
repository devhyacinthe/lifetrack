"""
Réponse du tableau de bord (lecture seule).

Les listes reprennent les serializers des écrans détaillés : un budget, un objectif, une
transaction ou une séance ont exactement les mêmes champs partout dans l'API.
"""

from rest_framework import serializers

from apps.finance.models import AMOUNT_MAX_DIGITS
from apps.finance.serializers import BudgetSerializer, TransactionSerializer
from apps.workouts.serializers import (
    WorkoutGoalSerializer,
    WorkoutSerializer,
    WorkoutStatsSerializer,
)


def _amount():
    # Totaux de plusieurs montants : quelques chiffres de plus que pour un montant seul.
    return serializers.DecimalField(max_digits=AMOUNT_MAX_DIGITS + 3, decimal_places=2)


class CurrencyBalanceSerializer(serializers.Serializer):
    currency = serializers.CharField()
    balance = _amount()
    accounts_count = serializers.IntegerField()


class FinanceSummarySerializer(serializers.Serializer):
    income = _amount()
    expense = _amount()
    net = _amount()
    balance = _amount()
    accounts_count = serializers.IntegerField()
    other_currencies = CurrencyBalanceSerializer(many=True)


class DashboardSerializer(serializers.Serializer):
    reference_date = serializers.DateField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    currency = serializers.CharField()
    finance = FinanceSummarySerializer()
    budgets = BudgetSerializer(many=True)
    workouts = WorkoutStatsSerializer()
    ongoing_session = WorkoutSerializer(allow_null=True)
    workout_goals = WorkoutGoalSerializer(many=True)
    latest_transactions = TransactionSerializer(many=True)
    latest_sessions = WorkoutSerializer(many=True)
