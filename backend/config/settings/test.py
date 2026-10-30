"""Paramètres des tests automatisés (pytest)."""

from .base import *  # noqa: F403
from .base import configure_mysql, env

SECRET_KEY = "test-secret-key-uniquement-pour-les-tests-automatises"
ALLOWED_HOSTS = ["testserver"]

# SQLite en mémoire par défaut ; TEST_DATABASE_URL permet de tester sur MariaDB.
# Variable distincte de DATABASE_URL pour ne jamais lancer les tests sur une vraie base par erreur.
DATABASES = {"default": configure_mysql(env.db("TEST_DATABASE_URL", default="sqlite://:memory:"))}

# Pas de collectstatic avant les tests : WhiteNoise ne doit pas exiger le dossier staticfiles/.
WHITENOISE_AUTOREFRESH = True

# Hachage rapide : uniquement pour accélérer les tests.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Cache en mémoire : pas de table de cache à créer, remis à zéro entre chaque test (conftest.py).
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
