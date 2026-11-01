from django.apps import AppConfig


class BodyMetricsConfig(AppConfig):
    """Mesures corporelles facultatives (poids, tours, masse grasse…)."""

    name = "apps.body_metrics"
    label = "body_metrics"
    verbose_name = "Mesures corporelles"

    def ready(self):
        from . import signals  # noqa: F401
