"""Écritures du suivi sportif."""

from django.db import transaction

from .defaults import DEFAULT_ACTIVITIES
from .models import ActivityType, Workout


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
