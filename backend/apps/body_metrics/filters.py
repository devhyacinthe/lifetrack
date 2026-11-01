import django_filters

from .models import Measurement, MetricType

# Le filtre par type prend un UUID sans vérifier qu'il existe : un identifiant appartenant
# à un autre utilisateur donne une liste vide, sans révéler son existence.


class MetricTypeFilter(django_filters.FilterSet):
    class Meta:
        model = MetricType
        fields = ["is_active"]


class MeasurementFilter(django_filters.FilterSet):
    metric_type = django_filters.UUIDFilter(field_name="metric_type_id")
    date_after = django_filters.DateFilter(
        field_name="date", lookup_expr="gte", label="À partir du"
    )
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte", label="Jusqu'au")

    class Meta:
        model = Measurement
        fields = []
