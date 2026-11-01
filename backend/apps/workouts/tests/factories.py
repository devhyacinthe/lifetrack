import datetime
from decimal import Decimal

import factory

from apps.users.tests.factories import UserFactory
from apps.workouts.models import ActivityType, GoalMetric, GoalPeriod, Workout, WorkoutGoal

# Jeudi 15 octobre 2026, 7 h UTC (= 7 h à Lomé).
STARTED_AT = datetime.datetime(2026, 10, 15, 7, 0, tzinfo=datetime.UTC)


class ActivityTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ActivityType

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Activité {n}")
    tracks_distance = True


class WorkoutFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workout

    user = factory.SubFactory(UserFactory)
    activity = factory.SubFactory(ActivityTypeFactory, user=factory.SelfAttribute("..user"))
    started_at = STARTED_AT
    duration_seconds = 1800
    intensity = 5


class WorkoutGoalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WorkoutGoal

    user = factory.SubFactory(UserFactory)
    metric = GoalMetric.SESSIONS
    period = GoalPeriod.WEEKLY
    activity = None
    target_value = Decimal("3")
