import datetime
from decimal import Decimal

import factory

from apps.body_metrics.models import Measurement, MetricType
from apps.users.tests.factories import UserFactory


class MetricTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MetricType

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Mesure {n}")
    unit = "cm"


class MeasurementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Measurement

    user = factory.SubFactory(UserFactory)
    metric_type = factory.SubFactory(MetricTypeFactory, user=factory.SelfAttribute("..user"))
    date = datetime.date(2026, 10, 15)
    value = Decimal("72.50")
