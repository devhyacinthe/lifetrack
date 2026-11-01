"""
Activités initiales pour les utilisateurs créés avant le module sportif (phases 2 à 8).

Les nouveaux utilisateurs les reçoivent via le signal post_save (apps/workouts/signals.py).
Cette migration utilise les modèles historiques : elle ne doit pas appeler les services.
"""

from django.conf import settings
from django.db import migrations

from apps.workouts.defaults import DEFAULT_ACTIVITIES


def create_default_activities(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    ActivityType = apps.get_model("workouts", "ActivityType")

    for user in User.objects.all():
        if not ActivityType.objects.filter(user=user).exists():
            ActivityType.objects.bulk_create(
                [
                    ActivityType(user=user, name=name, tracks_distance=tracks_distance)
                    for name, tracks_distance in DEFAULT_ACTIVITIES
                ]
            )


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    # Retour arrière : les activités sont supprimées avec la table par 0001.
    operations = [migrations.RunPython(create_default_activities, migrations.RunPython.noop)]
