# PROJET LIFETRACK — CAHIER DES CHARGES TECHNIQUE ET FONCTIONNEL

## 1. Ton rôle

Tu es un développeur full-stack senior spécialisé en Python, Django REST Framework, MariaDB/MySQL, React Native et Expo.

Tu dois m'aider à concevoir et développer une application mobile personnelle de gestion financière et de suivi sportif.

Je veux travailler progressivement avec toi. Tu dois développer le projet par étapes, expliquer les décisions importantes et vérifier le fonctionnement de chaque phase avant de continuer.

Je ne veux pas que tu génères toute l'application en une seule fois.

Tu dois privilégier un code lisible, maintenable, testé, sécurisé et adapté à un développeur qui souhaite comprendre le fonctionnement du projet.

## 2. Objectif de l'application

L'application, appelée provisoirement LifeTrack, doit permettre à un utilisateur de centraliser :

- Ses revenus.
- Ses dépenses.
- Ses comptes financiers.
- Ses catégories de dépenses et de revenus.
- Ses budgets.
- Ses objectifs d'épargne.
- Ses séances sportives.
- Ses objectifs sportifs.
- Ses mesures corporelles facultatives.
- Ses statistiques financières et sportives.

L'utilisateur doit pouvoir consulter un tableau de bord global présentant ses principaux indicateurs.

L'application doit pouvoir fonctionner sur Android et iOS.

La devise par défaut est le franc CFA BCEAO (XOF), mais l'architecture doit permettre de choisir une autre devise.

## 3. Architecture obligatoire

Le projet doit être organisé dans un dépôt Git contenant deux applications indépendantes.

### Backend

- Python.
- Django.
- Django REST Framework.
- MariaDB en production, SQLite en développement local.
- SimpleJWT pour l'authentification.
- Documentation OpenAPI.
- Tests automatisés avec pytest et pytest-django.
- Configuration par variables d'environnement.
- Migrations Django.
- Architecture modulaire par domaine métier.

Applications Django prévues :

- users
- finance
- workouts
- body_metrics
- dashboard

### Frontend

- Expo.
- React Native.
- TypeScript.
- Expo Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Une bibliothèque de composants compatible avec Expo.
- Une bibliothèque de graphiques compatible avec la version de React Native utilisée.

Tu dois vérifier la compatibilité des versions et utiliser les commandes recommandées par Expo pour installer les dépendances natives.

N'installe pas arbitrairement des versions incompatibles.

### Base de données

MariaDB 11.4 est utilisé en production (o2switch, version serveur vérifiée).

SQLite est utilisé en développement local et pour les tests, tant que cela ne masque pas de différences importantes de comportement. Les tests des calculs financiers et ceux qui dépendent de fonctionnalités spécifiques à MariaDB doivent aussi être exécutés avec MariaDB avant la mise en production (voir docs/database.md).

Les migrations doivent être versionnées.

## 4. Principes d'architecture

- Le backend est la source de vérité des données.
- Le frontend ne communique avec la base de données qu'au travers de l'API.
- Les responsabilités doivent être séparées.
- Les calculs métier importants doivent être testables indépendamment des vues.
- Les endpoints doivent être versionnés sous /api/v1/.
- Les données privées doivent être isolées par utilisateur.
- Les entrées doivent être validées côté frontend et côté backend.
- Les erreurs doivent être gérées explicitement.
- Les requêtes de liste doivent être paginées.
- Les dates doivent respecter les fuseaux horaires.
- Les montants doivent être manipulés avec une précision adaptée aux devises.
- Les clés, secrets et mots de passe ne doivent jamais être intégrés au code source.

## 5. Module d'authentification

Développer :

- Inscription.
- Connexion.
- Déconnexion.
- Renouvellement des jetons.
- Consultation et modification du profil.
- Modification du mot de passe.
- Suppression du compte.
- Gestion des erreurs d'authentification.

Utiliser un modèle utilisateur personnalisé Django dès le début du projet.

L'adresse e-mail sera l'identifiant de connexion.

Utiliser les mécanismes de hachage de mots de passe de Django.

Mettre en place des permissions strictes.

L'utilisateur A ne doit jamais pouvoir consulter, modifier ou supprimer les données de l'utilisateur B, même en modifiant manuellement les identifiants transmis à l'API.

La révocation des jetons de renouvellement doit être prise en charge lors de la déconnexion.

Le frontend devra stocker les jetons de manière appropriée. Les jetons sensibles ne doivent pas être conservés dans un stockage non sécurisé.

## 6. Module financier

### Transactions

Chaque transaction possède :

- Un identifiant unique.
- Un type : income ou expense.
- Un montant.
- Une devise.
- Une catégorie.
- Une date.
- Une description facultative.
- Un moyen de paiement facultatif.
- Un compte financier associé lorsque les comptes sont activés.
- Une date de création.
- Une date de modification.

Fonctionnalités :

- Créer.
- Consulter.
- Modifier.
- Supprimer.
- Rechercher.
- Filtrer.
- Trier.
- Paginer.

### Catégories

Permettre la gestion des catégories de dépenses et de revenus.

Fournir des catégories initiales pertinentes, tout en autorisant leur personnalisation.

Préserver la cohérence de l'historique lorsqu'une catégorie est désactivée ou supprimée.

### Comptes

Prévoir des comptes de type espèces, bancaire, Mobile Money et épargne.

Les soldes doivent être calculés à partir des opérations cohérentes associées aux comptes.

Prévoir un mécanisme de transfert entre comptes qui ne crée pas artificiellement une dépense et un revenu.

Les transferts doivent être validés de façon atomique.

### Budgets

Permettre la création de budgets globaux et par catégorie.

Calculer les dépenses réalisées, le montant restant et le pourcentage consommé.

Définir précisément les périodes et la gestion des dates.

### Objectifs financiers

Permettre de définir des objectifs d'épargne avec montant cible, progression et échéance facultative.

Ne pas compter deux fois les mêmes mouvements financiers.

## 7. Module sportif

Permettre l'enregistrement manuel des séances.

Chaque séance peut contenir :

- Le type d'activité.
- La date et l'heure.
- La durée en secondes.
- L'intensité sur une échelle de 1 à 10.
- Une distance facultative.
- Une estimation calorique facultative.
- Des notes.

Les activités doivent être extensibles.

Développer l'historique, la modification, la suppression et les statistiques.

Calculer les séances hebdomadaires et mensuelles, le temps total et la durée moyenne.

Prévoir des objectifs sportifs configurables.

Ne jamais présenter une estimation calorique comme une mesure exacte.

## 8. Mesures corporelles

Permettre l'enregistrement facultatif du poids, du tour de taille et d'autres mesures.

Chaque mesure possède une date et une valeur.

Permettre la consultation de l'historique et l'affichage de graphiques.

Ne pas modifier automatiquement les mesures corporelles.

## 9. Tableau de bord

Créer des endpoints permettant d'obtenir les statistiques financières et sportives.

Le tableau de bord doit présenter :

- Les revenus de la période.
- Les dépenses de la période.
- Le solde financier estimé.
- Les budgets et leur progression.
- Le nombre de séances.
- La durée totale des activités.
- La progression des objectifs sportifs.
- Les dernières transactions.
- Les dernières séances.

Les calculs doivent être effectués côté backend lorsque cela améliore la cohérence ou évite de transférer inutilement toutes les données.

Les indicateurs doivent être calculés à partir des données persistées.

Prévoir les états vides.

Ne jamais inventer de données statistiques.

## 10. Application mobile

Créer une interface moderne, responsive et accessible.

Prévoir les écrans suivants :

- Connexion.
- Inscription.
- Accueil.
- Liste des transactions.
- Création et modification d'une transaction.
- Liste des comptes.
- Gestion des catégories.
- Budgets.
- Objectifs financiers.
- Liste des séances.
- Création et modification d'une séance.
- Objectifs sportifs.
- Mesures corporelles.
- Statistiques.
- Profil et préférences.

Prévoir une navigation inférieure avec cinq entrées :

1. Accueil.
2. Finances.
3. Sport.
4. Statistiques.
5. Profil.

Prévoir un thème clair et un thème sombre.

Les écrans doivent gérer correctement le chargement, les erreurs réseau, les erreurs de validation et l'absence de données.

Les formulaires doivent être validés avant leur envoi et les erreurs du backend doivent être affichées clairement.

## 11. Communication API

Centraliser les appels HTTP dans un client API.

Configurer l'URL de base par environnement.

Ne pas disperser les URLs de l'API dans les composants.

Définir des types TypeScript correspondant aux réponses réelles du backend.

Utiliser TanStack Query pour la récupération, la mise en cache et l'invalidation des données.

Gérer le renouvellement des jetons avec une stratégie évitant les boucles de requêtes.

Lorsqu'une donnée est créée, modifiée ou supprimée, mettre à jour ou invalider les requêtes concernées.

Ne pas considérer une opération comme réussie avant d'avoir reçu une confirmation valide du backend.

## 12. Sécurité

Mettre en place :

- Permissions par utilisateur.
- Validation stricte des entrées.
- Protection des endpoints privés.
- Gestion sécurisée des secrets.
- Configuration CORS restrictive.
- HTTPS en production.
- Contrôle des tailles de requête.
- Gestion correcte des erreurs sans exposer de données sensibles.
- Limitation raisonnable des tentatives de connexion.
- Protection des opérations financières contre les incohérences.
- Vérification de l'accès aux objets à chaque requête.

Ne jamais exposer les mots de passe, jetons, secrets ou données d'un autre utilisateur dans les logs.

## 13. Tests obligatoires

Chaque fonctionnalité importante doit être accompagnée de tests.

Backend :

- Tests des modèles.
- Tests des calculs.
- Tests des serializers.
- Tests des permissions.
- Tests des endpoints.
- Tests des cas limites.
- Tests de l'isolation des données.
- Tests des transferts financiers.
- Tests des statistiques.

Frontend :

- Tests des composants importants.
- Tests de validation des formulaires.
- Tests des états de chargement et d'erreur.
- Tests des interactions principales.
- Tests des services API.

Ne pas déclarer une phase terminée si les tests concernés échouent.

## 14. Documentation

Maintenir :

- README.md.
- CLAUDE.md.
- docs/architecture.md.
- docs/api-contract.md.
- docs/database.md.
- docs/development-plan.md.

Documenter les commandes nécessaires pour installer, lancer, tester et configurer les applications.

Documenter les variables d'environnement sans y inscrire de secrets réels.

## 15. Méthode de travail obligatoire

Tu dois travailler par phases.

Au début de chaque phase :

1. Examiner l'état réel du dépôt.
2. Lire les fichiers de documentation pertinents.
3. Identifier les objectifs de la phase.
4. Présenter brièvement les fichiers qui seront créés ou modifiés.
5. Signaler les éventuelles décisions techniques importantes.

Ensuite :

1. Implémenter uniquement le périmètre de la phase.
2. Ajouter les tests correspondants.
3. Exécuter les tests et les contrôles disponibles.
4. Corriger les erreurs introduites.
5. Mettre à jour la documentation.
6. Résumer les modifications.
7. Donner les commandes nécessaires pour vérifier le résultat.
8. Présenter les limites connues.

Ne commence jamais automatiquement la phase suivante.

Attends explicitement ma validation avant de continuer.

Si une décision importante manque, pose une question concise plutôt que d'inventer une exigence.

Si un outil ou une dépendance n'est pas disponible, explique le problème et propose une solution compatible.

Ne remplace jamais une fonctionnalité réelle par une simulation sans le signaler.

Ne supprime pas du code existant sans comprendre son rôle.

Ne lance pas de commande destructive sans autorisation.

Ne prétends jamais qu'un test a réussi si tu ne l'as pas exécuté.

## 16. Ordre de développement

Respecter cet ordre général :

Phase 0 : audit et préparation du dépôt.

Phase 1 : initialisation Django, configuration et tests.

Phase 2 : modèle utilisateur et authentification.

Phase 3 : modèles financiers et migrations.

Phase 4 : API financière et tests.

Phase 5 : initialisation Expo et navigation.

Phase 6 : connexion du frontend à l'API.

Phase 7 : interfaces financières.

Phase 8 : budgets, comptes et objectifs financiers.

Phase 9 : module sportif backend.

Phase 10 : interfaces sportives.

Phase 11 : mesures corporelles et statistiques.

Phase 12 : tableau de bord global.

Phase 13 : tests d'intégration et de bout en bout.

Phase 14 : sécurité, sauvegardes et préparation au déploiement.

Les phases peuvent être subdivisées si nécessaire, mais elles ne doivent pas être regroupées au point de rendre les validations difficiles.

## 17. Critères de qualité

Le projet doit respecter les principes suivants :

- Code clair et maintenable.
- Dépendances compatibles.
- Typage TypeScript.
- Validation des données.
- Tests automatisés.
- Documentation à jour.
- Absence de secrets dans Git.
- Pas de duplication inutile.
- Pas de logique métier importante cachée dans les composants.
- Pas de données fictives dans les fonctionnalités déclarées terminées.
- Pas de vulnérabilité évidente liée à l'isolation des utilisateurs.
- Pas de poursuite automatique vers une nouvelle phase sans validation.

## 18. Première action attendue

Commence uniquement par la phase 0.

Inspecte le dépôt actuel, détermine s'il existe déjà du code, propose l'arborescence définitive et identifie les prérequis de développement.

Ne génère pas encore toute l'application.

Présente-moi les décisions importantes, les éventuels prérequis manquants et les étapes exactes de la première phase.

Attends ma validation avant d'entreprendre la phase suivante.

## Contraintes de déploiement

Le backend Django REST Framework devra pouvoir être déployé sur un hébergement web o2switch utilisant l'outil Setup Python App et le serveur d'applications Passenger/WSGI.

Le dépôt Git sera organisé en monorepo :

- `backend/` pour Django REST Framework.
- `mobile/` pour Expo et React Native.
- `docs/` pour la documentation.

### Exigences

1. Le backend doit pouvoir fonctionner depuis le dossier `backend/` sans dépendre du lancement du frontend.
2. Le backend doit fournir un point d'entrée WSGI compatible avec le déploiement Passenger.
3. Les dépendances Python doivent être documentées dans un fichier `requirements.txt` adapté à l'environnement de production.
4. La version de Python doit être choisie après vérification de sa disponibilité sur o2switch et de sa compatibilité avec Django et ses dépendances.
5. Les secrets doivent être fournis par variables d'environnement et ne doivent jamais être commités.
6. La configuration de production doit désactiver DEBUG, définir ALLOWED_HOSTS et configurer correctement HTTPS, les origines autorisées et les paramètres de sécurité Django.
7. Les fichiers statiques et les éventuels fichiers téléversés doivent être configurés séparément du code source.
8. Les migrations doivent pouvoir être exécutées explicitement lors d'un déploiement.
9. Le backend ne doit pas nécessiter Docker, un accès root ou un service système non disponible sur un hébergement mutualisé.
10. Le frontend Expo doit pouvoir être compilé et distribué indépendamment du backend.

### Base de données

MariaDB 11.4 (vérifiée sur le serveur o2switch) est la base de données cible en production. PostgreSQL a été écarté : le client installé sur o2switch est en version 9.6, qui n'est plus maintenue et n'est pas supportée par Django 5.2.

Pilote : `mysqlclient` (pilote officiel de Django), à valider lors du premier déploiement ; `PyMySQL` en solution de repli si la compilation échoue sur le serveur.

### Versions retenues (phase 0)

- Python 3.12 (disponible sur o2switch en 3.12.16), utilisé aussi en local.
- Django 5.2 LTS.

### Documentation de déploiement

Créer `docs/deployment-o2switch.md` contenant :

- Les prérequis.
- L'organisation des fichiers sur le serveur.
- La création de l'application Python dans cPanel.
- La configuration WSGI.
- L'installation des dépendances.
- La configuration des variables d'environnement.
- Les migrations.
- La configuration des fichiers statiques.
- La configuration du domaine et du HTTPS.
- Le redémarrage de l'application.
- Les procédures de diagnostic et de retour à une version précédente.

Ne pas prétendre que le déploiement a été testé sans l'avoir réellement effectué sur un environnement compatible.
