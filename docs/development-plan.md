# Plan de développement

Chaque phase se termine par : tests exécutés et réussis, documentation à jour, résumé, puis **validation explicite** avant la phase suivante.

**Choix de l'utilisateur (phase 5) :** les tests de l'application mobile (Jest, `expo-doctor`) sont écrits au fil des phases mais **exécutés en fin de projet (phase 13)**, et il n'y a pas d'intégration continue pour le mobile. Le backend garde sa CI (`.github/workflows/backend.yml`).

**Choix de l'utilisateur (phase 8) :** budgets **récurrents** (hebdomadaires, mensuels ou annuels) ; objectifs d'épargne **rattachés à un compte**, dont la progression est le solde (pas de versements propres à l'objectif) ; phase découpée en **8a** (backend) puis **8b** (mobile).

**Choix de l'utilisateur (phase 10) :** une séance est **démarrée** (« en cours ») puis **terminée** en la glissant ; la durée (temps écoulé, modifiable), l'intensité, la distance et les calories se saisissent à la fin. Une séance passée peut aussi être ajoutée directement terminée. Une seule séance en cours à la fois.

**Choix de l'utilisateur (phase 11) :** types de mesure **extensibles** (5 types initiaux) ; **une valeur par type et par jour** ; graphiques sur **6 mois** (finances, mesures) et **8 semaines** (sport) ; phase découpée en **11a** (backend) puis **11b** (mobile).

**Choix de l'utilisateur (phase 12) :** indicateurs du **mois en cours** ; solde estimé = comptes **non archivés** dans la devise préférée (autres devises affichées à part) ; phase découpée en **12a** (backend) puis **12b** (mobile).

## Suivi des phases

| Phase | Périmètre | Statut |
|---|---|---|
| 0 | Audit et préparation du dépôt | ✅ terminée |
| 1 | Initialisation Django, configuration, tests, endpoint de santé, Swagger | ✅ terminée |
| 1b | Premier déploiement minimal sur o2switch (santé + Swagger) | ✅ terminée |
| 2 | Modèle utilisateur et authentification | ✅ terminée (déployée et vérifiée sur o2switch) |
| 3 | Modèles financiers et migrations | ✅ terminée (erreur 500 de l'admin corrigée) |
| 4 | API financière et tests | ✅ terminée : CI verte (SQLite + MariaDB 11.4) ; déploiement et conversion `utf8mb4` confirmés par l'utilisateur (sorties non transmises, à revérifier en phase 14 avec `convert_db_charset`) |
| 5 | Initialisation Expo et navigation | ✅ validée par l'utilisateur ; TypeScript, ESLint et Prettier OK ; ⚠️ **tests Jest et `expo-doctor` pas encore exécutés** (reportés en fin de projet, phase 13, à la demande de l'utilisateur) |
| 6 | Connexion du frontend à l'API | ✅ terminée (30/10/2026) : TypeScript, ESLint, Prettier OK ; types vérifiés contre le schéma OpenAPI de production ; parcours d'authentification et nouveau design validés par l'utilisateur sur Android (Expo Go, API de production) ; tests Jest écrits, non exécutés (phase 13) |
| 7 | Interfaces financières | ✅ terminée (01/11/2026) : liste des transactions (recherche, filtres, tri, pagination), création, modification, suppression, gestion des catégories ; TypeScript, ESLint, Prettier OK ; types vérifiés contre le schéma OpenAPI de production ; parcours validé par l'utilisateur sur Android (Expo Go, API de production) ; tests Jest écrits, non exécutés (phase 13) |
| 8a | Budgets et objectifs d'épargne : backend | ✅ terminée (01/11/2026) : modèles, migration `0003`, API, 52 nouveaux tests (260 réussis, 1 ignoré en local) ; schéma OpenAPI valide ; CI MariaDB, déploiement et vérification Swagger confirmés par l'utilisateur (sorties non transmises) |
| 8b | Comptes, transferts, budgets et objectifs : écrans mobiles | ✅ terminée (01/11/2026) : TypeScript, ESLint, Prettier OK ; parcours validé par l'utilisateur sur Android (Expo Go, API de production) ; tests Jest écrits, non exécutés (phase 13) |
| 9 | Module sportif backend | ✅ terminée (01/11/2026) : application `workouts` (activités, séances, objectifs, statistiques), migrations `0001` et `0002`, 55 nouveaux tests (315 réussis, 1 ignoré en local) ; schéma OpenAPI valide ; CI MariaDB, déploiement et vérification Swagger confirmés par l'utilisateur (sorties non transmises) |
| 10 | Interfaces sportives | ✅ terminée (01/11/2026), commitée par l'utilisateur : onglet Sport (résumé, séance en cours, objectifs, historique), séances (démarrer, terminer par glissement, séance passée, modifier, supprimer), activités, objectifs sportifs ; backend : statut des séances (migration `workouts.0003`, action `finish`, 15 nouveaux tests, 330 réussis) ; mobile : ESLint, Prettier OK, TypeScript OK avec un fichier de routes complet ; tests Jest écrits, non exécutés (phase 13) |
| 11a | Mesures corporelles et statistiques : backend | ✅ terminée (01/11/2026) : application `body_metrics` (types extensibles, mesures, séries), statistiques financières (totaux mensuels, par catégorie) et historique sportif ; 46 nouveaux tests (376 réussis, 1 ignoré en local) ; schéma OpenAPI valide ; CI MariaDB, déploiement et vérification Swagger confirmés par l'utilisateur (sorties non transmises) |
| 11b | Mesures corporelles et statistiques : écrans mobiles | ✅ terminée (01/11/2026), validée et commitée par l'utilisateur : onglet Statistiques (revenus et dépenses sur 6 mois, répartition par catégorie, activité sportive sur 8 semaines ou 6 mois, courbe d'une mesure), écrans des mesures corporelles (types, courbe, historique, ajout, modification, suppression), icônes de la barre du bas ; `react-native-gifted-charts` installée ; TypeScript, ESLint, Prettier OK ; tests Jest écrits, non exécutés (phase 13) |
| 12a | Tableau de bord : backend | 🔄 développée : application `dashboard`, `GET /api/v1/dashboard/` (mois en cours, solde des comptes actifs, budgets, séances, objectifs, dernières opérations) ; 11 nouveaux tests (387 réussis, 1 ignoré en local) ; schéma OpenAPI valide ; CI MariaDB, déploiement et vérification Swagger à faire |
| 12b | Tableau de bord : écran d'accueil | à faire |
| 13 | Tests d'intégration et de bout en bout | à faire |
| 14 | Sécurité, sauvegardes et préparation au déploiement | à faire |

La phase 1b permet de valider tôt Python 3.12, Passenger, le pilote MariaDB et MariaDB sur o2switch, plutôt que de découvrir des incompatibilités en phase 14.

## Plan de validation

Chaque phase backend comporte **deux niveaux de validation** :

1. les **tests automatisés** (`pytest`) ;
2. une **vérification manuelle via Swagger**, sans le mobile (procédure dans [api-contract.md §4](api-contract.md#4-tester-uniquement-le-backend-avec-swagger-et-openapi)).

| Phase | Tests automatisés | Vérification Swagger / manuelle |
|---|---|---|
| 1 | `pytest` vert ; `ruff check` ; `manage.py check` ; `check --deploy` avec les settings de prod sans erreur bloquante | `/api/v1/health/` répond 200 ; `/api/docs/` s'affiche ; `spectacular --validate` sans avertissement |
| 1b | — | santé et Swagger accessibles en HTTPS sur o2switch ; pilote MariaDB installé ; connexion à MariaDB confirmée par `/api/v1/health/` (pas de migration, pour garder la base vide avant le modèle utilisateur personnalisé de la phase 2) |
| 2 | inscription, connexion, refresh, déconnexion avec révocation, profil, mot de passe, suppression, throttling | parcours complet d'authentification avec le bouton **Authorize** ; un jeton révoqué est refusé |
| 3 | modèles, contraintes, migrations appliquées sans erreur, catégories initiales | admin Django : création d'objets cohérents |
| 4 | CRUD, filtres, tri, pagination, serializers, isolation entre utilisateurs, cas limites ; calculs financiers aussi exécutés sur MariaDB | scénario d'isolation A/B (404 attendu) ; pagination et filtres testés depuis Swagger |
| 5 | `npx expo-doctor` ; `npx tsc --noEmit` ; `expo lint` ; Jest | navigation à 5 onglets sur l'appareil ou l'émulateur ; thèmes clair et sombre |
| 6 | tests du client API et du renouvellement des jetons (pas de boucle) | connexion réelle à l'API locale ; types TypeScript comparés au schéma OpenAPI |
| 7 | validation des formulaires, états de chargement, d'erreur et vides | création, modification et suppression d'une transaction, vérifiées ensuite dans Swagger |
| 8 | transferts atomiques, soldes, budgets (périodes), objectifs sans double comptage | soldes affichés identiques à ceux renvoyés par l'API |
| 9 | modèles, API, statistiques hebdomadaires et mensuelles, isolation | séances et objectifs via Swagger |
| 10 | formulaires et états des écrans sportifs | parcours complet sur mobile |
| 11 | mesures, historique, statistiques | graphiques fondés sur des données réelles |
| 12 | indicateurs calculés depuis les données persistées, états vides | chiffres du tableau de bord recoupés avec Swagger |
| 13 | parcours de bout en bout | — |
| 14 | `check --deploy` en production ; revue de sécurité | déploiement **réellement effectué** sur o2switch ; retour arrière testé ; sauvegarde restaurée |
