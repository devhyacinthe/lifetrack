"""
Point d'entrée de Passenger (o2switch, Setup Python App).

Dans le cPanel : startup file = passenger_wsgi.py, entry point = application.
"""

import os
import sys

# Rend les modules du dossier backend/ (config, apps) importables par Passenger.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

from config.wsgi import application  # noqa: E402, F401
