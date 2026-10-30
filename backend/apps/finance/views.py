from django.db.models import RestrictedError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.response import Response

from .filters import AccountFilter, CategoryFilter, TransactionFilter, TransferFilter
from .models import Account, Category, Transaction, Transfer
from .selectors import accounts_with_balance
from .serializers import (
    AccountSerializer,
    CategorySerializer,
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
    restricted_message = "Ce compte a des opérations : archivez-le au lieu de le supprimer."

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
        "Cette catégorie est utilisée par des transactions : désactivez-la au lieu de la supprimer."
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
