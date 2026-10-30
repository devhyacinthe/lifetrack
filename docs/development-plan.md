# Plan de développement

Chaque phase se termine par : tests exécutés et réussis, documentation à jour, résumé, puis **validation explicite** avant la phase suivante.

## Suivi des phases

| Phase | Périmètre | Statut |
|---|---|---|
| 0 | Audit et préparation du dépôt | ✅ terminée (en attente de validation) |
| 1 | Initialisation Django, configuration, tests, endpoint de santé, Swagger | à faire |
| 1b | Premier déploiement minimal sur o2switch (santé + Swagger) | à faire |
| 2 | Modèle utilisateur et authentification | à faire |
| 3 | Modèles financiers et migrations | à faire |
| 4 | API financière et tests | à faire |
| 5 | Initialisation Expo et navigation | à faire |
| 6 | Connexion du frontend à l'API | à faire |
| 7 | Interfaces financières | à faire |
| 8 | Budgets, comptes et objectifs financiers | à faire |
| 9 | Module sportif backend | à faire |
| 10 | Interfaces sportives | à faire |
| 11 | Mesures corporelles et statistiques | à faire |
| 12 | Tableau de bord global | à faire |
| 13 | Tests d'intégration et de bout en bout | à faire |
| 14 | Sécurité, sauvegardes et préparation au déploiement | à faire |

La phase 1b permet de valider tôt Python 3.12, Passenger, psycopg et PostgreSQL sur o2switch, plutôt que de découvrir des incompatibilités en phase 14.

## Plan de validation

Chaque phase backend comporte **deux niveaux de validation** :

1. les **tests automatisés** (`pytest`) ;
2. une **vérification manuelle via Swagger**, sans le mobile (procédure dans [api-contract.md §4](api-contract.md#4-tester-uniquement-le-backend-avec-swagger-et-openapi)).

| Phase | Tests automatisés | Vérification Swagger / manuelle |
|---|---|---|
| 1 | `pytest` vert ; `ruff check` ; `manage.py check` ; `check --deploy` avec les settings de prod sans erreur bloquante | `/api/v1/health/` répond 200 ; `/api/docs/` s'affiche ; `spectacular --validate` sans avertissement |
| 1b | — | santé et Swagger accessibles en HTTPS sur o2switch ; migrations appliquées sur PostgreSQL |
| 2 | inscription, connexion, refresh, déconnexion avec révocation, profil, mot de passe, suppression, throttling | parcours complet d'authentification avec le bouton **Authorize** ; un jeton révoqué est refusé |
| 3 | modèles, contraintes, migrations appliquées sans erreur, catégories initiales | admin Django : création d'objets cohérents |
| 4 | CRUD, filtres, tri, pagination, serializers, isolation entre utilisateurs, cas limites ; calculs financiers aussi exécutés sur PostgreSQL | scénario d'isolation A/B (404 attendu) ; pagination et filtres testés depuis Swagger |
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
