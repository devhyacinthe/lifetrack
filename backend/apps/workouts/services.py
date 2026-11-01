"""Écritures du suivi sportif."""

from django.db import transaction

from .defaults import DEFAULT_ACTIVITIES
from .models import ActivityType, Workout, WorkoutStatus


@transaction.atomic
def setup_default_activities(user):
    """Crée les activités initiales d'un nouvel utilisateur."""
    ActivityType.objects.bulk_create(
        [
            ActivityType(user=user, name=name, tracks_distance=tracks_distance)
            for name, tracks_distance in DEFAULT_ACTIVITIES
        ]
    )


@transaction.atomic
def create_workout(user, **data):
    workout = Workout(user=user, **data)
    workout.full_clean()
    workout.save()
    return workout


@transaction.atomic
def finish_workout(workout, **data):
    """Termine une séance en cours avec les valeurs mesurées à la fin."""
    workout = Workout.objects.select_for_update().get(pk=workout.pk)
    for field, value in data.items():
        setattr(workout, field, value)
    workout.status = WorkoutStatus.COMPLETED
    workout.full_clean()
    workout.save()
    return workout
