# LifeTracker

[![Backend](https://github.com/devhyacinthe/lifetrack/actions/workflows/backend.yml/badge.svg)](https://github.com/devhyacinthe/lifetrack/actions/workflows/backend.yml)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.2_LTS-092E20?logo=django&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

**Application mobile personnelle de gestion financière et de suivi sportif.**
Revenus, dépenses, comptes, budgets, objectifs d'épargne, séances de sport, objectifs sportifs, mesures corporelles et statistiques, réunis dans un tableau de bord.

Monorepo composé d'une **API REST Django** déployée sur un hébergement mutualisé (o2switch) et d'une **application Expo / React Native** pour Android et iOS.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage rapide](#démarrage-rapide)
- [Installer l'application sur Android (APK)](#installer-lapplication-sur-android-apk)
- [Déploiement du backend](#déploiement-du-backend)
- [Qualité et tests](#qualité-et-tests)
- [Documentation](#documentation)
- [Sécurité](#sécurité)

## Fonctionnalités

### Finances
- **Transactions** (revenus et dépenses) : création, modification, suppression, recherche, filtres (type, catégorie, période), tri et pagination.
- **Comptes** espèces, bancaires, Mobile Money et épargne : soldes **calculés** à partir des opérations, jamais saisis.
- **Transferts** entre comptes, enregistrés de façon atomique, sans créer de fausse dépense ni de faux revenu.
- **Catégories** personnalisables, fournies avec des catégories initiales ; une catégorie utilisée se désactive au lieu d'être supprimée, et l'historique reste intact.
- **Budgets** récurrents (semaine, mois, année), globaux ou par catégorie : dépensé, restant et pourcentage consommé.
- **Objectifs d'épargne** rattachés à un compte, avec une échéance facultative.
- Devise par défaut : **franc CFA (XOF)** ; chaque compte a sa devise, et les montants de devises différentes ne sont jamais additionnés.

### Sport
- **Séances** démarrées en direct, avec un chronomètre, puis **terminées en glissant la carte** ; la durée, l'intensité (1 à 10), la distance et les calories estimées se saisissent à la fin.
- Saisie de séances passées, historique groupé par jour et filtrable par activité.
- **Activités** extensibles (10 fournies) et **objectifs sportifs** hebdomadaires ou mensuels (nombre de séances, durée ou distance).
- Les calories sont toujours présentées comme une **estimation**.

### Mesures corporelles
- Types de mesure extensibles (poids, tours, masse grasse…), avec une valeur par type et par jour.
- Historique et courbe d'évolution ; les valeurs ne sont jamais modifiées par l'application.

### Statistiques et tableau de bord
- **Accueil** : solde estimé, revenus et dépenses du mois, budgets, sport du mois, objectifs, dernières transactions et séances, séance en cours.
- **Statistiques** : revenus et dépenses sur 6 mois, répartition par catégorie, activité sportive sur 8 semaines ou 6 mois, courbes des mesures.
- Tous les indicateurs sont calculés par le backend à partir des données enregistrées : aucune valeur n'est inventée, et chaque écran a un état vide.

### Compte et application
- Inscription, connexion (e-mail), profil (devise, fuseau horaire), changement de mot de passe, suppression du compte.
- Thèmes **clair et sombre**, navigation inférieure à 5 onglets, gestion des états de chargement, d'erreur réseau et de validation.

## Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Python 3.12, Django 5.2 LTS, Django REST Framework, SimpleJWT (rotation et révocation des jetons), django-filter, drf-spectacular (OpenAPI 3), WhiteNoise, PyMySQL |
| **Base de données** | MariaDB 11.4 en production, SQLite en développement |
| **Mobile** | Expo SDK 58, React Native 0.88, TypeScript (strict), Expo Router, TanStack Query, React Hook Form + Zod, React Native Paper (Material Design 3), react-native-gifted-charts, expo-secure-store |
| **Qualité** | pytest, pytest-django, factory_boy, ruff ; Jest, React Native Testing Library, ESLint, Prettier |
| **CI / déploiement** | GitHub Actions (tests sur SQLite et MariaDB 11.4) ; o2switch (Setup Python App, Passenger/WSGI) ; EAS Build pour l'application |

## Architecture

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

- **Le backend est la source de vérité** : soldes, budgets, statistiques et tableau de bord sont recalculés à chaque lecture, jamais stockés.
- **Isolation stricte des données** : chaque requête est limitée aux objets de l'utilisateur connecté. L'objet d'un autre utilisateur renvoie 404, même si l'on modifie l'identifiant à la main.
- **Montants exacts** : décimaux côté base, chaînes décimales dans l'API et dans les formulaires.
- **Fuseaux horaires** : stockage en UTC ; semaines et mois calculés dans le fuseau de chaque utilisateur.

Détails : [docs/architecture.md](docs/architecture.md).

## Structure du dépôt

```
lifetrack/
├── backend/                 # API Django REST Framework
│   ├── apps/
│   │   ├── core/            # santé, pagination, isolation par utilisateur, périodes
│   │   ├── users/           # utilisateur, authentification JWT, profil
│   │   ├── finance/         # comptes, catégories, transactions, transferts, budgets, objectifs
│   │   ├── workouts/        # activités, séances, objectifs sportifs, statistiques
│   │   ├── body_metrics/    # mesures corporelles
│   │   └── dashboard/       # indicateurs du tableau de bord
│   ├── config/              # réglages dev / test / prod, URL, WSGI
│   └── passenger_wsgi.py    # point d'entrée o2switch
├── mobile/                  # application « LifeTracker » (Expo)
│   ├── src/app/             # écrans (Expo Router)
│   ├── src/features/        # logique par domaine (requêtes, formulaires, cartes)
│   ├── src/components/      # composants réutilisables, graphiques
│   ├── src/api/             # client HTTP, endpoints, types
│   ├── app.json  eas.json   # configuration de l'application et de la compilation
│   └── __tests__/           # tests Jest
├── docs/                    # architecture, API, base de données, déploiement
└── .github/workflows/       # intégration continue du backend
```

## Démarrage rapide

### Prérequis

| Outil | Version |
|---|---|
| Python | 3.12 (avec [uv](https://docs.astral.sh/uv/) ou `venv`) |
| Node.js | ≥ 22.13 |
| Git | ≥ 2.36 |
| Téléphone | application **Expo Go** (développement) |

### Backend

```bash
cd backend
uv venv --python 3.12 .venv
uv pip install --python .venv -r requirements-dev.txt
source .venv/Scripts/activate        # Windows Git Bash ; Linux/macOS : source .venv/bin/activate

python manage.py migrate
python manage.py createcachetable    # cache de la limitation des tentatives
python manage.py createsuperuser     # facultatif : accès à /admin/
python manage.py runserver
```

En local, la base est SQLite : aucun serveur de base de données n'est nécessaire. Les variables d'environnement sont décrites dans [backend/.env.example](backend/.env.example).

| URL locale | Contenu |
|---|---|
| http://127.0.0.1:8000/api/docs/ | Swagger UI |
| http://127.0.0.1:8000/api/redoc/ | ReDoc |
| http://127.0.0.1:8000/api/v1/health/ | état de l'API et de la base |

### Application mobile

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec **Expo Go** ; le téléphone et le PC doivent être sur le même Wi-Fi, sinon utiliser `npx expo start --tunnel`.

L'adresse de l'API est dans `mobile/.env` (`EXPO_PUBLIC_API_URL`, l'API de production par défaut). Pour utiliser un backend local, créer `mobile/.env.local`, ignoré par Git, puis relancer avec `npx expo start --clear`.

Pour ajouter une dépendance, toujours utiliser `npx expo install <paquet>` : Expo choisit la version compatible avec le SDK.

## Installer l'application sur Android (APK)

Expo Go affiche sa propre icône. Pour avoir **LifeTracker comme une vraie application**, avec son icône, son nom et son écran de démarrage, on compile un APK avec **EAS Build**. La compilation se fait sur les serveurs d'Expo : ni Android Studio ni Java ne sont nécessaires.

1. **Créer un compte** gratuit sur [expo.dev](https://expo.dev/signup).
2. **Se connecter et lier le projet** (une seule fois) :
   ```bash
   cd mobile
   npx eas-cli@latest login
   npx eas-cli@latest init        # ajoute l'identifiant du projet EAS dans app.json
   ```
3. **Compiler l'APK** avec le profil `preview` de [mobile/eas.json](mobile/eas.json) :
   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```
   - À la première compilation, accepter la génération d'une clé de signature Android (« Generate a new Android Keystore » → **Yes**). Elle est conservée par EAS et réutilisée ensuite.
   - Compter environ 10 à 20 minutes ; le suivi est aussi visible sur expo.dev.
4. **Installer sur le téléphone** : à la fin, EAS affiche un lien et un QR code. Ouvrir le lien sur le téléphone, télécharger l'APK, puis l'ouvrir. Android demande d'autoriser l'installation depuis le navigateur (« Sources inconnues ») : autoriser, puis **Installer**.

L'application apparaît alors dans le tiroir d'applications avec l'icône LifeTracker (icône adaptative Android, `assets/images/`). Elle utilise l'API de production, définie dans le profil `preview`.

| Élément | Où le changer |
|---|---|
| Nom affiché | `expo.name` dans `mobile/app.json` |
| Icône, écran de démarrage | `mobile/assets/images/`, générés par `uv run --with pillow python tools/make_icons.py assets/images` |
| Identifiant Android | `expo.android.package` (`com.hyacinthedalmeida.lifetracker`) ; ne plus le changer après la première installation |
| Version | `expo.version` ; le numéro de build est géré par EAS |

Pour une nouvelle version, relancer l'étape 3 et installer le nouvel APK par-dessus l'ancien : les données restent sur le serveur, et la session est conservée.

## Déploiement du backend

Le backend tourne sur o2switch, avec Setup Python App, Passenger et MariaDB 11.4, sans Docker ni accès root. La procédure complète est dans [docs/deployment-o2switch.md](docs/deployment-o2switch.md) :
- création de l'application et variables d'environnement ;
- migrations, fichiers statiques et HTTPS ;
- mise à jour, sauvegarde et remise à zéro de la base ;
- diagnostic.

Mise à jour type, dans le Terminal cPanel :

```bash
git pull
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy
touch tmp/restart.txt
```

## Qualité et tests

### Backend

Environ 390 tests, répartis en 27 fichiers : modèles, calculs, serializers, permissions, endpoints, cas limites, transferts, statistiques, tableau de bord, et **isolation des données entre utilisateurs** dans chaque domaine.

```bash
cd backend
pytest
ruff check . && ruff format --check .
python manage.py makemigrations --check --dry-run
python manage.py spectacular --validate --fail-on-warn --file schema.yml
```

La CI GitHub Actions lance ces contrôles à chaque `git push`, sur SQLite **et sur MariaDB 11.4**, comme en production.

### Mobile

```bash
cd mobile
npm run typecheck        # TypeScript strict
npm run lint             # ESLint
npm run format:check     # Prettier
npm test                 # tests Jest : schémas, formatage, services API, composants
```

TypeScript, ESLint et Prettier sont vérifiés à chaque évolution. Les tests Jest sont écrits mais **n'ont pas été exécutés** : l'installation de leurs outils prenait trop de temps sur la connexion utilisée pendant le développement.

## Documentation

| Document | Contenu |
|---|---|
| [docs/architecture.md](docs/architecture.md) | choix techniques, arborescence, principes du backend et du mobile, conventions |
| [docs/api-contract.md](docs/api-contract.md) | endpoints, formats, erreurs, vérification manuelle avec Swagger |
| [docs/database.md](docs/database.md) | modèles, contraintes, calculs, différences SQLite / MariaDB |
| [docs/deployment-o2switch.md](docs/deployment-o2switch.md) | déploiement, mise à jour, sauvegarde, remise à zéro, retour arrière |

## Sécurité

- Mots de passe hachés par Django ; limitation des tentatives de connexion et d'inscription.
- Jetons JWT : `access` de courte durée gardé en mémoire, `refresh` stocké chiffré (`expo-secure-store`) et révoqué à la déconnexion.
- Isolation des données vérifiée à chaque requête et couverte par des tests.
- Production : HTTPS forcé, HSTS, CORS restreint, `DEBUG` désactivé, taille des requêtes limitée, erreurs sans détail interne.
- Aucun secret dans le dépôt : secrets en variables d'environnement, décrites sans valeurs réelles dans `backend/.env.example`. Seule l'URL publique de l'API est commitée (`mobile/.env`).

---

Projet personnel de **Ayité Hyacinthe Junior d'ALMEIDA**. Tous droits réservés.
