"""Briques communes des API privées : isolation par utilisateur et validation des modèles."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import RestrictedError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse
from rest_framework import filters, serializers, status, viewsets
from rest_framework.response import Response

from .periods import user_today

CONFLICT_RESPONSE = OpenApiResponse(description="Objet utilisé par d'autres données.")

REFERENCE_DATE_PARAMETER = OpenApiParameter(
    "date",
    type=OpenApiTypes.DATE,
    description=(
        "Date de référence (YYYY-MM-DD) : les valeurs sont calculées pour la période qui "
        "la contient. Par défaut, aujourd'hui dans le fuseau de l'utilisateur."
    ),
)


class OwnedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Clé étrangère limitée aux objets de l'utilisateur connecté (sinon « introuvable »)."""

    default_error_messages = {"does_not_exist": "Objet introuvable."}

    def get_queryset(self):
        return super().get_queryset().filter(user=self.context["request"].user)


class ModelCleanMixin:
    """Applique Model.clean() et convertit ses erreurs au format de l'API."""

    def run_model_clean(self, instance):
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


def reference_date(request):
    """Date de référence du paramètre `date`, ou aujourd'hui dans le fuseau de l'utilisateur."""
    raw = request.query_params.get("date")
    if not raw:
        return user_today(request.user)
    try:
        return serializers.DateField().run_validation(raw)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({"date": exc.detail}) from exc


def integer_param(request, name, default, minimum, maximum):
    """Entier facultatif du paramètre `name`, borné ; erreur 400 sur ce paramètre sinon."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return default
    field = serializers.IntegerField(min_value=minimum, max_value=maximum)
    try:
        return field.run_validation(raw)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({name: exc.detail}) from exc


def choice_param(request, name, choices, default):
    """Valeur facultative du paramètre `name`, parmi `choices` ; erreur 400 sinon."""
    value = request.query_params.get(name) or default
    if value not in choices:
        raise serializers.ValidationError({name: f"Valeurs possibles : {', '.join(choices)}."})
    return value


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


class ReferenceDateMixin:
    """Ajoute au contexte des serializers la date de référence (paramètre `date`)."""

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "swagger_fake_view", False) or not self.request:
            return context
        context["reference_date"] = reference_date(self.request)
        return context
