from django.apps import AppConfig


class WorkoutsConfig(AppConfig):
    """Activités, séances, objectifs sportifs et statistiques."""

    name = "apps.workouts"
    label = "workouts"
    verbose_name = "Sport"

    def ready(self):
        from . import signals  # noqa: F401
