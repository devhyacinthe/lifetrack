"""Activités initiales, contraintes en base et règles des modèles."""

import importlib
from decimal import Decimal

import pytest
from django.apps import apps as django_apps
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.users.tests.factories import UserFactory
from apps.workouts.defaults import DEFAULT_ACTIVITIES
from apps.workouts.models import GoalMetric

from .factories import ActivityTypeFactory, WorkoutFactory, WorkoutGoalFactory

pytestmark = pytest.mark.django_db


def test_new_user_receives_default_activities():
    user = UserFactory()

    names = set(user.activity_types.values_list("name", flat=True))

    assert names == {name for name, _ in DEFAULT_ACTIVITIES}
    assert user.activity_types.get(name="Course à pied").tracks_distance is True
    assert user.activity_types.get(name="Musculation").tracks_distance is False


def test_default_activities_are_not_duplicated_on_user_update():
    user = UserFactory()
    user.first_name = "Kofi"
    user.save()

    assert user.activity_types.count() == len(DEFAULT_ACTIVITIES)


def test_data_migration_backfills_users_created_before_workouts():
    user = UserFactory()
    user.activity_types.all().delete()
    already_set_up = UserFactory()
    migration = importlib.import_module(
        "apps.workouts.migrations.0002_default_activities_for_existing_users"
    )

    migration.create_default_activities(django_apps, schema_editor=None)
    migration.create_default_activities(django_apps, schema_editor=None)  # idempotente

    assert user.activity_types.count() == len(DEFAULT_ACTIVITIES)
    assert already_set_up.activity_types.count() == len(DEFAULT_ACTIVITIES)


@pytest.mark.parametrize(
    "fields",
    [
        {"duration_seconds": 0},
        {"duration_seconds": 24 * 3600 + 1},
        {"intensity": 0},
        {"intensity": 11},
        {"distance_km": 0},
    ],
)
def test_database_rejects_invalid_workouts(fields):
    with pytest.raises(IntegrityError), transaction.atomic():
        WorkoutFactory(**fields)


def test_database_rejects_duplicate_activity_name():
    activity = ActivityTypeFactory()

    with pytest.raises(IntegrityError):
        ActivityTypeFactory(user=activity.user, name=activity.name)


def test_workout_clean_rejects_activity_of_other_user():
    workout = WorkoutFactory.build(user=UserFactory(), activity=ActivityTypeFactory())

    with pytest.raises(ValidationError) as exc:
        workout.clean()

    assert "activity" in exc.value.message_dict


def test_goal_clean_requires_integer_sessions_and_duration():
    user = UserFactory()
    for metric in [GoalMetric.SESSIONS, GoalMetric.DURATION]:
        goal = WorkoutGoalFactory.build(user=user, metric=metric, target_value=Decimal("2.5"))
        with pytest.raises(ValidationError):
            goal.clean()

    WorkoutGoalFactory.build(
        user=user, metric=GoalMetric.DISTANCE, target_value=Decimal("2.5")
    ).clean()


def test_deleting_user_deletes_all_workout_data():
    user = UserFactory()
    activity = ActivityTypeFactory(user=user)
    WorkoutFactory(user=user, activity=activity)
    WorkoutGoalFactory(user=user, activity=activity)

    user.delete()

    assert not activity.__class__.objects.filter(user_id=user.pk).exists()
