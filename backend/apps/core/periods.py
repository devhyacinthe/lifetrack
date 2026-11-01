"""Périodes calendaires et dates locales de l'utilisateur (budgets, objectifs, statistiques)."""

import calendar
import datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

WEEKLY = "weekly"
MONTHLY = "monthly"
YEARLY = "yearly"


def period_bounds(period, reference_date):
    """
    Bornes incluses (dates) de la période contenant reference_date.

    Semaine : du lundi au dimanche (ISO 8601). Mois et année : calendaires.
    """
    if period == WEEKLY:
        start = reference_date - datetime.timedelta(days=reference_date.weekday())
        return start, start + datetime.timedelta(days=6)
    if period == MONTHLY:
        start = reference_date.replace(day=1)
        last_day = calendar.monthrange(reference_date.year, reference_date.month)[1]
        return start, reference_date.replace(day=last_day)
    if period == YEARLY:
        return datetime.date(reference_date.year, 1, 1), datetime.date(reference_date.year, 12, 31)
    raise ValueError(f"Période inconnue : {period}")


def user_zone(user):
    return ZoneInfo(user.timezone)


def user_today(user):
    """Date du jour dans le fuseau horaire de l'utilisateur."""
    return timezone.localdate(timezone=user_zone(user))


def local_day_range(user, start_date, end_date):
    """
    Instants [début, fin[ couvrant les journées start_date à end_date (incluses) dans le
    fuseau de l'utilisateur. Sert à filtrer des champs date-heure stockés en UTC.
    """
    zone = user_zone(user)
    start = datetime.datetime.combine(start_date, datetime.time.min, tzinfo=zone)
    end = datetime.datetime.combine(
        end_date + datetime.timedelta(days=1), datetime.time.min, tzinfo=zone
    )
    return start, end


def shift_months(day, months):
    """Premier jour du mois situé `months` mois avant (négatif) ou après celui de `day`."""
    index = day.year * 12 + day.month - 1 + months
    return datetime.date(index // 12, index % 12 + 1, 1)


def period_sequence(period, reference_date, count):
    """
    Les `count` dernières périodes (semaines ou mois), de la plus ancienne à celle qui
    contient reference_date. Chaque élément : (début, fin), bornes incluses.
    """
    if count < 1:
        raise ValueError("count doit être au moins 1.")
    if period == WEEKLY:
        last_start, _ = period_bounds(WEEKLY, reference_date)
        starts = [last_start - datetime.timedelta(weeks=n) for n in range(count - 1, -1, -1)]
    elif period == MONTHLY:
        starts = [shift_months(reference_date, -n) for n in range(count - 1, -1, -1)]
    else:
        raise ValueError(f"Période inconnue : {period}")
    return [period_bounds(period, start) for start in starts]
