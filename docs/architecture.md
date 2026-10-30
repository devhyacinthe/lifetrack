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
| Intégration continue | GitHub Actions (`.github/workflows/backend.yml`) : lint, contrôles Django, schéma OpenAPI, tests sur SQLite **et sur MariaDB 11.4** | mêmes conditions que la production à chaque `git push` |
| Encodage MariaDB | `utf8mb4` / `utf8mb4_unicode_ci` (connexion et base de test) | tous les caractères Unicode ; insensible à la casse et aux accents pour les comparaisons |
| CORS | `django-cors-headers` | liste blanche explicite |
| Configuration | `django-environ` | lecture des variables d'environnement et de `DATABASE_URL` |
| Fichiers statiques | WhiteNoise | fonctionne avec Passenger sans configuration Apache |
| Cache | **cache en base de données** (`lifetrack_cache`) | un cache mémoire n'est pas partagé entre les processus Passenger |
| Montants | `DecimalField(max_digits=15, decimal_places=2)` + code devise ISO 4217 | précision exacte ; le XOF est affiché sans décimales |
| Identifiants | UUID pour les objets exposés par l'API | évite l'énumération des identifiants |
| Dates | `USE_TZ=True`, stockage UTC, fuseau par défaut `Africa/Lome` (UTC+0, sans accent : nom IANA), modifiable par utilisateur | respect des fuseaux horaires |
| Jetons côté mobile | `expo-secure-store` | stockage chiffré par le système |
| SDK mobile | **Expo SDK 58** (React Native 0.88.1, React 19.3), Node ≥ 22.13 | dernière version au 30/10/2026 ; compatible avec Expo Go |
| Navigation | Expo Router, onglets natifs (`expo-router/native-tabs`) | API officielle du SDK 58 ; Android limite la barre à 5 onglets |
| Bibliothèque de composants | **React Native Paper** 5 (Material Design 3) + `@expo/vector-icons` (icônes Material Community utilisées par Paper) | thèmes clair et sombre, composants accessibles |
| Identité visuelle | vert émeraude de l'icône (`#14745C`), accent orangé, cartes arrondies (24 px), fonds teintés ; composants `Screen`, `SectionCard`, `IconBadge`, `AuthShell` | rendu cohérent entre les écrans, défini une seule fois dans `src/theme/` et `src/components/` |
| Graphiques | **react-native-gifted-charts** (installée en phase 11) | `victory-native` 43 exige Skia ≥ 2.15.1, alors que le SDK 58 fournit la 2.14.0 |
| Nom de l'application | **LifeTracker** (le projet et l'API gardent le nom technique « lifetrack ») | demande de l'utilisateur |
| Installation des paquets | toujours `npx expo install <paquet>` | choisit les versions compatibles avec le SDK |

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
└── mobile/                        # application « LifeTracker » (Expo SDK 58)
    ├── app.json                   # nom, icônes, écran de démarrage
    ├── assets/images/             # icônes générées par tools/make_icons.py
    ├── tools/make_icons.py        # génération des icônes (Python + Pillow)
    ├── __tests__/                 # tests Jest
    └── src/
        ├── app/                   # routes Expo Router (uniquement écrans et layouts)
        │   ├── _layout.tsx        # fournisseurs (Paper, thème de navigation) + pile racine
        │   ├── (tabs)/            # 5 onglets : index (Accueil), finances, sport, stats, profile
        │   └── (auth)/            # login, register
        ├── api/                   # phase 6 : client HTTP unique, endpoints, jetons
        ├── features/              # phases 6+ : finance/, workouts/… (hooks TanStack Query)
        ├── components/            # composants réutilisables (Screen, ComingSoon…)
        ├── constants/             # constantes (définition des onglets…)
        ├── schemas/               # phase 6 : schémas Zod
        ├── theme/                 # thèmes clair et sombre (Paper + navigation)
        └── types/                 # phase 6 : types des réponses de l'API
```

Seul le code des écrans va dans `src/app/` : Expo Router transforme chaque fichier de ce dossier en route.

### Communication avec l'API (phase 6)

| Élément | Choix |
|---|---|
| URL de l'API | `EXPO_PUBLIC_API_URL` dans `mobile/.env` (production, commité) ; `mobile/.env.local` (ignoré) pour pointer ailleurs |
| Client HTTP | `src/api/client.ts`, basé sur `fetch` : seul endroit qui connaît les URL ; délai maximal de 20 s |
| Jeton `access` | en mémoire uniquement |
| Jeton `refresh` | `expo-secure-store` (stockage chiffré du système) |
| Renouvellement | sur un 401 : **un seul** renouvellement partagé entre les requêtes simultanées, puis une seule nouvelle tentative ; un second échec déconnecte (pas de boucle) |
| Session | `src/auth/auth-context.tsx` : restaurée au démarrage depuis le jeton chiffré ; l'écran de démarrage reste affiché pendant la vérification |
| Garde de navigation | `Stack.Protected` : onglets réservés aux utilisateurs connectés, écrans d'accès aux autres |
| Données serveur | TanStack Query ; cache entièrement vidé à la déconnexion |
| Formulaires | React Hook Form + Zod (`src/schemas/`) ; les erreurs du backend s'affichent sous les champs (`src/forms/api-errors.ts`) |
| Erreurs | `ApiError` (réponse en échec, avec erreurs par champ) et `NetworkError` (serveur injoignable) |

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
