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
- Les calculs métier (soldes, budgets, statistiques, tableau de bord) sont faits côté backend, à partir des données enregistrées : aucune valeur calculée n'est stockée.
- Toutes les données privées sont filtrées par utilisateur à chaque requête.

## 2. Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Python | **3.12** (3.12.16 disponible sur o2switch) | version récente, compatible Django 5.2, même version en local et en production |
| Django | **5.2 LTS** | support étendu jusqu'en avril 2028 |
| Base de production | **MariaDB 11.4** (version serveur vérifiée sur o2switch) | supportée par Django 5.2 ; le PostgreSQL d'o2switch (9.6) n'est plus maintenu ni supporté |
| Base locale | **SQLite** | aucune installation nécessaire ; voir les limites dans [database.md](database.md) |
| Pilote MariaDB | `PyMySQL` | pur Python ; `mysqlclient` ne peut pas être compilé sur o2switch (gcc interdit) |
| Mode SQL MariaDB | `utf8mb4` / `utf8mb4_unicode_ci` + `STRICT_TRANS_TABLES` | tous les caractères Unicode ; refuse les données invalides au lieu de les tronquer |
| Authentification | SimpleJWT + `token_blacklist` ; `access` 15 min, `refresh` 7 jours à usage unique (rotation) | révocation à la déconnexion, au changement de mot de passe et à la suppression du compte |
| Utilisateur | modèle personnalisé `users.User`, e-mail comme identifiant, clé UUID | exigé dès la première migration |
| Limitation des tentatives | `login` 5/min, `register` 10/h par IP | protection contre les attaques par force brute |
| Documentation API | `drf-spectacular` (OpenAPI 3, Swagger UI, ReDoc) | schéma généré depuis le code |
| Filtres | `django-filter` | filtres déclaratifs et documentés dans OpenAPI |
| Intégration continue | GitHub Actions (`.github/workflows/backend.yml`) : lint, contrôles Django, schéma OpenAPI, tests sur SQLite **et sur MariaDB 11.4** | mêmes conditions que la production à chaque `git push` |
| CORS / configuration | `django-cors-headers` (liste blanche) ; `django-environ` (variables d'environnement, `DATABASE_URL`) | aucun secret dans le code |
| Fichiers statiques | WhiteNoise | fonctionne avec Passenger sans configuration Apache |
| Cache | cache en base de données (`lifetrack_cache`) | un cache mémoire n'est pas partagé entre les processus Passenger |
| Montants | `DecimalField(max_digits=15, decimal_places=2)` + code devise ISO 4217 | précision exacte ; montants de devises différentes jamais additionnés |
| Identifiants | UUID pour les objets exposés par l'API | évite l'énumération des identifiants |
| Dates | `USE_TZ=True`, stockage UTC, fuseau par utilisateur (`Africa/Lome` par défaut) | semaines et mois calculés dans le fuseau de l'utilisateur |
| SDK mobile | **Expo SDK 58** (React Native 0.88, React 19.3), Node ≥ 22.13 | compatible avec Expo Go |
| Navigation | Expo Router, onglets natifs (`expo-router/native-tabs`) | API officielle du SDK ; Android limite la barre à 5 onglets |
| Composants | **React Native Paper** 5 (Material Design 3) + `@expo/vector-icons` | thèmes clair et sombre, composants accessibles |
| Données serveur / formulaires | TanStack Query ; React Hook Form + Zod | cache et invalidation ; validation avant envoi |
| Jetons côté mobile | `expo-secure-store` | stockage chiffré par le système |
| Graphiques | `react-native-gifted-charts` (avec `react-native-svg`, `expo-linear-gradient`) | compatible Expo Go ; `victory-native` exige une version de Skia absente du SDK 58 |
| Identité visuelle | vert émeraude (`#14745C`), accent orangé, cartes arrondies, fonds teintés | défini une seule fois dans `src/theme/` et `src/components/` |
| Nom de l'application | **LifeTracker** (le projet et l'API gardent le nom technique « lifetrack ») | choix de l'utilisateur |
| Installation des paquets | toujours `npx expo install <paquet>` | choisit les versions compatibles avec le SDK |

## 3. Arborescence

```
lifetrack/
├── .github/workflows/backend.yml  # CI du backend (SQLite + MariaDB)
├── docs/                          # architecture, API, base de données, déploiement
├── backend/
│   ├── manage.py
│   ├── passenger_wsgi.py          # point d'entrée Passenger → config.wsgi.application
│   ├── conftest.py                # fixtures pytest communes
│   ├── requirements.in            # dépendances directes de production
│   ├── requirements.txt           # versions figées (Linux / Python 3.12)
│   ├── requirements-dev.txt       # + outils de test et de qualité
│   ├── pyproject.toml             # configuration ruff et pytest
│   ├── .env.example               # variables d'environnement, sans valeurs réelles
│   ├── config/
│   │   ├── settings/              # base.py, dev.py (SQLite), test.py, prod.py (MariaDB, HTTPS)
│   │   ├── urls.py                # /api/v1/…, /api/schema/, /api/docs/, /api/redoc/
│   │   └── wsgi.py
│   └── apps/
│       ├── core/                  # santé, pagination, api.py (isolation par utilisateur), periods.py (périodes et fuseaux)
│       ├── users/                 # utilisateur, inscription, connexion JWT, profil
│       ├── finance/               # comptes, catégories, transactions, transferts, budgets, objectifs d'épargne, statistiques
│       ├── workouts/              # activités, séances, objectifs sportifs, statistiques et historique
│       ├── body_metrics/          # types de mesure, mesures, séries
│       └── dashboard/             # GET /dashboard/ (aucun modèle)
└── mobile/                        # application « LifeTracker » (Expo SDK 58)
    ├── app.json                   # nom, icônes, écran de démarrage
    ├── eas.json                   # profils de compilation EAS (APK)
    ├── .env                       # EXPO_PUBLIC_API_URL (URL publique, aucun secret)
    ├── assets/images/             # icônes générées par tools/make_icons.py
    ├── tools/make_icons.py        # génération des icônes (Python + Pillow)
    ├── __tests__/                 # tests Jest
    └── src/
        ├── app/                   # routes Expo Router (écrans et layouts uniquement)
        │   ├── _layout.tsx        # fournisseurs (Paper, Query, gestes) + gardes de navigation
        │   ├── (tabs)/            # index (Accueil), finances, sport, stats, profile
        │   ├── (finance)/         # transactions, accounts, transfers, budgets, goals, categories
        │   ├── (workouts)/        # sessions (start, new, [id], [id]/finish), activities, sport-goals
        │   ├── (body)/            # measurements (index, [typeId], new, entry/[id])
        │   └── (auth)/            # login, register
        ├── api/                   # client HTTP unique, endpoints par domaine, types des réponses (types.ts)
        ├── auth/                  # session (restauration, connexion, déconnexion)
        ├── features/              # par domaine : requêtes TanStack Query, formulaires, cartes
        ├── components/            # composants réutilisables (Screen, ListCard, EmptyState, charts/…)
        ├── forms/                 # affichage des erreurs du backend sous les champs
        ├── schemas/               # schémas Zod
        ├── lib/                   # domain-queries.ts : clés de cache et invalidation
        ├── hooks/  utils/  constants/  theme/
        └── config.ts              # URL de l'API, délai des requêtes
```

Seul le code des écrans va dans `src/app/` : Expo Router transforme chaque fichier de ce dossier en route. Les groupes `(finance)`, `(workouts)`, `(body)` n'apparaissent pas dans l'URL : les objectifs sportifs sont donc sous `/sport-goals`, `/goals` étant pris par les objectifs d'épargne.

## 4. Backend

### Organisation d'une application Django

```
apps/<domaine>/
├── models.py         # modèles et contraintes en base
├── serializers.py    # validation des entrées, format des réponses
├── views.py          # vues fines : validation → service ou sélecteur → réponse
├── urls.py
├── services.py       # écritures et règles métier (transactions atomiques)
├── selectors.py      # lectures et calculs (soldes, statistiques, progression)
├── filters.py        # filtres des listes
├── defaults.py       # données initiales (catégories, activités, types de mesure)
├── signals.py        # création des données initiales d'un nouvel utilisateur
├── admin.py
└── tests/
```

### Principes

| Principe | Mise en œuvre |
|---|---|
| Isolation | `core.api.UserOwnedViewSet` : chaque requête est limitée aux objets de l'utilisateur ; un objet d'un autre utilisateur renvoie **404**. Les clés étrangères passent par `OwnedPrimaryKeyRelatedField` |
| Suppression d'un objet utilisé | `on_delete=RESTRICT` ; l'API renvoie **409** et propose de désactiver ou d'archiver (catégorie, compte, activité, type de mesure) |
| Calculs | dans `selectors.py`, recalculés à chaque lecture (soldes, consommation des budgets, progression des objectifs, statistiques) ; un nombre de requêtes SQL constant par liste |
| Périodes | `core.periods` : semaine ISO (lundi-dimanche), mois et année calendaires, dans le fuseau de l'utilisateur ; paramètre `?date=` pour la date de référence |
| Contraintes conditionnelles | MariaDB ne gère pas les contraintes d'unicité conditionnelles : elles sont vérifiées par les serializers (budget global, séance en cours unique…) |
| Tableau de bord | `dashboard/selectors.py` assemble les calculs existants des autres domaines, sans les dupliquer |

## 5. Application mobile

### Communication avec l'API

| Élément | Choix |
|---|---|
| URL de l'API | `EXPO_PUBLIC_API_URL` dans `mobile/.env` (production, commité) ; `mobile/.env.local` (ignoré) pour pointer ailleurs |
| Client HTTP | `src/api/client.ts`, basé sur `fetch` : seul endroit qui connaît les URL ; délai maximal de 20 s |
| Jetons | `access` en mémoire ; `refresh` dans `expo-secure-store` |
| Renouvellement | sur un 401 : **un seul** renouvellement partagé entre les requêtes simultanées, puis une seule nouvelle tentative ; un second échec déconnecte (pas de boucle) |
| Session | restaurée au démarrage depuis le jeton chiffré ; l'écran de démarrage reste affiché pendant la vérification |
| Garde de navigation | `Stack.Protected` : écrans de l'application réservés aux utilisateurs connectés, écrans d'accès aux autres |
| Formulaires | React Hook Form + Zod ; les erreurs du backend s'affichent sous les champs (`src/forms/api-errors.ts`) |
| Erreurs | `ApiError` (réponse en échec, avec erreurs par champ) et `NetworkError` (serveur injoignable) |

### Cache et invalidation

- Clés : `[domaine, objet, 'list' | 'detail', …]` (`finance`, `workouts`, `body`) et `['dashboard']`.
- Une écriture n'est considérée réussie qu'après la réponse du backend. Elle invalide alors **tout son domaine** (une transaction change soldes, budgets et objectifs) et le **tableau de bord**. Les listes affichées sont rechargées ; les détails sont seulement marqués périmés, ce qui évite un 404 sur un objet supprimé.
- Une modification du profil (devise, fuseau) invalide tout le cache, sauf le profil lui-même. La déconnexion vide le cache.

### Montants et dates

- Les montants restent des **chaînes décimales exactes** entre l'API et les formulaires ; la conversion en nombre ne sert qu'à l'affichage.
- Les dates `YYYY-MM-DD` sont calculées dans le fuseau du téléphone (`src/utils/dates.ts`), jamais via `toISOString()` (UTC). Les séances sont stockées en UTC et affichées dans le fuseau du téléphone.

### Écrans

| Écran | Contenu |
|---|---|
| Accueil | une seule requête `GET /dashboard/` : séance en cours, solde estimé des comptes actifs et bilan du mois, budgets, sport du mois, objectifs sportifs, dernières transactions et séances ; un état vide par bloc avec une action |
| Finances | transactions (recherche, filtres, tri, pagination), comptes, transferts, budgets, objectifs d'épargne, catégories |
| Sport | séance en cours (chronomètre, **glisser pour terminer**), résumé de la semaine ou du mois, objectifs, historique filtrable par activité ; séances passées, activités, objectifs sportifs |
| Statistiques | revenus et dépenses sur 6 mois, répartition du mois par catégorie, activité sportive sur 8 semaines ou 6 mois, courbe d'une mesure corporelle |
| Mesures corporelles | types de mesure (dernière valeur), courbe sur 6 mois, historique ; une valeur par type et par jour |
| Profil | informations, devise, fuseau, mot de passe, suppression du compte, déconnexion |

Chaque écran gère le chargement, l'erreur réseau (« Réessayer »), les erreurs de validation et l'absence de données.

### Graphiques

- Toutes les valeurs viennent du backend ; `features/stats/chart-data.ts` ne fait que les convertir pour l'affichage et choisir les libellés.
- 5 couleurs de série en ordre fixe (`components/charts/chart-theme.ts`), vérifiées pour le daltonisme sur les fonds clair et sombre ; chaque graphique écrit aussi ses valeurs en clair (légende, panneau de détail).
- Au-delà de 5 catégories, les plus petites sont regroupées dans « Autres ».
- Courbe d'une mesure : seules les valeurs saisies sont tracées (aucune interpolation), à intervalles réguliers (un point par mesure) ; l'axe vertical ne part pas de 0.

### Barre de navigation

Icône en contour au repos et pleine sur l'onglet actif, sur une pastille Material 3. Android : `MaterialCommunityIcons` ; iOS : SF Symbols. Les noms sont dans `src/constants/tabs.ts`.

## 6. Conventions

- **Python** : PEP 8, `ruff check` et `ruff format`, lignes de 100 caractères. La logique métier va dans `services.py` et `selectors.py`, pas dans les vues.
- **TypeScript** : mode `strict`, ESLint (`expo lint`) et Prettier. Aucune URL d'API dans les composants.
- Commentaires et documentation en français ; identifiants de code en anglais.
- **Configuration** : secrets lus uniquement depuis l'environnement (`backend/.env` en local, ignoré par Git ; variables de Setup Python App en production). `.env.example` liste toutes les variables, sans valeurs réelles.
- **Tests** : backend `pytest` + `pytest-django` + `factory_boy`, avec des tests d'isolation entre utilisateurs dans chaque domaine ; mobile Jest (`jest-expo`) + React Native Testing Library.
- **Git** : commits du type `feat(finance): …`, `fix(users): …`, `docs: …` ; une branche par évolution, fusionnée dans `main` après validation.

## 7. Points d'attention

- **Types des routes (`.expo/types/router.d.ts`)** : généré par `npx expo start`. Au démarrage, le fichier est complet ; ensuite, à chaque modification, le serveur le réécrit dans une version incomplète (les routes `index` n'y figurent qu'avec le suffixe `/index`) et `tsc` refuse alors `/measurements` ou `/sport-goals`. Ne pas supprimer le fichier : relancer `npx expo start`, attendre quelques secondes, puis `npm run typecheck`.
- **Nouvelle dépendance native** : après un `npx expo install`, redémarrer Expo avec `--clear` et fermer complètement Expo Go ; sinon les modules sont rechargés à chaud dans l'application ouverte (erreur « Tried to register two views with the same name »).
