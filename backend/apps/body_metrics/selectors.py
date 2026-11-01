"""Lectures et calculs des mesures corporelles (dernière valeur, séries pour les graphiques)."""

import datetime
from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Count, OuterRef, Subquery

from apps.core.periods import shift_months

from .models import Measurement, MetricType


def metric_types_with_latest(user):
    """Types de l'utilisateur, avec leur dernière valeur, sa date et le nombre de mesures."""
    latest = Measurement.objects.filter(metric_type=OuterRef("pk")).order_by("-date")
    return MetricType.objects.filter(user=user).annotate(
        latest_value=Subquery(latest.values("value")[:1]),
        latest_date=Subquery(latest.values("date")[:1]),
        measurements_count=Count("measurements"),
    )


@dataclass(frozen=True)
class SeriesPoint:
    date: datetime.date
    value: Decimal


@dataclass(frozen=True)
class MetricSeries:
    start_date: datetime.date
    end_date: datetime.date
    points: list
    minimum: Decimal | None
    maximum: Decimal | None
    first: Decimal | None
    last: Decimal | None
    change: Decimal | None


def metric_series(metric_type, reference_date, months):
    """
    Valeurs d'un type de mesure, de la plus ancienne à la plus récente, du premier jour du
    mois situé `months - 1` mois avant reference_date jusqu'à reference_date incluse.

    Seules les mesures enregistrées sont renvoyées : aucune valeur n'est interpolée.
    Sans mesure, le résumé est vide (None).
    """
    start = shift_months(reference_date, -(months - 1))
    points = [
        SeriesPoint(date=day, value=value)
        for day, value in metric_type.measurements.filter(date__gte=start, date__lte=reference_date)
        .order_by("date")
        .values_list("date", "value")
    ]
    values = [point.value for point in points]
    return MetricSeries(
        start_date=start,
        end_date=reference_date,
        points=points,
        minimum=min(values, default=None),
        maximum=max(values, default=None),
        first=values[0] if values else None,
        last=values[-1] if values else None,
        change=values[-1] - values[0] if values else None,
    )
