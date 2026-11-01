from django.contrib import admin

from .models import ActivityType, Workout, WorkoutGoal


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "tracks_distance", "is_active"]
    list_filter = ["tracks_distance", "is_active"]
    search_fields = ["name", "user__email"]


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ["started_at", "user", "activity", "duration_seconds", "intensity"]
    list_filter = ["intensity"]
    search_fields = ["notes", "user__email"]
    date_hierarchy = "started_at"
    list_select_related = ["user", "activity"]


@admin.register(WorkoutGoal)
class WorkoutGoalAdmin(admin.ModelAdmin):
    list_display = ["__str__", "user", "metric", "period", "target_value"]
    list_filter = ["metric", "period"]
    list_select_related = ["user", "activity"]
