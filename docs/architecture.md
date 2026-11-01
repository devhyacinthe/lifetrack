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
| Sélecteur de date | `@react-native-community/datetimepicker` (phase 7) | sélecteur natif recommandé par Expo, inclus dans Expo Go ; dialogue natif sur Android, compact sur iOS |
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
│       ├── core/                  # éléments transverses : santé, pagination, api.py (isolation par utilisateur), periods.py (périodes et fuseaux)
│       ├── users/                 # phase 2
│       ├── finance/               # phases 3-4, 8
│       ├── workouts/              # phase 9
│       ├── body_metrics/          # phase 11a : types de mesure, mesures, séries
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
        │   ├── (finance)/         # phases 7-8 : transactions, comptes, transferts, budgets, objectifs (goals), catégories
        │   ├── (workouts)/        # phase 10 : sessions (start, new, [id], [id]/finish), activities, sport-goals
        │   └── (auth)/            # login, register
        ├── api/                   # phase 6 : client HTTP unique, endpoints, jetons
        ├── features/              # phases 6+ : profile/, finance/… (hooks TanStack Query, formulaires)
        ├── components/            # composants réutilisables (Screen, SectionCard, EmptyState, DateField…)
        ├── hooks/                 # hooks génériques (useDebouncedValue)
        ├── lib/                   # domain-queries.ts : clés de cache et invalidation communes
        ├── utils/                 # fonctions pures (dates calendaires)
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

### Écrans financiers (phase 7)

| Élément | Choix |
|---|---|
| Montants | chaînes décimales exactes de l'API jusqu'au formulaire (`normalizeAmountInput` : « 12 500 » ou « 12,50 » → `"12500"`, `"12.50"`) ; conversion en nombre **pour l'affichage uniquement** |
| Dates | `YYYY-MM-DD` calculées dans le fuseau du téléphone (`src/utils/dates.ts`), jamais via `toISOString()` (UTC) |
| Liste des transactions | `useInfiniteQuery` (20 par page), sections par jour quand le tri est par date ; filtres envoyés au backend (`search` temporisé à 400 ms, `type`, `category`, `date_after`/`date_before`, `ordering`) |
| Cache | clés `['finance', objet, 'list' \| 'detail', …]` ; voir « Invalidation » ci-dessous (phase 8b) |
| Historique | une catégorie désactivée ou un compte archivé restent proposés uniquement pour la transaction qui les utilise déjà, comme le backend l'autorise |
| Suppression d'une catégorie utilisée | le 409 du backend est affiché et l'écran propose de la désactiver |
| Comptes | gestion complète en phase 8b |

### Comptes, transferts, budgets et objectifs (phase 8b)

| Élément | Choix |
|---|---|
| Accès | rangée de raccourcis en haut de l'onglet Finances (Comptes, Budgets, Objectifs, Catégories) ; transferts depuis l'écran Comptes |
| Écrans | `(finance)/accounts`, `transfers`, `budgets`, `goals` : liste, `new`, `[id]` (modification et suppression) |
| Chiffres affichés | soldes, consommation des budgets et progression des objectifs **tels que renvoyés par le backend** ; l'application n'additionne ni ne recalcule aucun montant |
| Invalidation | toute écriture financière invalide toutes les données `['finance', …]` : les listes affichées sont rechargées, les détails sont seulement marqués périmés (rechargés à leur prochaine ouverture, donc pas de 404 sur un objet supprimé) ; une transaction modifie en effet soldes, budgets et objectifs |
| Refus 409 | compte utilisé : le dialogue de suppression propose « Archiver » |
| Objectifs | un compte déjà rattaché à un objectif n'est pas proposé ; bouton « Épargner » = transfert prérempli vers le compte de l'objectif |
| Composants partagés | `ListCard`, `ProgressMeter`, `ConfirmDialog`, `QueryStatus`, `FormAmountInput` (montant signé possible pour le solde initial) |

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

### Écrans sportifs (phase 10)

| Élément | Choix |
|---|---|
| Onglet Sport | résumé de la semaine ou du mois (`/workouts/stats/`), séance en cours, deux objectifs en cours, historique des séances **terminées** groupé par jour local, filtrable par activité |
| Séance en cours | carte avec chronomètre ; **glisser vers la droite** (`ReanimatedSwipeable`, `GestureHandlerRootView` à la racine) ou bouton « Terminer » → formulaire de fin |
| Formulaire de fin | durée proposée = temps écoulé (modifiable ; rien de proposé au-delà de 24 h), intensité, distance (si l'activité la mesure), calories **estimées**, notes |
| Ajout | bouton « + » : « Démarrer une séance » (masqué si une séance est en cours) ou « Ajouter une séance passée » |
| Routes | `/sport-goals` pour les objectifs sportifs : les groupes `(finance)` et `(workouts)` n'apparaissent pas dans l'URL, et `/goals` est déjà pris par les objectifs d'épargne |
| Cache | `lib/domain-queries.ts`, partagé avec les finances : toute écriture invalide `['workouts', …]` |
| Dates | les séances sont stockées en UTC et affichées dans le fuseau du téléphone ; les périodes des statistiques sont calculées par le backend dans le fuseau du profil |
| Erreurs du backend | `renameFieldErrors` relie `duration_seconds`, `distance_km`… aux champs du formulaire ; une erreur sur un champ absent (ex. `status`) devient le message général, avec son texte |

**Types des routes (`.expo/types/router.d.ts`)** : ce fichier est généré par `npx expo start`. Ne pas le supprimer avant de relancer Expo : la première génération est partielle (des routes manquent et `tsc` échoue). En cas de doute, relancer `npx expo start` et attendre quelques secondes avant `npm run typecheck`.

### Barre de navigation (phase 11a)

Icône **en contour** au repos et **pleine** sur l'onglet actif, posée sur une pastille `secondaryContainer` (Material 3). Android : `MaterialCommunityIcons` via `NativeTabs.Trigger.VectorIcon`, les mêmes icônes que le reste de l'application ; iOS : SF Symbols. Les noms sont dans `src/constants/tabs.ts`.
