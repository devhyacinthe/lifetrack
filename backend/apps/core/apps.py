from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Éléments transverses : santé de l'API, pagination, permissions communes."""

    name = "apps.core"
    label = "core"
