"""API des activités et des séances : CRUD, validation, filtres et isolation."""

import datetime

import pytest
from django.urls import reverse

from apps.workouts.models import Workout

from .factories import STARTED_AT, ActivityTypeFactory, WorkoutFactory, WorkoutGoalFactory

pytestmark = pytest.mark.django_db

ACTIVITIES = reverse("workouts:activity-list")
SESSIONS = reverse("workouts:workout-list")


def activity_detail(activity):
    return reverse("workouts:activity-detail", args=[activity.pk])


def session_detail(workout):
    return reverse("workouts:workout-detail", args=[workout.pk])


# --- Activités ------------------------------------------------------------------------------


def test_list_activities_returns_defaults_of_user_only(auth_client, other_user):
    ActivityTypeFactory(user=other_user, name="Activité de B")

    body = auth_client.get(f"{ACTIVITIES}?page_size=100").json()

    names = [a["name"] for a in body["results"]]
    assert "Course à pied" in names
    assert "Activité de B" not in names


def test_create_activity_and_reject_duplicate(auth_client):
    created = auth_client.post(
        ACTIVITIES, {"name": "Boxe", "tracks_distance": False}, format="json"
    )
    duplicate = auth_client.post(ACTIVITIES, {"name": "Boxe"}, format="json")

    assert created.status_code == 201
    assert created.json()["is_active"] is True
    assert duplicate.status_code == 400
    assert "name" in duplicate.json()


def test_used_activity_cannot_be_deleted_but_can_be_deactivated(auth_client, user):
    activity = ActivityTypeFactory(user=user)
    WorkoutFactory(user=user, activity=activity)

    delete = auth_client.delete(activity_detail(activity))
    deactivate = auth_client.patch(activity_detail(activity), {"is_active": False}, format="json")

    assert delete.status_code == 409
    assert "désactivez-la" in delete.json()["detail"]
    assert deactivate.status_code == 200


def test_activity_used_by_goal_cannot_be_deleted(auth_client, user):
    activity = ActivityTypeFactory(user=user)
    WorkoutGoalFactory(user=user, activity=activity)

    assert auth_client.delete(activity_detail(activity)).status_code == 409


def test_unused_activity_can_be_deleted(auth_client, user):
    activity = ActivityTypeFactory(user=user)

    assert auth_client.delete(activity_detail(activity)).status_code == 204


# --- Séances ----------------------------------------------------------------------------------


def valid_payload(activity, **overrides):
    return {
        "activity": str(activity.pk),
        "started_at": "2026-10-15T07:00:00Z",
        "duration_seconds": 2700,
        "intensity": 7,
        "distance_km": "8.50",
        "estimated_calories": 520,
        "notes": "Bord de mer",
        **overrides,
    }


def test_create_session(auth_client, user):
    activity = ActivityTypeFactory(user=user, name="Course")

    response = auth_client.post(SESSIONS, valid_payload(activity), format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["activity_name"] == "Course"
    assert body["duration_seconds"] == 2700
    assert body["distance_km"] == "8.50"
    assert body["estimated_calories"] == 520
    assert Workout.objects.get(pk=body["id"]).user == user


def test_create_session_with_only_required_fields(auth_client, user):
    activity = ActivityTypeFactory(user=user)
    payload = valid_payload(activity)
    for optional in ["distance_km", "estimated_calories", "notes"]:
        payload.pop(optional)

    response = auth_client.post(SESSIONS, payload, format="json")

    assert response.status_code == 201
    assert response.json()["distance_km"] is None
    assert response.json()["estimated_calories"] is None


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"duration_seconds": 0}, "duration_seconds"),
        ({"duration_seconds": 86401}, "duration_seconds"),
        ({"intensity": 0}, "intensity"),
        ({"intensity": 11}, "intensity"),
        ({"distance_km": "0"}, "distance_km"),
        ({"distance_km": "1.234"}, "distance_km"),
        ({"estimated_calories": -1}, "estimated_calories"),
        ({"started_at": "2099-01-01T00:00:00Z"}, "started_at"),
        ({"started_at": "pas une date"}, "started_at"),
    ],
)
def test_create_session_validates_fields(auth_client, user, overrides, field):
    activity = ActivityTypeFactory(user=user)

    response = auth_client.post(SESSIONS, valid_payload(activity, **overrides), format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_create_session_rejects_foreign_and_inactive_activities(auth_client, user, other_user):
    foreign = ActivityTypeFactory(user=other_user)
    inactive = ActivityTypeFactory(user=user, is_active=False)

    for activity in [foreign, inactive]:
        response = auth_client.post(SESSIONS, valid_payload(activity), format="json")
        assert response.status_code == 400
        assert "activity" in response.json()

    assert not Workout.objects.exists()


def test_existing_session_keeps_its_deactivated_activity(auth_client, user):
    workout = WorkoutFactory(user=user)
    workout.activity.is_active = False
    workout.activity.save()

    response = auth_client.patch(
        session_detail(workout),
        {"activity": str(workout.activity_id), "intensity": 9},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["intensity"] == 9


def test_sessions_are_listed_newest_first(auth_client, user):
    older = WorkoutFactory(user=user, started_at=STARTED_AT - datetime.timedelta(days=2))
    newer = WorkoutFactory(user=user)

    ids = [w["id"] for w in auth_client.get(SESSIONS).json()["results"]]

    assert ids == [str(newer.pk), str(older.pk)]


def test_date_filters_use_user_timezone(auth_client, user):
    # 31 octobre à 23 h 30 UTC : 1er novembre à Tokyo.
    late = WorkoutFactory(
        user=user, started_at=datetime.datetime(2026, 10, 31, 23, 30, tzinfo=datetime.UTC)
    )
    user.timezone = "Asia/Tokyo"
    user.save()

    november = auth_client.get(f"{SESSIONS}?date_after=2026-11-01").json()
    october = auth_client.get(f"{SESSIONS}?date_before=2026-10-31").json()

    assert [w["id"] for w in november["results"]] == [str(late.pk)]
    assert october["count"] == 0


def test_filters_by_activity_and_intensity(auth_client, user):
    run = WorkoutFactory(user=user, intensity=8)
    WorkoutFactory(user=user, intensity=3)

    by_activity = auth_client.get(f"{SESSIONS}?activity={run.activity_id}").json()
    intense = auth_client.get(f"{SESSIONS}?intensity_min=7").json()

    assert [w["id"] for w in by_activity["results"]] == [str(run.pk)]
    assert [w["id"] for w in intense["results"]] == [str(run.pk)]


def test_session_of_other_user_is_not_found(auth_client, other_user):
    workout = WorkoutFactory(user=other_user)

    assert auth_client.get(session_detail(workout)).status_code == 404
    assert (
        auth_client.patch(session_detail(workout), {"intensity": 1}, format="json").status_code
        == 404
    )
    assert auth_client.delete(session_detail(workout)).status_code == 404
    assert auth_client.get(SESSIONS).json()["count"] == 0


def test_delete_session(auth_client, user):
    workout = WorkoutFactory(user=user)

    assert auth_client.delete(session_detail(workout)).status_code == 204
    assert not Workout.objects.filter(pk=workout.pk).exists()


def test_requires_authentication(api_client):
    assert api_client.get(SESSIONS).status_code == 401
    assert api_client.get(ACTIVITIES).status_code == 401
