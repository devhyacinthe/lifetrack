from django.apps import AppConfig


class UsersConfig(AppConfig):
    """Modèle utilisateur personnalisé et authentification JWT."""

    name = "apps.users"
    label = "users"
