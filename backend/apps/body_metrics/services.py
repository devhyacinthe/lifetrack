"""Écritures des mesures corporelles."""

from django.db import transaction

from .defaults import DEFAULT_METRIC_TYPES
from .models import MetricType


@transaction.atomic
def setup_default_metric_types(user):
    """Crée les types de mesure initiaux d'un nouvel utilisateur."""
    MetricType.objects.bulk_create(
        [MetricType(user=user, name=name, unit=unit) for name, unit in DEFAULT_METRIC_TYPES]
    )
