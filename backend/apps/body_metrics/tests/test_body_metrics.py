"""Mesures corporelles : modèles, API, isolation et séries pour les graphiques."""

import datetime
from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from django.urls import reverse

from apps.body_metrics.defaults import DEFAULT_METRIC_TYPES
from apps.body_metrics.models import Measurement, MetricType
from apps.body_metrics.selectors import metric_series
from apps.users.tests.factories import UserFactory

from .factories import MeasurementFactory, MetricTypeFactory

pytestmark = pytest.mark.django_db

TYPES = reverse("body_metrics:metric-type-list")
MEASUREMENTS = reverse("body_metrics:measurement-list")
DAY = datetime.date(2026, 10, 15)


def type_detail(metric_type):
    return reverse("body_metrics:metric-type-detail", args=[metric_type.pk])


def measurement_detail(measurement):
    return reverse("body_metrics:measurement-detail", args=[measurement.pk])


def series_url(metric_type, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return f"{reverse('body_metrics:metric-type-series', args=[metric_type.pk])}?{query}"


# --- Modèles ------------------------------------------------------------------------------


def test_new_user_receives_default_metric_types():
    user = UserFactory()

    assert sorted(user.metric_types.values_list("name", "unit")) == sorted(DEFAULT_METRIC_TYPES)


def test_database_rejects_zero_value_and_second_value_same_day(user):
    metric_type = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=metric_type, date=DAY)

    with pytest.raises(IntegrityError), transaction.atomic():
        MeasurementFactory(user=user, metric_type=metric_type, date=DAY)
    with pytest.raises(IntegrityError), transaction.atomic():
        MeasurementFactory(user=user, metric_type=metric_type, date=DAY.replace(day=16), value=0)


# --- Types de mesure ------------------------------------------------------------------------


def test_list_types_with_latest_value_of_user_only(auth_client, user, other_user):
    weight = user.metric_types.get(name="Poids")
    MeasurementFactory(user=user, metric_type=weight, date=DAY, value=Decimal("72.5"))
    MeasurementFactory(user=user, metric_type=weight, date=DAY.replace(day=1), value=Decimal("74"))
    MetricTypeFactory(user=other_user, name="Mesure de B")

    results = auth_client.get(f"{TYPES}?page_size=100").json()["results"]

    by_name = {item["name"]: item for item in results}
    assert "Mesure de B" not in by_name
    assert by_name["Poids"]["latest_value"] == "72.50"
    assert by_name["Poids"]["latest_date"] == "2026-10-15"
    assert by_name["Poids"]["measurements_count"] == 2
    assert by_name["Tour de taille"]["latest_value"] is None
    assert by_name["Tour de taille"]["measurements_count"] == 0


def test_create_type_and_reject_duplicate_name(auth_client):
    created = auth_client.post(TYPES, {"name": "Tour de bras", "unit": "cm"}, format="json")
    duplicate = auth_client.post(TYPES, {"name": "Tour de bras", "unit": "cm"}, format="json")

    assert created.status_code == 201
    assert created.json()["measurements_count"] == 0
    assert created.json()["latest_value"] is None
    assert duplicate.status_code == 400
    assert "name" in duplicate.json()


def test_unit_cannot_change_once_measurements_exist(auth_client, user):
    unused = MetricTypeFactory(user=user, unit="cm")
    used = MetricTypeFactory(user=user, unit="kg")
    MeasurementFactory(user=user, metric_type=used)

    assert auth_client.patch(type_detail(unused), {"unit": "mm"}, format="json").status_code == 200
    response = auth_client.patch(type_detail(used), {"unit": "lb"}, format="json")
    assert response.status_code == 400
    assert "unit" in response.json()
    # Le nom reste modifiable.
    assert auth_client.patch(type_detail(used), {"name": "Masse"}, format="json").status_code == 200


def test_used_type_cannot_be_deleted_but_can_be_deactivated(auth_client, user):
    metric_type = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=metric_type)

    delete = auth_client.delete(type_detail(metric_type))
    deactivate = auth_client.patch(type_detail(metric_type), {"is_active": False}, format="json")

    assert delete.status_code == 409
    assert "désactivez-le" in delete.json()["detail"]
    assert deactivate.status_code == 200
    assert auth_client.delete(type_detail(MetricTypeFactory(user=user))).status_code == 204


def test_other_user_type_is_not_found(auth_client, other_user):
    foreign = MetricTypeFactory(user=other_user)

    assert auth_client.get(type_detail(foreign)).status_code == 404
    assert auth_client.patch(type_detail(foreign), {"name": "x"}, format="json").status_code == 404
    assert auth_client.delete(type_detail(foreign)).status_code == 404
    assert auth_client.get(series_url(foreign)).status_code == 404


# --- Mesures --------------------------------------------------------------------------------


def test_create_measurement(auth_client, user):
    metric_type = user.metric_types.get(name="Poids")

    response = auth_client.post(
        MEASUREMENTS,
        {"metric_type": str(metric_type.pk), "date": "2026-10-15", "value": "72.4", "notes": ""},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["value"] == "72.40"
    assert body["metric_type_name"] == "Poids"
    assert body["unit"] == "kg"
    assert Measurement.objects.get(pk=body["id"]).user == user


def test_second_measurement_same_day_is_refused_with_clear_message(auth_client, user):
    metric_type = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=metric_type, date=DAY)

    response = auth_client.post(
        MEASUREMENTS,
        {"metric_type": str(metric_type.pk), "date": "2026-10-15", "value": "70"},
        format="json",
    )

    assert response.status_code == 400
    assert "modifiez-la" in response.json()["date"][0]


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"value": "0"}, "value"),
        ({"value": "-1"}, "value"),
        ({"value": "100000"}, "value"),
        ({"value": "1.234"}, "value"),
        ({"date": "2999-01-01"}, "date"),
    ],
)
def test_create_measurement_validates_fields(auth_client, user, overrides, field):
    metric_type = MetricTypeFactory(user=user)
    payload = {"metric_type": str(metric_type.pk), "date": "2026-10-15", "value": "70", **overrides}

    response = auth_client.post(MEASUREMENTS, payload, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_measurement_rejects_foreign_and_inactive_types(auth_client, user, other_user):
    foreign = MetricTypeFactory(user=other_user)
    inactive = MetricTypeFactory(user=user, is_active=False)

    for metric_type in (foreign, inactive):
        response = auth_client.post(
            MEASUREMENTS,
            {"metric_type": str(metric_type.pk), "date": "2026-10-15", "value": "70"},
            format="json",
        )
        assert response.status_code == 400
        assert "metric_type" in response.json()


def test_measurement_of_deactivated_type_stays_editable(auth_client, user):
    metric_type = MetricTypeFactory(user=user)
    measurement = MeasurementFactory(user=user, metric_type=metric_type)
    metric_type.is_active = False
    metric_type.save()

    response = auth_client.patch(measurement_detail(measurement), {"value": "71"}, format="json")

    assert response.status_code == 200
    assert response.json()["value"] == "71.00"


def test_moving_measurement_onto_an_existing_day_is_refused(auth_client, user):
    metric_type = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=metric_type, date=DAY)
    other = MeasurementFactory(user=user, metric_type=metric_type, date=DAY.replace(day=16))

    response = auth_client.patch(measurement_detail(other), {"date": "2026-10-15"}, format="json")
    same = auth_client.patch(measurement_detail(other), {"date": "2026-10-16"}, format="json")

    assert response.status_code == 400
    assert "date" in response.json()
    assert same.status_code == 200


def test_list_filters_and_isolation(auth_client, user, other_user):
    weight = MetricTypeFactory(user=user)
    waist = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=weight, date=DAY)
    MeasurementFactory(user=user, metric_type=weight, date=DAY.replace(day=1))
    MeasurementFactory(user=user, metric_type=waist, date=DAY)
    foreign = MeasurementFactory(user=other_user)

    by_type = auth_client.get(f"{MEASUREMENTS}?metric_type={weight.pk}").json()
    by_date = auth_client.get(f"{MEASUREMENTS}?date_after=2026-10-10").json()
    foreign_type = auth_client.get(f"{MEASUREMENTS}?metric_type={foreign.metric_type_id}").json()

    assert by_type["count"] == 2
    assert [m["date"] for m in by_type["results"]] == ["2026-10-15", "2026-10-01"]
    assert by_date["count"] == 2
    assert foreign_type["count"] == 0
    assert auth_client.get(measurement_detail(foreign)).status_code == 404
    assert auth_client.delete(measurement_detail(foreign)).status_code == 404


def test_anonymous_requests_are_rejected(api_client):
    assert api_client.get(TYPES).status_code == 401
    assert api_client.get(MEASUREMENTS).status_code == 401


# --- Séries -----------------------------------------------------------------------------------


def test_series_returns_only_recorded_values_in_order(user):
    metric_type = MetricTypeFactory(user=user)
    for day, value in [
        (datetime.date(2026, 4, 30), "80"),  # avant la période de 6 mois
        (datetime.date(2026, 5, 1), "78"),
        (datetime.date(2026, 8, 10), "76.5"),
        (datetime.date(2026, 10, 15), "75"),
        (datetime.date(2026, 10, 20), "74"),  # après la date de référence
    ]:
        MeasurementFactory(user=user, metric_type=metric_type, date=day, value=Decimal(value))

    series = metric_series(metric_type, DAY, months=6)

    assert series.start_date == datetime.date(2026, 5, 1)
    assert series.end_date == DAY
    assert [(p.date.isoformat(), p.value) for p in series.points] == [
        ("2026-05-01", Decimal("78")),
        ("2026-08-10", Decimal("76.5")),
        ("2026-10-15", Decimal("75")),
    ]
    assert (series.minimum, series.maximum) == (Decimal("75"), Decimal("78"))
    assert (series.first, series.last, series.change) == (
        Decimal("78"),
        Decimal("75"),
        Decimal("-3"),
    )


def test_series_without_measurements_is_empty(auth_client, user):
    metric_type = user.metric_types.get(name="Poids")

    body = auth_client.get(series_url(metric_type, date="2026-10-15", months=3)).json()

    assert body["name"] == "Poids"
    assert body["unit"] == "kg"
    assert body["start_date"] == "2026-08-01"
    assert body["points"] == []
    assert body["minimum"] is None
    assert body["change"] is None


def test_series_endpoint_and_parameter_validation(auth_client, user):
    metric_type = MetricTypeFactory(user=user)
    MeasurementFactory(user=user, metric_type=metric_type, date=DAY, value=Decimal("72.5"))

    body = auth_client.get(series_url(metric_type, date="2026-10-31")).json()

    assert body["points"] == [{"date": "2026-10-15", "value": "72.50"}]
    assert body["change"] == "0.00"
    for params in ({"months": 0}, {"months": 61}, {"months": "abc"}):
        response = auth_client.get(series_url(metric_type, **params))
        assert response.status_code == 400
        assert "months" in response.json()
    assert auth_client.get(series_url(metric_type, date="hier")).status_code == 400


def test_deleting_user_deletes_metrics(user):
    MeasurementFactory(user=user)

    user.delete()

    assert not MetricType.objects.exists()
    assert not Measurement.objects.exists()
