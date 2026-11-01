from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "workouts"

router = DefaultRouter()
router.include_root_view = False
router.register("activities", views.ActivityTypeViewSet, basename="activity")
router.register("sessions", views.WorkoutViewSet, basename="workout")
router.register("goals", views.WorkoutGoalViewSet, basename="goal")

urlpatterns = [
    path("stats/", views.WorkoutStatsView.as_view(), name="stats"),
    path("stats/history/", views.WorkoutHistoryView.as_view(), name="stats-history"),
    *router.urls,
]
