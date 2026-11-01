from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.core.api import (
    CONFLICT_RESPONSE,
    REFERENCE_DATE_PARAMETER,
    ReferenceDateMixin,
    UserOwnedViewSet,
)

from .filters import (
    AccountFilter,
    BudgetFilter,
    CategoryFilter,
    TransactionFilter,
    TransferFilter,
)
from .models import Account, Budget, Category, SavingsGoal, Transaction, Transfer
from .selectors import accounts_with_balance, goals_with_progress
from .serializers import (
    AccountSerializer,
    BudgetSerializer,
    CategorySerializer,
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
