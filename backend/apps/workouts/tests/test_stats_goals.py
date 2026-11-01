"""Statistiques hebdomadaires et mensuelles, objectifs sportifs et leur progression."""

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.workouts.models import GoalMetric, GoalPeriod, WorkoutGoal
from apps.workouts.selectors import attach_goal_progress, workout_stats

from .factories import ActivityTypeFactory, WorkoutFactory, WorkoutGoalFactory

pytestmark = pytest.mark.django_db

STATS = reverse("workouts:stats")
GOALS = reverse("workouts:goal-list")
DAY = datetime.date(2026, 10, 15)  # jeudi ; semaine du 12 au 18 octobre


def at(day, hour=7):
    return datetime.datetime(2026, 10, day, hour, 0, tzinfo=datetime.UTC)


def goal_detail(goal):
    return reverse("workouts:goal-detail", args=[goal.pk])


# --- Statistiques -----------------------------------------------------------------------------


def test_weekly_stats_count_sessions_time_and_average(user, other_user):
    run = ActivityTypeFactory(user=user, name="Course")
    gym = ActivityTypeFactory(user=user, name="Muscu", tracks_distance=False)
    WorkoutFactory(
        user=user,
        activity=run,
        started_at=at(12),
        duration_seconds=1800,
        distance_km=Decimal("5.20"),
    )
    WorkoutFactory(
        user=user,
        activity=run,
        started_at=at(18, 22),
        duration_seconds=2400,
        distance_km=Decimal("7.00"),
    )
    WorkoutFactory(user=user, activity=gym, started_at=at(14), duration_seconds=3601)
    # Exclues : semaine précédente, semaine suivante, autre utilisateur.
    WorkoutFactory(user=user, activity=run, started_at=at(11, 23))
    WorkoutFactory(user=user, activity=run, started_at=at(19))
    WorkoutFactory(user=other_user, started_at=at(15))

    stats = workout_stats(user, GoalPeriod.WEEKLY, DAY)

    assert (stats.period_start, stats.period_end) == (
        datetime.date(2026, 10, 12),
        datetime.date(2026, 10, 18),
    )
    assert stats.sessions_count == 3
    assert stats.total_duration_seconds == 7801
    assert stats.average_duration_seconds == 2600  # 7801 / 3 = 2600,33 arrondi
    assert stats.total_distance_km == Decimal("12.20")
    assert [(a.activity_name, a.sessions_count) for a in stats.by_activity] == [
        ("Course", 2),
        ("Muscu", 1),
    ]


def test_monthly_stats_and_empty_period_without_invented_values(user):
    WorkoutFactory(user=user, started_at=at(1))
    WorkoutFactory(user=user, started_at=at(31))

    october = workout_stats(user, GoalPeriod.MONTHLY, DAY)
    november = workout_stats(user, GoalPeriod.MONTHLY, datetime.date(2026, 11, 10))

    assert october.sessions_count == 2
    assert november.sessions_count == 0
    assert november.total_duration_seconds == 0
    assert november.average_duration_seconds == 0
    assert november.total_distance_km == Decimal("0")
    assert november.by_activity == []


def test_stats_follow_user_timezone(user):
    # Dimanche 18 octobre à 23 h 30 UTC = lundi 19 à 8 h 30 à Tokyo : semaine suivante.
    WorkoutFactory(user=user, started_at=at(18, 23))
    user.timezone = "Asia/Tokyo"
    user.save()

    assert workout_stats(user, GoalPeriod.WEEKLY, DAY).sessions_count == 0
    next_week = workout_stats(user, GoalPeriod.WEEKLY, datetime.date(2026, 10, 19))
    assert next_week.sessions_count == 1


def test_stats_endpoint(auth_client, user):
    WorkoutFactory(user=user, started_at=at(14), duration_seconds=1200, distance_km=Decimal("3"))

    response = auth_client.get(f"{STATS}?period=weekly&date=2026-10-15")

    assert response.status_code == 200
    body = response.json()
    assert body["period"] == "weekly"
    assert body["period_start"] == "2026-10-12"
    assert body["sessions_count"] == 1
    assert body["total_duration_seconds"] == 1200
    assert body["average_duration_seconds"] == 1200
    assert body["total_distance_km"] == "3.00"
    assert len(body["by_activity"]) == 1


@pytest.mark.parametrize("query", ["period=daily", "date=15-10-2026"])
def test_stats_endpoint_validates_parameters(auth_client, query):
    response = auth_client.get(f"{STATS}?{query}")

    assert response.status_code == 400


def test_stats_endpoint_requires_authentication(api_client):
    assert api_client.get(STATS).status_code == 401


# --- Objectifs : progression -----------------------------------------------------------------


def test_goal_progress_per_metric_and_activity(user, django_assert_num_queries):
    run = ActivityTypeFactory(user=user)
    other = ActivityTypeFactory(user=user)
    WorkoutFactory(
        user=user, activity=run, started_at=at(13), duration_seconds=1800, distance_km=Decimal("5")
    )
    WorkoutFactory(user=user, activity=other, started_at=at(14), duration_seconds=600)
    goals = [
        WorkoutGoalFactory(user=user, metric=GoalMetric.SESSIONS, target_value=Decimal("4")),
        WorkoutGoalFactory(
            user=user, metric=GoalMetric.DURATION, target_value=Decimal("3600"), activity=run
        ),
        WorkoutGoalFactory(
            user=user,
            metric=GoalMetric.DISTANCE,
            target_value=Decimal("20"),
            period=GoalPeriod.MONTHLY,
        ),
    ]

    with django_assert_num_queries(2):  # une requête par type de période
        sessions, duration, distance = attach_goal_progress(goals, user, DAY)

    assert (sessions.progress.current_value, sessions.progress.percent) == (2, Decimal("50.0"))
    assert (duration.progress.current_value, duration.progress.percent) == (1800, Decimal("50.0"))
    assert distance.progress.current_value == Decimal("5")
    assert distance.progress.period_start == datetime.date(2026, 10, 1)
    assert not any(g.progress.is_reached for g in [sessions, duration, distance])


def test_reached_goal_is_capped_at_100_percent(user):
    goal = WorkoutGoalFactory(user=user, target_value=Decimal("1"))
    WorkoutFactory(user=user, started_at=at(13))
    WorkoutFactory(user=user, started_at=at(14))

    [goal] = attach_goal_progress([goal], user, DAY)

    assert goal.progress.current_value == 2
    assert goal.progress.percent == Decimal("100.0")
    assert goal.progress.is_reached is True


# --- Objectifs : API ----------------------------------------------------------------------------


def test_create_goal_returns_progress(auth_client, user):
    WorkoutFactory(user=user, started_at=at(13))

    response = auth_client.post(
        f"{GOALS}?date=2026-10-15",
        {"metric": "sessions", "period": "weekly", "target_value": "3"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["activity"] is None
    assert body["period_start"] == "2026-10-12"
    assert body["current_value"] == "1.00"
    assert body["percent"] == "33.3"
    assert body["is_reached"] is False


def test_goal_is_unique_per_metric_period_and_activity(auth_client, user):
    WorkoutGoalFactory(user=user)

    duplicate = auth_client.post(
        GOALS, {"metric": "sessions", "period": "weekly", "target_value": "5"}, format="json"
    )
    monthly = auth_client.post(
        GOALS, {"metric": "sessions", "period": "monthly", "target_value": "5"}, format="json"
    )

    assert duplicate.status_code == 400
    assert "metric" in duplicate.json()
    assert monthly.status_code == 201


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"metric": "calories"}, "metric"),
        ({"period": "yearly"}, "period"),
        ({"target_value": "0"}, "target_value"),
        ({"target_value": "2.5"}, "target_value"),  # séances : nombre entier
    ],
)
def test_create_goal_validates_fields(auth_client, payload, field):
    data = {"metric": "sessions", "period": "weekly", "target_value": "3", **payload}

    response = auth_client.post(GOALS, data, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_create_goal_rejects_foreign_and_inactive_activities(auth_client, user, other_user):
    for activity in [
        ActivityTypeFactory(user=other_user),
        ActivityTypeFactory(user=user, is_active=False),
    ]:
        response = auth_client.post(
            GOALS,
            {
                "metric": "sessions",
                "period": "weekly",
                "target_value": "3",
                "activity": str(activity.pk),
            },
            format="json",
        )
        assert response.status_code == 400
        assert "activity" in response.json()

    assert not WorkoutGoal.objects.exists()


def test_update_goal_returns_fresh_progress(auth_client, user):
    goal = WorkoutGoalFactory(user=user, target_value=Decimal("4"))
    WorkoutFactory(user=user, started_at=at(13))

    response = auth_client.patch(
        f"{goal_detail(goal)}?date=2026-10-15", {"target_value": "2"}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["percent"] == "50.0"


def test_goal_of_other_user_is_not_found(auth_client, other_user):
    goal = WorkoutGoalFactory(user=other_user)

    assert auth_client.get(goal_detail(goal)).status_code == 404
    assert (
        auth_client.patch(goal_detail(goal), {"target_value": "1"}, format="json").status_code
        == 404
    )
    assert auth_client.delete(goal_detail(goal)).status_code == 404
    assert auth_client.get(GOALS).json()["count"] == 0


def test_delete_goal(auth_client, user):
    goal = WorkoutGoalFactory(user=user)

    assert auth_client.delete(goal_detail(goal)).status_code == 204
