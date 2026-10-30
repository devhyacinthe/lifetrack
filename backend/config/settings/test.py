"""Paramètres des tests automatisés (pytest)."""

from .base import *  # noqa: F403
from .base import env

SECRET_KEY = "test-secret-key"
ALLOWED_HOSTS = ["testserver"]

# SQLite en mémoire par défaut ; TEST_DATABASE_URL permet de tester sur MariaDB.
# Variable distincte de DATABASE_URL pour ne jamais lancer les tests sur une vraie base par erreur.
DATABASES = {"default": env.db("TEST_DATABASE_URL", default="sqlite://:memory:")}

# Pas de collectstatic avant les tests : WhiteNoise ne doit pas exiger le dossier staticfiles/.
WHITENOISE_AUTOREFRESH = True

# Hachage rapide : uniquement pour accélérer les tests.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
