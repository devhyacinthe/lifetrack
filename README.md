# LifeTrack

Application mobile personnelle de gestion financière et de suivi sportif.

> **État : phase 7 (interfaces financières).** Le backend gère l'authentification JWT, les comptes, les catégories, les transactions et les transferts. L'application mobile « LifeTracker » gère l'inscription, la connexion, le profil, les transactions et les catégories ; les comptes, budgets et le sport ne sont pas encore développés. Voir [docs/development-plan.md](docs/development-plan.md).

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
python manage.py createcachetable      # cache utilisé par la limitation des tentatives
python manage.py createsuperuser       # facultatif : compte pour /admin/ (identifiant = e-mail)
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

### Intégration continue

À chaque `git push` qui touche `backend/`, GitHub Actions lance le lint, les contrôles Django, la validation du schéma OpenAPI et les tests, sur SQLite **et** sur MariaDB 11.4. Les résultats sont dans l'onglet **Actions** du dépôt GitHub.

Pour lancer les tests sur une base MariaDB locale ou de test (jamais la production) :
`TEST_DATABASE_URL=mysql://utilisateur:motdepasse@localhost:3306/lifetrack pytest`

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

## Mobile : application « LifeTracker »

Toutes les commandes s'exécutent depuis le dossier `mobile/`. Prérequis : Node.js ≥ 22.13, et l'application **Expo Go** sur le téléphone.

### Installation (une seule fois)

```bash
cd mobile
npm install
```

### API utilisée

L'adresse de l'API est dans `mobile/.env` (`EXPO_PUBLIC_API_URL`) : par défaut, l'API de production `https://api.lifetrack.hyacinthe-dalmeida.com`. Pour utiliser une autre API (par exemple un backend local), créer `mobile/.env.local`, qui est ignoré par Git et prioritaire, puis relancer `npx expo start --clear`.

Pour ajouter une dépendance, utiliser **`npx expo install <paquet>`** plutôt que `npm install <paquet>` : Expo choisit alors la version compatible avec le SDK 58.

### Lancer l'application sur le téléphone

```bash
npx expo start
```

Scanner ensuite le QR code affiché avec **Expo Go** (Android). Le téléphone et le PC doivent être sur le **même réseau Wi-Fi**. Si le téléphone ne se connecte pas (pare-feu, réseau d'entreprise), utiliser `npx expo start --tunnel`.

### Tests et contrôles qualité

```bash
npm test                 # tests Jest
npm run typecheck        # TypeScript (tsc --noEmit)
npm run lint             # ESLint (expo lint)
npm run format:check     # Prettier (npm run format pour corriger)
npx expo-doctor          # cohérence des dépendances avec le SDK
```

### Icônes

Les icônes (`assets/images/`) sont générées par `tools/make_icons.py` :
`uv run --with pillow python tools/make_icons.py assets/images`

Dans **Expo Go**, l'icône affichée sur le téléphone est celle d'Expo Go : l'icône LifeTracker n'apparaît sur l'écran d'accueil qu'avec une version installable (APK, compilée avec EAS). Elle est aussi affichée dans l'application, sur les écrans de connexion et d'inscription.

## Sécurité

Aucun secret ne doit être commité. Les variables d'environnement sont documentées dans les fichiers `.env.example` (sans valeurs réelles).
