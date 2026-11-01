import django_filters

from apps.core.periods import local_day_range

from .models import ActivityType, Workout, WorkoutGoal

# Les filtres par activité prennent un UUID sans vérifier qu'il existe : un identifiant
# appartenant à un autre utilisateur donne une liste vide, sans révéler son existence.


class ActivityTypeFilter(django_filters.FilterSet):
    class Meta:
        model = ActivityType
        fields = ["is_active", "tracks_distance"]


class WorkoutFilter(django_filters.FilterSet):
    activity = django_filters.UUIDFilter(field_name="activity_id")
    # Dates locales (fuseau de l'utilisateur), bornes incluses.
    date_after = django_filters.DateFilter(method="filter_date_after", label="À partir du")
    date_before = django_filters.DateFilter(method="filter_date_before", label="Jusqu'au")
    intensity_min = django_filters.NumberFilter(field_name="intensity", lookup_expr="gte")
    intensity_max = django_filters.NumberFilter(field_name="intensity", lookup_expr="lte")

    class Meta:
        model = Workout
        fields = []

    def filter_date_after(self, queryset, name, value):
        start, _ = local_day_range(self.request.user, value, value)
        return queryset.filter(started_at__gte=start)

    def filter_date_before(self, queryset, name, value):
        _, end = local_day_range(self.request.user, value, value)
        return queryset.filter(started_at__lt=end)


class WorkoutGoalFilter(django_filters.FilterSet):
    activity = django_filters.UUIDFilter(field_name="activity_id")

    class Meta:
        model = WorkoutGoal
        fields = ["metric", "period"]
