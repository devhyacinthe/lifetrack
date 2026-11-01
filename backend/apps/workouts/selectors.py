"""Lectures et calculs du suivi sportif (statistiques, progression des objectifs)."""

import datetime
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, Sum

from apps.core.periods import local_day_range, period_bounds

from .models import GoalMetric, Workout

ZERO = Decimal("0")


def workouts_in_period(user, start_date, end_date):
    """Séances de l'utilisateur commencées entre deux dates locales (incluses)."""
    start, end = local_day_range(user, start_date, end_date)
    return Workout.objects.filter(user=user, started_at__gte=start, started_at__lt=end)


def _totals_by_activity(queryset):
    """{activity_id: (séances, durée en secondes, distance en km)} en une requête."""
    rows = (
        queryset.order_by()
        .values("activity_id")
        .annotate(
            sessions=Count("id"),
            duration=Sum("duration_seconds"),
            distance=Sum("distance_km"),
        )
    )
    return {
        row["activity_id"]: (row["sessions"], row["duration"] or 0, row["distance"] or ZERO)
        for row in rows
    }


# --- Statistiques -----------------------------------------------------------------------


@dataclass(frozen=True)
class ActivityStats:
    activity_id: object
    activity_name: str
    sessions_count: int
    total_duration_seconds: int
    total_distance_km: Decimal


@dataclass(frozen=True)
class WorkoutStats:
    period: str
    period_start: datetime.date
    period_end: datetime.date
    sessions_count: int
    total_duration_seconds: int
    average_duration_seconds: int
    total_distance_km: Decimal
    by_activity: list


def workout_stats(user, period, reference_date):
    """
    Statistiques de la semaine ou du mois contenant reference_date, dans le fuseau de
    l'utilisateur : nombre de séances, durée totale et moyenne, distance, détail par activité.

    Une période sans séance renvoie des zéros (aucune valeur inventée).
    """
    start, end = period_bounds(period, reference_date)
    queryset = workouts_in_period(user, start, end)
    totals = _totals_by_activity(queryset)

    names = dict(user.activity_types.filter(pk__in=totals.keys()).values_list("pk", "name"))
    by_activity = sorted(
        (
            ActivityStats(
                activity_id=activity_id,
                activity_name=names.get(activity_id, ""),
                sessions_count=sessions,
                total_duration_seconds=duration,
                total_distance_km=distance,
            )
            for activity_id, (sessions, duration, distance) in totals.items()
        ),
        key=lambda item: (-item.total_duration_seconds, item.activity_name),
    )
    sessions = sum(item.sessions_count for item in by_activity)
    duration = sum(item.total_duration_seconds for item in by_activity)
    distance = sum((item.total_distance_km for item in by_activity), ZERO)
    average = (
        int((Decimal(duration) / sessions).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        if sessions
        else 0
    )
    return WorkoutStats(
        period=period,
        period_start=start,
        period_end=end,
        sessions_count=sessions,
        total_duration_seconds=duration,
        average_duration_seconds=average,
        total_distance_km=distance,
        by_activity=by_activity,
    )


# --- Objectifs ----------------------------------------------------------------------------


@dataclass(frozen=True)
class GoalProgress:
    period_start: datetime.date
    period_end: datetime.date
    current_value: Decimal
    percent: Decimal
    is_reached: bool


def _metric_value(metric, sessions, duration, distance):
    if metric == GoalMetric.SESSIONS:
        return Decimal(sessions)
    if metric == GoalMetric.DURATION:
        return Decimal(duration)
    return distance


def attach_goal_progress(goals, user, reference_date):
    """
    Calcule la progression de chaque objectif pour la période contenant reference_date et
    l'attache à l'attribut `progress`. Une requête SQL par type de période présent.
    """
    goals = list(goals)
    totals_by_period = {}
    for period in {goal.period for goal in goals}:
        start, end = period_bounds(period, reference_date)
        totals_by_period[period] = (
            start,
            end,
            _totals_by_activity(workouts_in_period(user, start, end)),
        )

    for goal in goals:
        start, end, totals = totals_by_period[goal.period]
        if goal.activity_id:
            sessions, duration, distance = totals.get(goal.activity_id, (0, 0, ZERO))
        else:
            sessions = sum(t[0] for t in totals.values())
            duration = sum(t[1] for t in totals.values())
            distance = sum((t[2] for t in totals.values()), ZERO)
        current = _metric_value(goal.metric, sessions, duration, distance)
        percent = (current * 100 / goal.target_value).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )
        goal.progress = GoalProgress(
            period_start=start,
            period_end=end,
            current_value=current,
            percent=min(percent, Decimal("100.0")),
            is_reached=current >= goal.target_value,
        )
    return goals
