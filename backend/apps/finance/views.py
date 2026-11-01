from django.db.models import RestrictedError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import filters, serializers, status, viewsets
from rest_framework.response import Response

from .filters import (
    AccountFilter,
    BudgetFilter,
    CategoryFilter,
    TransactionFilter,
    TransferFilter,
)
from .models import Account, Budget, Category, SavingsGoal, Transaction, Transfer
from .selectors import accounts_with_balance, goals_with_progress, user_today
from .serializers import (
    AccountSerializer,
    BudgetSerializer,
    CategorySerializer,
    SavingsGoalSerializer,
    TransactionSerializer,
    TransferSerializer,
)

CONFLICT_RESPONSE = OpenApiResponse(description="Objet utilisé par des opérations.")


class UserOwnedViewSet(viewsets.ModelViewSet):
    """
    Base des ressources privées : chaque requête est limitée aux objets de l'utilisateur.

    Un objet d'un autre utilisateur est donc introuvable (404), quelle que soit l'opération.
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    model = None
    restricted_message = ""

    def get_queryset(self):
        # Génération du schéma OpenAPI : il n'y a pas d'utilisateur réel.
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()
        return self.get_user_queryset(self.request.user)

    def get_user_queryset(self, user):
        raise NotImplementedError

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except RestrictedError:
            return Response({"detail": self.restricted_message}, status=status.HTTP_409_CONFLICT)


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


REFERENCE_DATE_PARAMETER = OpenApiParameter(
    "date",
    type=OpenApiTypes.DATE,
    description=(
        "Date de référence (YYYY-MM-DD) : la consommation est calculée pour la période qui "
        "la contient. Par défaut, aujourd'hui dans le fuseau de l'utilisateur."
    ),
)


@extend_schema_view(
    list=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
    retrieve=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
)
@extend_schema(tags=["finance"])
class BudgetViewSet(UserOwnedViewSet):
    model = Budget
    serializer_class = BudgetSerializer
    filterset_class = BudgetFilter
    ordering_fields = ["period", "amount", "created_at"]
    ordering = ["period", "created_at"]

    def get_user_queryset(self, user):
        return Budget.objects.filter(user=user).select_related("category")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "swagger_fake_view", False) or not self.request:
            return context
        raw = self.request.query_params.get("date")
        if not raw:
            context["reference_date"] = user_today(self.request.user)
            return context
        try:
            context["reference_date"] = serializers.DateField().run_validation(raw)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({"date": exc.detail}) from exc
        return context


@extend_schema(tags=["finance"])
class SavingsGoalViewSet(UserOwnedViewSet):
    model = SavingsGoal
    serializer_class = SavingsGoalSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "deadline", "target_amount", "created_at"]
    ordering = ["created_at"]

    def get_user_queryset(self, user):
        return goals_with_progress(user)
