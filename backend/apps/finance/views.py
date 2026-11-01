from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import (
    CONFLICT_RESPONSE,
    REFERENCE_DATE_PARAMETER,
    ReferenceDateMixin,
    UserOwnedViewSet,
    choice_param,
    integer_param,
    reference_date,
)
from apps.core.periods import period_bounds
from apps.core.validators import currency_validator

from .filters import (
    AccountFilter,
    BudgetFilter,
    CategoryFilter,
    TransactionFilter,
    TransferFilter,
)
from .models import (
    Account,
    Budget,
    BudgetPeriod,
    Category,
    SavingsGoal,
    Transaction,
    TransactionType,
    Transfer,
)
from .selectors import accounts_with_balance, category_totals, goals_with_progress, monthly_totals
from .serializers import (
    AccountSerializer,
    BudgetSerializer,
    CategorySerializer,
    CategoryStatsSerializer,
    MonthlyStatsSerializer,
    SavingsGoalSerializer,
    TransactionSerializer,
    TransferSerializer,
)


@extend_schema_view(destroy=extend_schema(responses={204: None, 409: CONFLICT_RESPONSE}))
@extend_schema(tags=["finance"])
class AccountViewSet(UserOwnedViewSet):
    model = Account
    serializer_class = AccountSerializer
    filterset_class = AccountFilter
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
    restricted_message = (
        "Ce compte est utilisé par des opérations ou un objectif d'épargne : "
        "archivez-le au lieu de le supprimer."
    )

    def get_user_queryset(self, user):
        return accounts_with_balance(user)


@extend_schema_view(destroy=extend_schema(responses={204: None, 409: CONFLICT_RESPONSE}))
@extend_schema(tags=["finance"])
class CategoryViewSet(UserOwnedViewSet):
    model = Category
    serializer_class = CategorySerializer
    filterset_class = CategoryFilter
    search_fields = ["name"]
    ordering_fields = ["name", "type", "created_at"]
    ordering = ["type", "name"]
    restricted_message = (
        "Cette catégorie est utilisée par des transactions ou un budget : "
        "désactivez-la au lieu de la supprimer."
    )

    def get_user_queryset(self, user):
        return Category.objects.filter(user=user)


@extend_schema(tags=["finance"])
class TransactionViewSet(UserOwnedViewSet):
    model = Transaction
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_user_queryset(self, user):
        return Transaction.objects.filter(user=user).select_related("account", "category")


@extend_schema(tags=["finance"])
class TransferViewSet(UserOwnedViewSet):
    model = Transfer
    serializer_class = TransferSerializer
    filterset_class = TransferFilter
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_user_queryset(self, user):
        return Transfer.objects.filter(user=user).select_related("from_account", "to_account")


@extend_schema_view(
    list=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
    retrieve=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
)
@extend_schema(tags=["finance"])
class BudgetViewSet(ReferenceDateMixin, UserOwnedViewSet):
    model = Budget
    serializer_class = BudgetSerializer
    filterset_class = BudgetFilter
    ordering_fields = ["period", "amount", "created_at"]
    ordering = ["period", "created_at"]

    def get_user_queryset(self, user):
        return Budget.objects.filter(user=user).select_related("category")


@extend_schema(tags=["finance"])
class SavingsGoalViewSet(UserOwnedViewSet):
    model = SavingsGoal
    serializer_class = SavingsGoalSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "deadline", "target_amount", "created_at"]
    ordering = ["created_at"]

    def get_user_queryset(self, user):
        return goals_with_progress(user)


# --- Statistiques -----------------------------------------------------------------------

DEFAULT_STATS_MONTHS = 6
MAX_STATS_MONTHS = 24

CURRENCY_PARAMETER = OpenApiParameter(
    "currency",
    description=(
        "Devise des comptes pris en compte (code ISO 4217). Par défaut : la devise préférée "
        "de l'utilisateur. Les montants de devises différentes ne s'additionnent pas."
    ),
)


def currency_param(request):
    currency = request.query_params.get("currency") or request.user.preferred_currency
    try:
        currency_validator(currency)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"currency": exc.messages}) from exc
    return currency


@extend_schema(
    tags=["finance"],
    parameters=[
        OpenApiParameter(
            "months",
            type=OpenApiTypes.INT,
            description=(
                f"Nombre de mois calendaires, mois de la date de référence compris "
                f"(1 à {MAX_STATS_MONTHS}). Par défaut : {DEFAULT_STATS_MONTHS}."
            ),
        ),
        CURRENCY_PARAMETER,
        REFERENCE_DATE_PARAMETER,
    ],
    responses=MonthlyStatsSerializer,
)
class MonthlyStatsView(APIView):
    """Revenus, dépenses et solde de chaque mois, du plus ancien au plus récent."""

    def get(self, request):
        months = integer_param(
            request, "months", DEFAULT_STATS_MONTHS, minimum=1, maximum=MAX_STATS_MONTHS
        )
        currency = currency_param(request)
        totals = monthly_totals(request.user, currency, reference_date(request), months)
        return Response(MonthlyStatsSerializer({"currency": currency, "months": totals}).data)


@extend_schema(
    tags=["finance"],
    parameters=[
        OpenApiParameter(
            "type", enum=TransactionType.values, description="Par défaut : expense (dépenses)."
        ),
        OpenApiParameter(
            "period",
            enum=BudgetPeriod.values,
            description="Semaine (lundi-dimanche), mois ou année. Par défaut : monthly.",
        ),
        CURRENCY_PARAMETER,
        REFERENCE_DATE_PARAMETER,
    ],
    responses=CategoryStatsSerializer,
)
class CategoryStatsView(APIView):
    """Répartition des dépenses (ou des revenus) par catégorie sur une période."""

    def get(self, request):
        transaction_type = choice_param(
            request, "type", TransactionType.values, TransactionType.EXPENSE
        )
        period = choice_param(request, "period", BudgetPeriod.values, BudgetPeriod.MONTHLY)
        currency = currency_param(request)
        start, end = period_bounds(period, reference_date(request))
        total, categories = category_totals(request.user, transaction_type, currency, start, end)
        data = {
            "type": transaction_type,
            "currency": currency,
            "period": period,
            "period_start": start,
            "period_end": end,
            "total": total,
            "categories": categories,
        }
        return Response(CategoryStatsSerializer(data).data)
