from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import (
    CONFLICT_RESPONSE,
    REFERENCE_DATE_PARAMETER,
    ReferenceDateMixin,
    UserOwnedViewSet,
    reference_date,
)

from .filters import ActivityTypeFilter, WorkoutFilter, WorkoutGoalFilter
from .models import ActivityType, GoalPeriod, Workout, WorkoutGoal
from .selectors import workout_stats
from .serializers import (
    ActivityTypeSerializer,
    WorkoutGoalSerializer,
    WorkoutSerializer,
    WorkoutStatsSerializer,
)


@extend_schema_view(destroy=extend_schema(responses={204: None, 409: CONFLICT_RESPONSE}))
@extend_schema(tags=["workouts"])
class ActivityTypeViewSet(UserOwnedViewSet):
    model = ActivityType
    serializer_class = ActivityTypeSerializer
    filterset_class = ActivityTypeFilter
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]
    restricted_message = (
        "Cette activité est utilisée par des séances ou un objectif : "
        "désactivez-la au lieu de la supprimer."
    )

    def get_user_queryset(self, user):
        return ActivityType.objects.filter(user=user)


@extend_schema(tags=["workouts"])
class WorkoutViewSet(UserOwnedViewSet):
    model = Workout
    serializer_class = WorkoutSerializer
    filterset_class = WorkoutFilter
    search_fields = ["notes"]
    ordering_fields = ["started_at", "duration_seconds", "intensity", "distance_km"]
    ordering = ["-started_at"]

    def get_user_queryset(self, user):
        return Workout.objects.filter(user=user).select_related("activity")


@extend_schema_view(
    list=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
    retrieve=extend_schema(parameters=[REFERENCE_DATE_PARAMETER]),
)
@extend_schema(tags=["workouts"])
class WorkoutGoalViewSet(ReferenceDateMixin, UserOwnedViewSet):
    model = WorkoutGoal
    serializer_class = WorkoutGoalSerializer
    filterset_class = WorkoutGoalFilter
    ordering_fields = ["period", "metric", "created_at"]
    ordering = ["period", "created_at"]

    def get_user_queryset(self, user):
        return WorkoutGoal.objects.filter(user=user).select_related("activity")


@extend_schema(
    tags=["workouts"],
    parameters=[
        OpenApiParameter(
            "period",
            enum=GoalPeriod.values,
            description="Semaine (lundi-dimanche) ou mois calendaire. Par défaut : weekly.",
        ),
        REFERENCE_DATE_PARAMETER,
    ],
    responses=WorkoutStatsSerializer,
)
class WorkoutStatsView(APIView):
    """Statistiques sportives d'une semaine ou d'un mois, dans le fuseau de l'utilisateur."""

    def get(self, request):
        period = request.query_params.get("period", GoalPeriod.WEEKLY)
        if period not in GoalPeriod.values:
            raise serializers.ValidationError(
                {"period": f"Valeurs possibles : {', '.join(GoalPeriod.values)}."}
            )
        stats = workout_stats(request.user, period, reference_date(request))
        return Response(WorkoutStatsSerializer(stats).data)
