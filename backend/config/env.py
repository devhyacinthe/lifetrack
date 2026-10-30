from pathlib import Path

import environ

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


def read_env_file(path=ENV_FILE):
    """
    Charge le fichier .env s'il existe, sans écraser les variables déjà définies.

    Appelé par manage.py avant le choix du module de paramètres : sur le serveur,
    le .env fixe DJANGO_SETTINGS_MODULE=config.settings.prod pour toutes les commandes.
    """
    if Path(path).is_file():
        environ.Env.read_env(path, overwrite=False)
