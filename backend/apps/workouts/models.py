"""
Modèles du suivi sportif.

Les durées sont en secondes et les instants stockés en UTC ; les périodes (semaine, mois)
sont calculées dans le fuseau horaire de l'utilisateur (voir selectors).
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel

MAX_DURATION_SECONDS = 24 * 60 * 60
MIN_INTENSITY = 1
MAX_INTENSITY = 10


class ActivityType(TimeStampedModel):
    """Activité sportive propre à l'utilisateur (extensible). Désactivée si elle sert déjà."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_types"
    )
    name = models.CharField("nom", max_length=60)
    # Indique si la distance a un sens pour cette activité (course, vélo…).
    tracks_distance = models.BooleanField("mesure la distance", default=False)
    is_active = models.BooleanField("active", default=True)

    class Meta:
        verbose_name = "activité"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="workouts_activity_unique_name"),
        ]

    def __str__(self):
        return self.name


class Workout(TimeStampedModel):
    """Séance enregistrée manuellement."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workouts"
    )
    # RESTRICT : une activité utilisée ne peut pas être supprimée seule (elle se désactive),
    # mais la suppression de l'utilisateur reste possible.
    activity = models.ForeignKey(
        ActivityType, on_delete=models.RESTRICT, related_name="workouts", verbose_name="activité"
    )
    started_at = models.DateTimeField("début")
    duration_seconds = models.PositiveIntegerField("durée (secondes)")
    intensity = models.PositiveSmallIntegerField("intensité (1 à 10)")
    distance_km = models.DecimalField(
        "distance (km)", max_digits=7, decimal_places=2, null=True, blank=True
    )
    # Toujours une estimation saisie par l'utilisateur, jamais une mesure exacte.
    estimated_calories = models.PositiveIntegerField("calories estimées", null=True, blank=True)
    notes = models.CharField("notes", max_length=1000, blank=True)

    class Meta:
        verbose_name = "séance"
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "started_at"], name="workouts_user_started")]
        constraints = [
            models.CheckConstraint(
                condition=Q(duration_seconds__gte=1, duration_seconds__lte=MAX_DURATION_SECONDS),
                name="workouts_duration_range",
            ),
            models.CheckConstraint(
                condition=Q(intensity__gte=MIN_INTENSITY, intensity__lte=MAX_INTENSITY),
                name="workouts_intensity_range",
            ),
            models.CheckConstraint(
                condition=Q(distance_km__isnull=True) | Q(distance_km__gt=0),
                name="workouts_distance_positive",
            ),
        ]

    def __str__(self):
        return f"{self.activity} {self.started_at:%Y-%m-%d}"

    def clean(self):
        if self.activity_id and self.activity.user_id != self.user_id:
            raise ValidationError({"activity": "Activité introuvable."})


class GoalMetric(models.TextChoices):
    SESSIONS = "sessions", "Nombre de séances"
    DURATION = "duration", "Durée totale (secondes)"
    DISTANCE = "distance", "Distance totale (km)"


class GoalPeriod(models.TextChoices):
    WEEKLY = "weekly", "Hebdomadaire"
    MONTHLY = "monthly", "Mensuel"


class WorkoutGoal(TimeStampedModel):
    """
    Objectif sportif récurrent : atteindre une valeur (séances, durée ou distance) chaque
    semaine ou chaque mois, pour toutes les activités ou une seule. La progression est
    recalculée à partir des séances (voir selectors.attach_goal_progress).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workout_goals"
    )
    metric = models.CharField("mesure", max_length=10, choices=GoalMetric.choices)
    period = models.CharField("période", max_length=10, choices=GoalPeriod.choices)
    # Vide : toutes les activités.
    activity = models.ForeignKey(
        ActivityType,
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="goals",
        verbose_name="activité",
    )
    # Séances : nombre entier ; durée : secondes (entier) ; distance : kilomètres.
    target_value = models.DecimalField("valeur cible", max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "objectif sportif"
        verbose_name_plural = "objectifs sportifs"
        ordering = ["period", "created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(target_value__gt=0), name="workouts_goal_positive"),
            models.CheckConstraint(
                condition=Q(metric__in=GoalMetric.values), name="workouts_goal_metric_valid"
            ),
            models.CheckConstraint(
                condition=Q(period__in=GoalPeriod.values), name="workouts_goal_period_valid"
            ),
            # Les objectifs « toutes activités » (activité NULL) sont vérifiés par le
            # serializer : MariaDB ne gère pas les contraintes d'unicité conditionnelles.
            models.UniqueConstraint(
                fields=["user", "metric", "period", "activity"], name="workouts_goal_unique"
            ),
        ]

    def __str__(self):
        scope = self.activity.name if self.activity_id else "Toutes activités"
        return f"{scope} : {self.target_value} ({self.get_metric_display()}, {self.period})"

    def clean(self):
        errors = {}
        if self.activity_id and self.activity.user_id != self.user_id:
            errors["activity"] = "Activité introuvable."
        if (
            self.metric in (GoalMetric.SESSIONS, GoalMetric.DURATION)
            and self.target_value is not None
            and self.target_value != self.target_value.to_integral_value()
        ):
            errors["target_value"] = "Cette valeur doit être un nombre entier."
        if errors:
            raise ValidationError(errors)
