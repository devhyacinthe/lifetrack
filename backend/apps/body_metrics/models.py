"""
Mesures corporelles.

Les valeurs sont toujours saisies par l'utilisateur : l'application ne les modifie ni ne
les estime jamais. Une seule valeur par type de mesure et par jour.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class MetricType(TimeStampedModel):
    """Type de mesure propre à l'utilisateur (extensible), avec son unité."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="metric_types"
    )
    name = models.CharField("nom", max_length=60)
    unit = models.CharField("unité", max_length=15)
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        verbose_name = "type de mesure"
        verbose_name_plural = "types de mesure"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="body_metric_type_unique_name"),
        ]

    def __str__(self):
        return f"{self.name} ({self.unit})"


class Measurement(TimeStampedModel):
    """Valeur d'une mesure à une date (date locale de l'utilisateur)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="measurements"
    )
    # RESTRICT : un type utilisé ne peut pas être supprimé seul (il se désactive),
    # mais la suppression de l'utilisateur reste possible.
    metric_type = models.ForeignKey(
        MetricType,
        on_delete=models.RESTRICT,
        related_name="measurements",
        verbose_name="type de mesure",
    )
    date = models.DateField("date")
    value = models.DecimalField("valeur", max_digits=7, decimal_places=2)
    notes = models.CharField("notes", max_length=255, blank=True)

    class Meta:
        verbose_name = "mesure"
        ordering = ["-date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(value__gt=0), name="body_measurement_positive"),
            # Une valeur par type et par jour : une nouvelle saisie modifie l'existante.
            models.UniqueConstraint(
                fields=["metric_type", "date"], name="body_measurement_unique_day"
            ),
        ]

    def __str__(self):
        return f"{self.metric_type.name} {self.value} {self.date}"

    def clean(self):
        if self.metric_type_id and self.metric_type.user_id != self.user_id:
            raise ValidationError({"metric_type": "Type de mesure introuvable."})
