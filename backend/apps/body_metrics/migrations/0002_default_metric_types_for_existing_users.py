"""
Types de mesure initiaux pour les utilisateurs créés avant le module (phases 2 à 10).

Les nouveaux utilisateurs les reçoivent via le signal post_save (apps/body_metrics/signals.py).
Cette migration utilise les modèles historiques : elle ne doit pas appeler les services.
"""

from django.conf import settings
from django.db import migrations

from apps.body_metrics.defaults import DEFAULT_METRIC_TYPES


def create_default_metric_types(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    MetricType = apps.get_model("body_metrics", "MetricType")

    for user in User.objects.all():
        if not MetricType.objects.filter(user=user).exists():
            MetricType.objects.bulk_create(
                [MetricType(user=user, name=name, unit=unit) for name, unit in DEFAULT_METRIC_TYPES]
            )


class Migration(migrations.Migration):
    dependencies = [
        ("body_metrics", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    # Retour arrière : les types sont supprimés avec la table par 0001.
    operations = [migrations.RunPython(create_default_metric_types, migrations.RunPython.noop)]
