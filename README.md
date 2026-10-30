# LifeTrack

Application mobile personnelle de gestion financière et de suivi sportif.

> **État : phase 0 (préparation).** Aucun code applicatif n'existe encore. Voir [docs/development-plan.md](docs/development-plan.md).

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

En local, la base est SQLite : aucun serveur de base de données n'est nécessaire. La production utilise PostgreSQL.

## Installation et lancement

Les commandes seront documentées ici au fil des phases (backend en phase 1, mobile en phase 5).

## Sécurité

Aucun secret ne doit être commité. Les variables d'environnement sont documentées dans les fichiers `.env.example` (sans valeurs réelles).
