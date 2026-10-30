# LifeTrack

Application mobile personnelle de gestion financière et de suivi sportif.

> **État : phase 1 (initialisation du backend).** Seul l'endpoint de santé et la documentation OpenAPI existent ; aucune fonctionnalité métier n'est encore développée. Voir [docs/development-plan.md](docs/development-plan.md).

## Organisation du dépôt (monorepo)

| Dossier | Contenu | Statut |
|---|---|---|
| `backend/` | API Django REST Framework (Python 3.12, Django 5.2 LTS) | créé en phase 1 |
| `mobile/` | Application Expo + React Native + TypeScript | créé en phase 5 |
| `docs/` | Documentation de conception et de déploiement | en cours |

Les deux applications sont indépendantes : le backend fonctionne sans le frontend, et le frontend est compilé et distribué séparément.

## Documentation

- [docs/architecture.md](docs/architecture.md) : architecture, choix techniques et conventions.
- [docs/development-plan.md](docs/development-plan.md) : phases et plan de validation.
- [docs/api-contract.md](docs/api-contract.md) : conventions de l'API et tests manuels via Swagger/OpenAPI.
- [docs/database.md](docs/database.md) : bases de données et conventions de modélisation.
- [docs/deployment-o2switch.md](docs/deployment-o2switch.md) : déploiement du backend sur o2switch (brouillon non testé).

## Prérequis de développement

| Outil | Version | Utilisation |
|---|---|---|
| Python | 3.12.x (identique à la production o2switch) | backend |
| uv | ≥ 0.13 | gestion de Python et de l'environnement virtuel en local |
| Git | ≥ 2.36 | |
| Node.js | LTS récente compatible avec le SDK Expo (vérifié en phase 5) | mobile |
| eas-cli | dernière version | compilation mobile |

En local, la base est SQLite : aucun serveur de base de données n'est nécessaire. La production utilise MariaDB 11.4 (o2switch).

## Backend : installation et lancement

Toutes les commandes s'exécutent depuis le dossier `backend/`.

### Installation (une seule fois)

```bash
cd backend
uv venv --python 3.12 .venv
uv pip install --python .venv -r requirements-dev.txt
cp .env.example .env          # facultatif en local : SQLite et une clé de développement sont utilisés par défaut
```

Sans uv : `py -3.12 -m venv .venv`, puis `.venv\Scripts\pip install -r requirements-dev.txt`.

### Activer l'environnement virtuel

- Windows (PowerShell) : `.venv\Scripts\Activate.ps1`
- Git Bash : `source .venv/Scripts/activate`
- Linux / o2switch : `source .venv/bin/activate`

### Lancer l'API

```bash
python manage.py migrate
python manage.py runserver
```

| URL | Contenu |
|---|---|
| http://127.0.0.1:8000/api/v1/health/ | état de l'API et de la base |
| http://127.0.0.1:8000/api/docs/ | Swagger UI |
| http://127.0.0.1:8000/api/redoc/ | ReDoc |
| http://127.0.0.1:8000/api/schema/ | schéma OpenAPI 3 |

Pour tester le backend seul depuis Swagger, voir [docs/api-contract.md §4](docs/api-contract.md#4-tester-uniquement-le-backend-avec-swagger-et-openapi).

### Tests et contrôles qualité

```bash
pytest                                   # tests automatisés
ruff check .                             # lint
ruff format --check .                    # formatage (ruff format . pour corriger)
python manage.py check                   # contrôles Django
python manage.py makemigrations --check --dry-run
python manage.py spectacular --validate --fail-on-warn --file schema.yml
```

Contrôles de sécurité avec les paramètres de production (valeurs factices, en Git Bash) :

```bash
DJANGO_SETTINGS_MODULE=config.settings.prod DJANGO_SECRET_KEY=une-cle-factice-de-plus-de-cinquante-caracteres-0123456789 \
DJANGO_ALLOWED_HOSTS=api.example.com DATABASE_URL=sqlite:///deploycheck.sqlite3 \
python manage.py check --deploy
```

Résultat attendu : seulement les avertissements `security.W005` et `security.W021`, qui sont volontaires (HSTS activé progressivement).

### Dépendances

- `requirements.in` : dépendances directes de production.
- `requirements.txt` : versions figées pour la production (Linux, Python 3.12). Ne pas le modifier à la main. Pour le régénérer :
  `uv pip compile requirements.in -o requirements.txt --python-version 3.12 --python-platform linux`
- `requirements-dev.txt` : outils de test et de qualité, jamais installés en production.

### Paramètres

| Module | Utilisation |
|---|---|
| `config.settings.dev` | local, par défaut avec `manage.py` |
| `config.settings.test` | pytest (configuré dans `pyproject.toml`) |
| `config.settings.prod` | o2switch, forcé par `passenger_wsgi.py` |

Les variables d'environnement sont décrites dans [backend/.env.example](backend/.env.example).

## Mobile

Les commandes seront documentées en phase 5.

## Sécurité

Aucun secret ne doit être commité. Les variables d'environnement sont documentées dans les fichiers `.env.example` (sans valeurs réelles).
