from django.apps import AppConfig


class DashboardConfig(AppConfig):
    """Tableau de bord : indicateurs financiers et sportifs, sans modèle propre."""

    name = "apps.dashboard"
    label = "dashboard"
    verbose_name = "Tableau de bord"
