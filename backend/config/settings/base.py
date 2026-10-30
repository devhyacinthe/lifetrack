"""
Paramètres communs à tous les environnements.

Les valeurs propres à un environnement (secrets, base de données, hôtes autorisés)
sont lues depuis les variables d'environnement ou le fichier backend/.env.
"""

from datetime import timedelta
from pathlib import Path

import environ

# Dossier backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Le fichier .env est facultatif : en production, les variables peuvent venir du cPanel.
environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="")
DEBUG = False
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    # LifeTrack
    "apps.core",
    "apps.users",
    "apps.finance",
]

AUTH_USER_MODEL = "users.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

MYSQL_CHARSET = "utf8mb4"
MYSQL_COLLATION = "utf8mb4_unicode_ci"


def configure_mysql(database):
    """Options communes à toute connexion MariaDB (production, tests sur MariaDB)."""
    if database["ENGINE"] == "django.db.backends.mysql":
        database.setdefault("OPTIONS", {}).update(
            {
                "charset": MYSQL_CHARSET,
                # Refuse les valeurs invalides au lieu de les tronquer silencieusement.
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            }
        )
        # Base de test créée par pytest : même encodage que la production.
        database.setdefault("TEST", {}).update(
            {"CHARSET": MYSQL_CHARSET, "COLLATION": MYSQL_COLLATION}
        )
    return database


# Base de données : SQLite par défaut, surchargée par DATABASE_URL (mysql://… en production).
DATABASES = {
    "default": configure_mysql(
        env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
    ),
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalisation : stockage en UTC, fuseau par défaut UTC+0 (Afrique de l'Ouest).
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True

# Fichiers statiques et téléversés, hors du code source.
STATIC_URL = "static/"
STATIC_ROOT = env.path("DJANGO_STATIC_ROOT", default=BASE_DIR / "staticfiles")
MEDIA_URL = "media/"
MEDIA_ROOT = env.path("DJANGO_MEDIA_ROOT", default=BASE_DIR / "media")

# Taille maximale du corps d'une requête (hors fichiers) : 1 Mo.
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Cache partagé entre les processus Passenger (utilisé par la limitation des tentatives).
# La table est créée avec : python manage.py createcachetable
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "lifetrack_cache",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Tout endpoint est privé par défaut ; les exceptions sont explicites (AllowAny).
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # Limitation appliquée uniquement aux vues qui déclarent un throttle_scope.
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "register": "10/hour",
    },
    # 0 : l'adresse du client est REMOTE_ADDR. L'en-tête X-Forwarded-For, falsifiable,
    # est ignoré. À ajuster si un proxy est placé devant l'application.
    "NUM_PROXIES": env.int("DJANGO_NUM_PROXIES", default=0),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Chaque renouvellement émet un nouveau jeton et révoque l'ancien.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "LifeTrack API",
    "DESCRIPTION": "API de gestion financière et de suivi sportif.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "TransactionTypeEnum": "apps.finance.models.TransactionType",
        "AccountTypeEnum": "apps.finance.models.AccountType",
        "PaymentMethodEnum": "apps.finance.models.PaymentMethod",
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{asctime} {levelname} {name} {message}", "style": "{"},
    },
    "handlers": {
        # Sur o2switch, la sortie d'erreur est écrite dans le journal de Passenger.
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", default="INFO")},
}
