"""Séances en cours puis terminées : démarrage, fin, règles et effets sur les calculs."""

import datetime
from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone

from apps.workouts.models import GoalPeriod, WorkoutStatus
from apps.workouts.selectors import attach_goal_progress, workout_stats

from .factories import ActivityTypeFactory, WorkoutFactory, WorkoutGoalFactory

pytestmark = pytest.mark.django_db

SESSIONS = reverse("workouts:workout-list")
NOW = datetime.datetime(2026, 11, 2, 18, 45, tzinfo=datetime.UTC)


def finish_url(workout):
    return reverse("workouts:workout-finish", args=[workout.pk])


def detail(workout):
    return reverse("workouts:workout-detail", args=[workout.pk])


@pytest.fixture
def frozen_now(monkeypatch):
    monkeypatch.setattr(timezone, "now", lambda: NOW)
    return NOW


def in_progress(user, started_at=NOW - datetime.timedelta(minutes=45), **fields):
    return WorkoutFactory(
        user=user,
        status=WorkoutStatus.IN_PROGRESS,
        started_at=started_at,
        duration_seconds=None,
        intensity=None,
        **fields,
    )


# --- Démarrage ----------------------------------------------------------------------------------


def test_start_session_with_activity_and_start_only(auth_client, user, frozen_now):
    activity = ActivityTypeFactory(user=user)

    response = auth_client.post(
        SESSIONS,
        {"activity": str(activity.pk), "status": "in_progress", "started_at": NOW.isoformat()},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["duration_seconds"] is None
    assert body["intensity"] is None


def test_started_session_cannot_carry_end_values(auth_client, user, frozen_now):
    activity = ActivityTypeFactory(user=user)

    response = auth_client.post(
        SESSIONS,
        {
            "activity": str(activity.pk),
            "status": "in_progress",
            "started_at": NOW.isoformat(),
            "duration_seconds": 600,
            "distance_km": "3",
        },
        format="json",
    )

    assert response.status_code == 400
    assert {"duration_seconds", "distance_km"} <= set(response.json())


def test_only_one_session_in_progress(auth_client, user, frozen_now):
    in_progress(user)
    activity = ActivityTypeFactory(user=user)

    response = auth_client.post(
        SESSIONS,
        {"activity": str(activity.pk), "status": "in_progress", "started_at": NOW.isoformat()},
        format="json",
    )

    assert response.status_code == 400
    assert "status" in response.json()


def test_completed_session_requires_duration_and_intensity(auth_client, user, frozen_now):
    activity = ActivityTypeFactory(user=user)

    response = auth_client.post(
        SESSIONS, {"activity": str(activity.pk), "started_at": NOW.isoformat()}, format="json"
    )

    assert response.status_code == 400
    assert {"duration_seconds", "intensity"} <= set(response.json())


def test_status_cannot_change_through_patch(auth_client, user):
    workout = in_progress(user)

    response = auth_client.patch(detail(workout), {"status": "completed"}, format="json")

    assert response.status_code == 400
    assert "status" in response.json()


def test_in_progress_session_can_be_edited(auth_client, user):
    workout = in_progress(user)

    response = auth_client.patch(detail(workout), {"notes": "Échauffement"}, format="json")

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_database_rejects_inconsistent_status():
    with pytest.raises(IntegrityError), transaction.atomic():
        WorkoutFactory(status=WorkoutStatus.IN_PROGRESS, intensity=None)  # durée renseignée
    with pytest.raises(IntegrityError), transaction.atomic():
        WorkoutFactory(status=WorkoutStatus.COMPLETED, duration_seconds=None)


# --- Fin ----------------------------------------------------------------------------------------


def test_finish_computes_duration_from_start(auth_client, user, frozen_now):
    workout = in_progress(user)

    response = auth_client.post(
        finish_url(workout),
        {"intensity": 7, "distance_km": "6.40", "estimated_calories": 480},
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["duration_seconds"] == 45 * 60
    assert body["intensity"] == 7
    assert body["distance_km"] == "6.40"
    assert body["estimated_calories"] == 480


def test_finish_accepts_corrected_duration(auth_client, user, frozen_now):
    workout = in_progress(user)

    response = auth_client.post(
        finish_url(workout), {"intensity": 5, "duration_seconds": 1800}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["duration_seconds"] == 1800


def test_finish_requires_intensity(auth_client, user, frozen_now):
    workout = in_progress(user)

    response = auth_client.post(finish_url(workout), {}, format="json")

    assert response.status_code == 400
    assert "intensity" in response.json()


def test_finish_after_more_than_24_hours_requires_duration(auth_client, user, frozen_now):
    workout = in_progress(user, started_at=NOW - datetime.timedelta(hours=30))

    without = auth_client.post(finish_url(workout), {"intensity": 5}, format="json")
    with_duration = auth_client.post(
        finish_url(workout), {"intensity": 5, "duration_seconds": 3600}, format="json"
    )

    assert without.status_code == 400
    assert "duration_seconds" in without.json()
    assert with_duration.status_code == 200


def test_finish_twice_is_refused(auth_client, user):
    workout = WorkoutFactory(user=user)

    response = auth_client.post(finish_url(workout), {"intensity": 5}, format="json")

    assert response.status_code == 400
    assert "status" in response.json()


def test_finish_other_user_session_is_not_found(auth_client, other_user):
    workout = in_progress(other_user)

    response = auth_client.post(finish_url(workout), {"intensity": 5}, format="json")

    assert response.status_code == 404


def test_filter_by_status(auth_client, user):
    ongoing = in_progress(user)
    WorkoutFactory(user=user)

    body = auth_client.get(f"{SESSIONS}?status=in_progress").json()

    assert [w["id"] for w in body["results"]] == [str(ongoing.pk)]


# --- Calculs ------------------------------------------------------------------------------------


def test_stats_and_goals_ignore_sessions_in_progress(user):
    day = datetime.date(2026, 11, 2)
    WorkoutFactory(
        user=user,
        started_at=datetime.datetime(2026, 11, 2, 7, tzinfo=datetime.UTC),
        duration_seconds=1200,
    )
    in_progress(user)
    goal = WorkoutGoalFactory(user=user, target_value=Decimal("2"))

    stats = workout_stats(user, GoalPeriod.WEEKLY, day)
    [goal] = attach_goal_progress([goal], user, day)

    assert stats.sessions_count == 1
    assert stats.total_duration_seconds == 1200
    assert goal.progress.current_value == 1
