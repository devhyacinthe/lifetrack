"""Suites de périodes utilisées par les statistiques."""

import datetime

import pytest

from apps.core.periods import MONTHLY, WEEKLY, YEARLY, period_sequence, shift_months

D = datetime.date


@pytest.mark.parametrize(
    ("day", "months", "expected"),
    [
        (D(2026, 10, 15), 0, D(2026, 10, 1)),
        (D(2026, 10, 31), -5, D(2026, 5, 1)),
        (D(2026, 2, 28), -2, D(2025, 12, 1)),
        (D(2026, 12, 1), 1, D(2027, 1, 1)),
        (D(2026, 1, 31), -13, D(2024, 12, 1)),
    ],
)
def test_shift_months(day, months, expected):
    assert shift_months(day, months) == expected


def test_weekly_sequence_ends_with_week_of_reference():
    weeks = period_sequence(WEEKLY, D(2026, 10, 15), 3)  # jeudi

    assert weeks == [
        (D(2026, 9, 28), D(2026, 10, 4)),
        (D(2026, 10, 5), D(2026, 10, 11)),
        (D(2026, 10, 12), D(2026, 10, 18)),
    ]


def test_monthly_sequence_handles_month_lengths_and_years():
    months = period_sequence(MONTHLY, D(2026, 3, 31), 4)

    assert months == [
        (D(2025, 12, 1), D(2025, 12, 31)),
        (D(2026, 1, 1), D(2026, 1, 31)),
        (D(2026, 2, 1), D(2026, 2, 28)),
        (D(2026, 3, 1), D(2026, 3, 31)),
    ]


def test_sequence_rejects_invalid_arguments():
    with pytest.raises(ValueError):
        period_sequence(WEEKLY, D(2026, 10, 15), 0)
    with pytest.raises(ValueError):
        period_sequence(YEARLY, D(2026, 10, 15), 2)
