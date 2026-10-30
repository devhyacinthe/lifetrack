"""
Paramètres de production (o2switch, Passenger, MariaDB).

Toutes les valeurs sensibles sont obligatoires : l'application refuse de démarrer
si DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS ou DATABASE_URL sont absents.
"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403
from .base import env

DEBUG = False

SECRET_KEY = env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
if not SECRET_KEY or not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY et DJANGO_ALLOWED_HOSTS sont obligatoires.")

DATABASES = {"default": env.db("DATABASE_URL")}
if DATABASES["default"]["ENGINE"] == "django.db.backends.mysql":
    DATABASES["default"].setdefault("OPTIONS", {}).update(
        {
            "charset": "utf8mb4",
            # Refuse les valeurs invalides au lieu de les tronquer silencieusement.
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    )
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# HTTPS
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
# HSTS activé progressivement : augmenter la durée une fois le HTTPS validé.
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=3600)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_HSTS_PRELOAD = False

# À n'activer que si un proxy placé devant l'application définit cet en-tête
# (sinon un client pourrait le falsifier). Comportement de Passenger à vérifier en phase 1b.
if env.bool("DJANGO_BEHIND_PROXY", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
