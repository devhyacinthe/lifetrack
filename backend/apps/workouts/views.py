from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import (
    CONFLICT_RESPONSE,
    REFERENCE_DATE_PARAMETER,
    ReferenceDateMixin,
    UserOwnedViewSet,
    choice_param,
    integer_param,
    reference_date,
)

from . import services
from .filters import ActivityTypeFilter, WorkoutFilter, WorkoutGoalFilter
from .models import ActivityType, GoalPeriod, Workout, WorkoutGoal
from .selectors import workout_history, workout_stats
from .serializers import (
    ActivityTypeSerializer,
    FinishWorkoutSerializer,
    WorkoutGoalSerializer,
    WorkoutHistorySerializer,
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

    @extend_schema(request=FinishWorkoutSerializer, responses=WorkoutSerializer)
    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """Termine une séance en cours : durée (calculée par défaut), intensité, distance…"""
        workout = self.get_object()
        serializer = FinishWorkoutSerializer(
            data=request.data, context={**self.get_serializer_context(), "workout": workout}
        )
        serializer.is_valid(raise_exception=True)
        workout = services.finish_workout(workout, **serializer.validated_data)
        return Response(WorkoutSerializer(workout, context=self.get_serializer_context()).data)


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
        period = choice_param(request, "period", GoalPeriod.values, GoalPeriod.WEEKLY)
        stats = workout_stats(request.user, period, reference_date(request))
        return Response(WorkoutStatsSerializer(stats).data)


# Par défaut : 8 semaines ou 6 mois (choix de l'utilisateur en phase 11).
DEFAULT_HISTORY_COUNT = {GoalPeriod.WEEKLY: 8, GoalPeriod.MONTHLY: 6}
MAX_HISTORY_COUNT = 52


@extend_schema(
    tags=["workouts"],
    parameters=[
        OpenApiParameter("period", enum=GoalPeriod.values, description="Par défaut : weekly."),
        OpenApiParameter(
            "count",
            type=OpenApiTypes.INT,
            description=(
                f"Nombre de périodes, celle de la date de référence comprise "
                f"(1 à {MAX_HISTORY_COUNT}). Par défaut : 8 semaines ou 6 mois."
            ),
        ),
        REFERENCE_DATE_PARAMETER,
    ],
    responses=WorkoutHistorySerializer,
)
class WorkoutHistoryView(APIView):
    """Séances, durée et distance de plusieurs semaines ou mois, pour les graphiques."""

    def get(self, request):
        period = choice_param(request, "period", GoalPeriod.values, GoalPeriod.WEEKLY)
        count = integer_param(
            request, "count", DEFAULT_HISTORY_COUNT[period], minimum=1, maximum=MAX_HISTORY_COUNT
        )
        periods = workout_history(request.user, period, reference_date(request), count)
        return Response(WorkoutHistorySerializer({"period": period, "periods": periods}).data)
