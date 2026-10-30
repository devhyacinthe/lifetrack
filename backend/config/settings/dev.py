"""Paramètres de développement local (SQLite, DEBUG activé)."""

from .base import *  # noqa: F403
from .base import env

DEBUG = True

# Clé réservée au développement local ; la production exige DJANGO_SECRET_KEY.
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-key-ne-pas-utiliser-en-production")

# 10.0.2.2 : adresse de la machine hôte vue depuis l'émulateur Android.
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "10.0.2.2"])

# L'API navigable de DRF facilite les essais manuels en local.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
