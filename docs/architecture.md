# Architecture de LifeTrack

## 1. Vue d'ensemble

```
┌──────────────────────┐      HTTPS / JSON       ┌─────────────────────────────┐
│ mobile/ (Expo, RN)   │ ──────────────────────▶ │ backend/ (Django + DRF)     │
│ Android / iOS        │  /api/v1/…  + JWT       │ Passenger/WSGI sur o2switch │
└──────────────────────┘                         └──────────────┬──────────────┘
                                                                │ ORM Django
                                                  ┌─────────────▼─────────────┐
                                                  │ MariaDB 11.4 (production) │
                                                  │ SQLite (développement)    │
                                                  └───────────────────────────┘
```

- Le backend est la **source de vérité**. Le mobile n'accède aux données que par l'API.
- Les calculs métier (soldes, budgets, statistiques) sont faits côté backend.
- Toutes les données privées sont filtrées par utilisateur à chaque requête.

## 2. Décisions techniques (phase 0)

| Sujet | Décision | Raison |
|---|---|---|
| Python | **3.12** (3.12.16 disponible sur o2switch) | version récente, compatible Django 5.2, même version en local et en production |
| Django | **5.2 LTS** | support étendu jusqu'en avril 2028, compatible Python 3.10 à 3.14 |
| Base de production | **MariaDB 11.4** (version serveur vérifiée sur o2switch) | supportée par Django 5.2 ; le PostgreSQL d'o2switch (9.6) n'est plus maintenu ni supporté |
| Base locale | **SQLite** | aucune installation nécessaire ; voir les limites dans [database.md](database.md) |
| Pilote MariaDB | `PyMySQL` | pur Python ; `mysqlclient` ne peut pas être compilé sur o2switch (gcc interdit, constaté en phase 1b) |
| Mode SQL MariaDB | `utf8mb4` + `STRICT_TRANS_TABLES` | refuse les données invalides au lieu de les tronquer |
| Authentification | SimpleJWT + `token_blacklist` ; `access` 15 min, `refresh` 7 jours à usage unique (rotation) | révocation à la déconnexion, au changement de mot de passe et à la suppression du compte |
| Utilisateur | modèle personnalisé `users.User`, e-mail comme identifiant, clé UUID | exigé dès la première migration |
| Limitation des tentatives | `login` 5/min, `register` 10/h par IP ; `NUM_PROXIES=0` | l'en-tête `X-Forwarded-For`, falsifiable, est ignoré |
| Documentation API | `drf-spectacular` (OpenAPI 3, Swagger UI, ReDoc) | schéma généré depuis le code |
| Filtres | `django-filter` | filtres déclaratifs et documentés dans OpenAPI |
| CORS | `django-cors-headers` | liste blanche explicite |
| Configuration | `django-environ` | lecture des variables d'environnement et de `DATABASE_URL` |
| Fichiers statiques | WhiteNoise | fonctionne avec Passenger sans configuration Apache |
| Cache | **cache en base de données** (`lifetrack_cache`) | un cache mémoire n'est pas partagé entre les processus Passenger |
| Montants | `DecimalField(max_digits=15, decimal_places=2)` + code devise ISO 4217 | précision exacte ; le XOF est affiché sans décimales |
| Identifiants | UUID pour les objets exposés par l'API | évite l'énumération des identifiants |
| Dates | `USE_TZ=True`, stockage UTC, fuseau par défaut `Africa/Lome` (UTC+0, sans accent : nom IANA), modifiable par utilisateur | respect des fuseaux horaires |
| Jetons côté mobile | `expo-secure-store` | stockage chiffré par le système |
| Bibliothèque de composants et de graphiques | **choisies en phase 5** | après vérification de la compatibilité avec le SDK Expo en vigueur |

## 3. Arborescence cible

```
lifetrack/
├── .editorconfig  .gitattributes  .gitignore  README.md  CLAUDE.md
├── docs/
├── backend/
│   ├── manage.py
│   ├── passenger_wsgi.py          # point d'entrée Passenger → config.wsgi.application
│   ├── conftest.py                # fixtures pytest communes
│   ├── requirements.in            # dépendances directes de production
│   ├── requirements.txt           # versions figées (générées pour Linux / Python 3.12)
│   ├── requirements-dev.txt       # -r requirements.txt + outils de test et de qualité
│   ├── pyproject.toml             # configuration ruff et pytest
│   ├── .env.example
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py            # commun
│   │   │   ├── dev.py             # SQLite, DEBUG
│   │   │   ├── test.py            # tests (rapides, hachage simplifié)
│   │   │   └── prod.py            # MariaDB, sécurité HTTPS, DEBUG=False
│   │   ├── urls.py                # /api/v1/, /api/schema/, /api/docs/
│   │   └── wsgi.py
│   └── apps/                      # chaque app est créée à sa phase
│       ├── core/                  # éléments transverses (santé, pagination, permissions)
│       ├── users/                 # phase 2
│       ├── finance/               # phases 3-4, 8
│       ├── workouts/              # phase 9
│       ├── body_metrics/          # phase 11
│       └── dashboard/             # phase 12
└── mobile/                        # généré en phase 5 avec create-expo-app
    ├── app/                       # routes Expo Router : (auth)/, (tabs)/…
    └── src/
        ├── api/                   # client HTTP unique, endpoints, gestion des jetons
        ├── features/              # finance/, workouts/, … (hooks TanStack Query, écrans)
        ├── components/            # composants réutilisables
        ├── schemas/               # schémas Zod
        ├── theme/                 # thèmes clair et sombre
        └── types/                 # types des réponses de l'API
```

### Structure type d'une application Django

```
apps/<domaine>/
├── models.py
├── serializers.py
├── views.py          # vues fines : validation → service → réponse
├── urls.py
├── permissions.py
├── services.py       # écritures et règles métier (transactions atomiques)
├── selectors.py      # lectures et calculs (statistiques, soldes)
├── filters.py
├── admin.py
└── tests/
    ├── factories.py
    ├── test_models.py
    ├── test_services.py
    ├── test_api.py
    └── test_isolation.py
```

## 4. Conventions

### Code

- **Python** : PEP 8, `ruff check` et `ruff format`, longueur de ligne 100.
- La logique métier va dans `services.py` et `selectors.py`, pas dans les vues ni les serializers.
- Chaque queryset de données privées est filtré par `request.user`. Un objet d'un autre utilisateur renvoie **404**, sans révéler son existence.
- **TypeScript** : mode `strict`, ESLint (`expo lint`) et Prettier. Aucune URL d'API dans les composants.
- Les commentaires et la documentation sont en français ; les identifiants de code sont en anglais.

### Configuration

- Les secrets ne sont lus que depuis l'environnement : fichier `backend/.env` en local (ignoré par Git), variables de Setup Python App en production.
- `DJANGO_SETTINGS_MODULE` sélectionne `config.settings.dev`, `test` ou `prod`.
- `.env.example` liste toutes les variables, sans valeurs réelles.

### Tests

- **Backend** : `pytest` + `pytest-django` + `factory_boy`. Chaque domaine possède des tests d'isolation entre utilisateurs.
- **Mobile** : Jest (`jest-expo`) + React Native Testing Library.
- Une phase n'est pas déclarée terminée si un test échoue.

### Git

- Messages de commit du type `feat(finance): ajout des transferts`, `fix(users): …`, `docs: …`, `test: …`.
- Une branche par phase (`phase-1-django-init`, …), fusionnée dans `main` après validation.
