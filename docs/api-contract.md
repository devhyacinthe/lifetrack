# Contrat de l'API

> Aucun endpoint n'existe encore. Ce document fixe les conventions, qui s'appliqueront dès la phase 1. Les endpoints seront ajoutés au fil des phases.

## 1. Conventions générales

- **Préfixe** : tous les endpoints métier sont sous `/api/v1/`.
- **Format** : JSON en UTF-8.
- **Authentification** : en-tête `Authorization: Bearer <access_token>` (SimpleJWT).
- **Identifiants** : UUID sous forme de chaîne.
- **Montants** : chaînes décimales (`"15000.00"`), pour éviter les erreurs d'arrondi en JavaScript.
- **Dates** : ISO 8601. `YYYY-MM-DD` pour les dates, et les dates-heures avec leur décalage (`2026-10-30T14:00:00Z`).
- **Pagination** : par numéro de page, 20 éléments par défaut, 100 au maximum.

  ```json
  { "count": 42, "next": "…?page=3", "previous": "…?page=1", "results": [ … ] }
  ```

- **Filtres et tri** : paramètres de requête (`?type=expense&date_after=…&ordering=-date&search=…`).

## 2. Erreurs

| Code | Cas | Corps |
|---|---|---|
| 400 | Validation | `{ "champ": ["message"], "non_field_errors": ["…"] }` |
| 401 | Jeton absent, invalide ou expiré | `{ "detail": "…", "code": "token_not_valid" }` |
| 403 | Action interdite | `{ "detail": "…" }` |
| 404 | Objet inexistant **ou appartenant à un autre utilisateur** | `{ "detail": "…" }` |
| 429 | Trop de tentatives | `{ "detail": "…" }` |
| 500 | Erreur serveur | message générique, sans détail interne |

## 3. Endpoints techniques prévus (phase 1)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/v1/health/` | état de l'API (sans authentification) |
| GET | `/api/schema/` | schéma OpenAPI 3 (YAML, ou JSON avec `?format=json`) |
| GET | `/api/docs/` | interface Swagger UI |
| GET | `/api/redoc/` | documentation ReDoc |

En production, l'accès à `/api/docs/` et `/api/redoc/` pourra être désactivé ou réservé aux administrateurs. Cette décision sera prise en phase 14.

## 4. Tester uniquement le backend avec Swagger et OpenAPI

Cette procédure permet de valider chaque phase backend **sans l'application mobile**.

### 4.1 Lancer le backend en local

```bash
cd backend
# activer l'environnement virtuel (voir README)
python manage.py migrate
python manage.py runserver
```

Ouvrir ensuite :

- Swagger UI : http://127.0.0.1:8000/api/docs/
- ReDoc : http://127.0.0.1:8000/api/redoc/
- Schéma brut : http://127.0.0.1:8000/api/schema/

### 4.2 S'authentifier dans Swagger (à partir de la phase 2)

1. Appeler `POST /api/v1/auth/register/` (*Try it out*) pour créer un compte de test.
2. Appeler `POST /api/v1/auth/login/` et copier la valeur `access` de la réponse.
3. Cliquer sur **Authorize** en haut de la page, coller le jeton (sans le préfixe `Bearer`) et valider.
4. Tous les appels suivants sont alors authentifiés. Quand le jeton expire, refaire l'étape 2 ou utiliser `POST /api/v1/auth/token/refresh/`.

Les URLs exactes seront confirmées en phase 2.

### 4.3 Scénario de vérification de l'isolation des données

1. Créer deux comptes, A et B.
2. Avec le jeton de A, créer un objet (par exemple une transaction) et noter son `id`.
3. Cliquer sur **Authorize**, se déconnecter, puis s'authentifier avec le jeton de B.
4. Appeler `GET`, `PATCH` et `DELETE` sur l'`id` de A : la réponse attendue est **404** à chaque fois.
5. Lister les objets de B : l'objet de A ne doit pas apparaître.

Ce scénario manuel complète les tests automatisés d'isolation ; il ne les remplace pas.

### 4.4 Valider le schéma OpenAPI

```bash
cd backend
python manage.py spectacular --validate --fail-on-warn --file schema.yml
```

La commande doit se terminer sans avertissement. Le fichier `schema.yml` généré peut aussi être importé dans Postman, Insomnia ou Bruno pour des tests manuels. Il sera aussi utilisé en phase 6 pour vérifier les types TypeScript du mobile.

### 4.5 Tester le backend déployé sur o2switch

Même procédure, avec `https://<domaine-api>/api/docs/` tant que la documentation est accessible en production. Ne pas utiliser de comptes contenant des données réelles pour ces essais.
