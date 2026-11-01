"""Historique multi-périodes des séances (graphiques de l'écran Statistiques)."""

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.workouts.models import GoalPeriod, WorkoutStatus
from apps.workouts.selectors import workout_history

from .factories import WorkoutFactory

pytestmark = pytest.mark.django_db

HISTORY = reverse("workouts:stats-history")
DAY = datetime.date(2026, 10, 15)  # jeudi ; semaine du 12 au 18 octobre


def at(month, day, hour=7):
    return datetime.datetime(2026, month, day, hour, 0, tzinfo=datetime.UTC)


def test_weekly_history_buckets_sessions_with_zero_weeks(user):
    WorkoutFactory(
        user=user, started_at=at(10, 12), duration_seconds=1800, distance_km=Decimal("5")
    )
    WorkoutFactory(user=user, started_at=at(10, 18, 20), duration_seconds=600, distance_km=None)
    WorkoutFactory(user=user, started_at=at(9, 28), duration_seconds=3600)
    WorkoutFactory(user=user, started_at=at(9, 27))  # semaine précédant la période

    weeks = workout_history(user, GoalPeriod.WEEKLY, DAY, count=3)

    assert [(w.period_start, w.sessions_count, w.total_duration_seconds) for w in weeks] == [
        (datetime.date(2026, 9, 28), 1, 3600),
        (datetime.date(2026, 10, 5), 0, 0),
        (datetime.date(2026, 10, 12), 2, 2400),
    ]
    assert weeks[-1].total_distance_km == Decimal("5")
    assert weeks[1].total_distance_km == Decimal("0")


def test_history_ignores_sessions_in_progress_and_other_users(user, other_user):
    WorkoutFactory(user=user, started_at=at(10, 13))
    WorkoutFactory(
        user=user,
        started_at=at(10, 14),
        status=WorkoutStatus.IN_PROGRESS,
        duration_seconds=None,
        intensity=None,
    )
    WorkoutFactory(user=other_user, started_at=at(10, 13))

    week = workout_history(user, GoalPeriod.WEEKLY, DAY, count=1)[0]

    assert week.sessions_count == 1


def test_history_uses_local_dates_of_user(user):
    # Dimanche 18 octobre, 20 h UTC = lundi 19 octobre, 5 h à Tokyo : semaine suivante.
    user.timezone = "Asia/Tokyo"
    user.save()
    WorkoutFactory(user=user, started_at=at(10, 18, 20))

    weeks = workout_history(user, GoalPeriod.WEEKLY, datetime.date(2026, 10, 19), count=2)

    assert [w.sessions_count for w in weeks] == [0, 1]


def test_history_endpoint_defaults(auth_client, user):
    WorkoutFactory(user=user, started_at=at(10, 13), duration_seconds=2700)

    weekly = auth_client.get(f"{HISTORY}?date=2026-10-15").json()
    monthly = auth_client.get(f"{HISTORY}?period=monthly&date=2026-10-15").json()

    assert weekly["period"] == "weekly"
    assert len(weekly["periods"]) == 8
    assert weekly["periods"][-1] == {
        "period_start": "2026-10-12",
        "period_end": "2026-10-18",
        "sessions_count": 1,
        "total_duration_seconds": 2700,
        "total_distance_km": "0.00",
    }
    assert len(monthly["periods"]) == 6
    assert monthly["periods"][0]["period_start"] == "2026-05-01"
    assert monthly["periods"][-1]["sessions_count"] == 1


@pytest.mark.parametrize("query", ["period=daily", "count=0", "count=53", "count=x"])
def test_history_endpoint_validates_parameters(auth_client, query):
    response = auth_client.get(f"{HISTORY}?{query}")

    assert response.status_code == 400
    assert query.split("=")[0] in response.json()
