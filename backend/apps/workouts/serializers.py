import datetime
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.core.api import ModelCleanMixin, OwnedPrimaryKeyRelatedField

from . import services
from .models import (
    MAX_DURATION_SECONDS,
    MAX_INTENSITY,
    MIN_INTENSITY,
    ActivityType,
    GoalPeriod,
    Workout,
    WorkoutGoal,
)
from .selectors import attach_goal_progress

# Tolérance pour l'horloge du téléphone : une séance ne peut pas commencer dans le futur.
FUTURE_TOLERANCE = datetime.timedelta(minutes=5)
MAX_ESTIMATED_CALORIES = 20000
MIN_POSITIVE = Decimal("0.01")


# --- Activités ----------------------------------------------------------------------------


class ActivityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityType
        fields = ["id", "name", "tracks_distance", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        user = self.context["request"].user
        duplicates = ActivityType.objects.filter(user=user, name=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Une activité porte déjà ce nom.")
        return value

    def create(self, validated_data):
        return ActivityType.objects.create(user=self.context["request"].user, **validated_data)


# --- Séances --------------------------------------------------------------------------------


class WorkoutSerializer(ModelCleanMixin, serializers.ModelSerializer):
    activity = OwnedPrimaryKeyRelatedField(queryset=ActivityType.objects.all())
    activity_name = serializers.CharField(source="activity.name", read_only=True)
    duration_seconds = serializers.IntegerField(min_value=1, max_value=MAX_DURATION_SECONDS)
    intensity = serializers.IntegerField(min_value=MIN_INTENSITY, max_value=MAX_INTENSITY)
    distance_km = serializers.DecimalField(
        max_digits=7,
        decimal_places=2,
        min_value=MIN_POSITIVE,
        required=False,
        allow_null=True,
    )
    estimated_calories = serializers.IntegerField(
        min_value=0,
        max_value=MAX_ESTIMATED_CALORIES,
        required=False,
        allow_null=True,
        help_text="Estimation saisie par l'utilisateur : ce n'est jamais une mesure exacte.",
    )

    class Meta:
        model = Workout
        fields = [
            "id",
            "activity",
            "activity_name",
            "started_at",
            "duration_seconds",
            "intensity",
            "distance_km",
            "estimated_calories",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_started_at(self, value):
        if value > timezone.now() + FUTURE_TOLERANCE:
            raise serializers.ValidationError("Une séance ne peut pas commencer dans le futur.")
        return value

    def validate(self, attrs):
        activity = attrs.get("activity")
        # Une activité désactivée reste valable pour l'historique, pas pour une nouvelle séance.
        if (
            activity
            and not activity.is_active
            and activity != getattr(self.instance, "activity", None)
        ):
            raise serializers.ValidationError({"activity": "Cette activité est désactivée."})

        candidate = Workout(user=self.context["request"].user)
        if self.instance:
            candidate.activity = self.instance.activity
        for field, value in attrs.items():
            setattr(candidate, field, value)
        self.run_model_clean(candidate)
        return attrs

    def create(self, validated_data):
        return services.create_workout(self.context["request"].user, **validated_data)


# --- Objectifs ------------------------------------------------------------------------------


class WorkoutGoalListSerializer(serializers.ListSerializer):
    """Calcule la progression de toute la page en quelques requêtes (voir selectors)."""

    def to_representation(self, data):
        goals = attach_goal_progress(
            data.all() if hasattr(data, "all") else data,
            self.context["request"].user,
            self.context["reference_date"],
        )
        return super().to_representation(goals)


class WorkoutGoalSerializer(ModelCleanMixin, serializers.ModelSerializer):
    activity = OwnedPrimaryKeyRelatedField(
        queryset=ActivityType.objects.all(), required=False, allow_null=True
    )
    activity_name = serializers.CharField(source="activity.name", read_only=True, allow_null=True)
    target_value = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=MIN_POSITIVE)
    # Progression de la période contenant la date de référence (calculée, jamais stockée).
    period_start = serializers.DateField(source="progress.period_start", read_only=True)
    period_end = serializers.DateField(source="progress.period_end", read_only=True)
    current_value = serializers.DecimalField(
        source="progress.current_value", max_digits=14, decimal_places=2, read_only=True
    )
    percent = serializers.DecimalField(
        source="progress.percent", max_digits=4, decimal_places=1, read_only=True
    )
    is_reached = serializers.BooleanField(source="progress.is_reached", read_only=True)

    class Meta:
        model = WorkoutGoal
        list_serializer_class = WorkoutGoalListSerializer
        fields = [
            "id",
            "metric",
            "period",
            "activity",
            "activity_name",
            "target_value",
            "period_start",
            "period_end",
            "current_value",
            "percent",
            "is_reached",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        user = self.context["request"].user
        activity = attrs.get("activity")
        if (
            activity
            and not activity.is_active
            and activity != getattr(self.instance, "activity", None)
        ):
            raise serializers.ValidationError({"activity": "Cette activité est désactivée."})

        candidate = WorkoutGoal(user=user)
        if self.instance:
            for field in ["metric", "period", "activity", "target_value"]:
                setattr(candidate, field, getattr(self.instance, field))
        for field, value in attrs.items():
            setattr(candidate, field, value)
        self.run_model_clean(candidate)

        # Un seul objectif par mesure, période et activité (ou toutes activités).
        duplicates = WorkoutGoal.objects.filter(
            user=user,
            metric=candidate.metric,
            period=candidate.period,
            activity=candidate.activity,
        )
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {"metric": "Un objectif existe déjà pour cette mesure, période et activité."}
            )
        return attrs

    def create(self, validated_data):
        return WorkoutGoal.objects.create(user=self.context["request"].user, **validated_data)

    def update(self, instance, validated_data):
        goal = super().update(instance, validated_data)
        goal.__dict__.pop("progress", None)
        return goal

    def to_representation(self, instance):
        if not hasattr(instance, "progress"):
            attach_goal_progress(
                [instance], self.context["request"].user, self.context["reference_date"]
            )
        return super().to_representation(instance)


# --- Statistiques (lecture seule, pour le schéma OpenAPI) ----------------------------------


class ActivityStatsSerializer(serializers.Serializer):
    activity = serializers.UUIDField(source="activity_id")
    activity_name = serializers.CharField()
    sessions_count = serializers.IntegerField()
    total_duration_seconds = serializers.IntegerField()
    total_distance_km = serializers.DecimalField(max_digits=12, decimal_places=2)


class WorkoutStatsSerializer(serializers.Serializer):
    period = serializers.ChoiceField(choices=GoalPeriod.choices)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    sessions_count = serializers.IntegerField()
    total_duration_seconds = serializers.IntegerField()
    average_duration_seconds = serializers.IntegerField()
    total_distance_km = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_activity = ActivityStatsSerializer(many=True)
