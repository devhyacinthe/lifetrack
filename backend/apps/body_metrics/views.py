from dataclasses import asdict

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.api import (
    CONFLICT_RESPONSE,
    REFERENCE_DATE_PARAMETER,
    UserOwnedViewSet,
    integer_param,
    reference_date,
)

from .filters import MeasurementFilter, MetricTypeFilter
from .models import Measurement, MetricType
from .selectors import metric_series, metric_types_with_latest
from .serializers import MeasurementSerializer, MetricSeriesSerializer, MetricTypeSerializer

DEFAULT_SERIES_MONTHS = 6
MAX_SERIES_MONTHS = 60


@extend_schema_view(destroy=extend_schema(responses={204: None, 409: CONFLICT_RESPONSE}))
@extend_schema(tags=["body"])
class MetricTypeViewSet(UserOwnedViewSet):
    model = MetricType
    serializer_class = MetricTypeSerializer
    filterset_class = MetricTypeFilter
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
    restricted_message = (
        "Ce type de mesure est utilisé par des mesures : désactivez-le au lieu de le supprimer."
    )

    def get_user_queryset(self, user):
        return metric_types_with_latest(user)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "months",
                type=OpenApiTypes.INT,
                description=(
                    f"Nombre de mois calendaires couverts, mois de la date de référence compris "
                    f"(1 à {MAX_SERIES_MONTHS}). Par défaut : {DEFAULT_SERIES_MONTHS}."
                ),
            ),
            REFERENCE_DATE_PARAMETER,
        ],
        responses=MetricSeriesSerializer,
    )
    @action(detail=True, methods=["get"])
    def series(self, request, pk=None):
        """Valeurs enregistrées sur la période, de la plus ancienne à la plus récente."""
        metric_type = self.get_object()
        months = integer_param(
            request, "months", DEFAULT_SERIES_MONTHS, minimum=1, maximum=MAX_SERIES_MONTHS
        )
        series = metric_series(metric_type, reference_date(request), months)
        data = {
            "metric_type": metric_type.pk,
            "name": metric_type.name,
            "unit": metric_type.unit,
            **asdict(series),
        }
        return Response(MetricSeriesSerializer(data).data)


@extend_schema(tags=["body"])
class MeasurementViewSet(UserOwnedViewSet):
    model = Measurement
    serializer_class = MeasurementSerializer
    filterset_class = MeasurementFilter
    search_fields = ["notes"]
    ordering_fields = ["date", "value", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_user_queryset(self, user):
        return Measurement.objects.filter(user=user).select_related("metric_type")
