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
| 405 | Méthode non autorisée (ex. `PUT` : utiliser `PATCH`) | `{ "detail": "…" }` |
| 409 | Suppression d'un objet encore utilisé (compte, catégorie) | `{ "detail": "…" }` |
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

## 3 bis. Authentification (phase 2)

Jetons JWT (SimpleJWT) :

| Jeton | Durée de vie | Utilisation |
|---|---|---|
| `access` | 15 minutes | en-tête `Authorization: Bearer <access>` |
| `refresh` | 7 jours | obtenir une nouvelle paire ; **à usage unique** (rotation, l'ancien est révoqué) |

| Méthode | URL | Auth | Corps | Réponse |
|---|---|---|---|---|
| POST | `/api/v1/auth/register/` | non | `email`, `password`, `first_name?`, `last_name?` | 201 + profil |
| POST | `/api/v1/auth/login/` | non | `email`, `password` | 200 `{access, refresh}` ; 401 si identifiants invalides |
| POST | `/api/v1/auth/token/refresh/` | non | `refresh` | 200 `{access, refresh}` (nouvelle paire) ; 401 si révoqué ou expiré |
| POST | `/api/v1/auth/logout/` | oui | `refresh` | 204 ; 400 si jeton invalide, déjà révoqué ou appartenant à un autre utilisateur |
| GET | `/api/v1/auth/me/` | oui | — | 200 + profil |
| PATCH | `/api/v1/auth/me/` | oui | `first_name`, `last_name`, `preferred_currency`, `timezone` | 200 + profil |
| POST | `/api/v1/auth/me/password/` | oui | `current_password`, `new_password` | 204 ; **révoque toutes les sessions** |
| POST | `/api/v1/auth/me/delete/` | oui | `password` | 204 ; suppression définitive du compte et de ses données |

Profil renvoyé :

```json
{
  "id": "6f1c…-uuid",
  "email": "ama@example.com",
  "first_name": "Ama",
  "last_name": "Mensah",
  "preferred_currency": "XOF",
  "timezone": "Africa/Lome",
  "date_joined": "2026-10-30T16:20:00Z"
}
```

Règles :

- L'e-mail est normalisé en minuscules. La connexion est insensible à la casse.
- L'e-mail n'est pas modifiable via `PATCH /me/`. `PUT` n'est pas accepté.
- `preferred_currency` : code ISO 4217 en majuscules (`XOF`, `EUR`…). `timezone` : nom IANA (`Africa/Lome`, `Europe/Paris`…).
- Les mots de passe sont soumis aux validateurs de Django (longueur minimale, mots de passe courants, uniquement numériques, trop proches de l'e-mail ou du nom) et limités à 128 caractères.
- Un e-mail inconnu et un mauvais mot de passe renvoient exactement la même erreur 401.
- **Limitation des tentatives :** 5 requêtes par minute et par adresse IP sur `login/`, et 10 par heure sur `register/`. Au-delà, la réponse est **429**. Toutes les tentatives sont comptées, réussies ou non.
- Un jeton d'un compte désactivé ou supprimé est refusé (401).

## 3 ter. Finances (phase 4)

Tous les endpoints exigent un jeton. Ils sont **limités aux données de l'utilisateur connecté** : l'objet d'un autre utilisateur renvoie 404, et son identifiant utilisé dans un corps de requête renvoie 400 `"Objet introuvable."`. Méthodes : `GET` (liste et détail), `POST`, `PATCH` et `DELETE` ; `PUT` n'est pas accepté.

### Comptes : `/api/v1/finance/accounts/`

```json
{
  "id": "uuid", "name": "Banque", "type": "bank", "currency": "XOF",
  "initial_balance": "100000.00", "balance": "67500.00", "is_archived": false,
  "created_at": "…", "updated_at": "…"
}
```

- `type` : `cash`, `bank`, `mobile_money`, `savings`.
- `balance` : lecture seule, calculé (solde initial + revenus − dépenses ± transferts).
- `currency` : facultative à la création (devise préférée de l'utilisateur par défaut). **Non modifiable une fois que le compte a des opérations.**
- Le nom est unique par utilisateur.
- Filtres : `type`, `is_archived`, `currency`. Recherche : `search` (nom). Tri : `ordering=name|created_at`.
- `DELETE` d'un compte qui a des opérations : **409**. Il faut l'archiver (`PATCH {"is_archived": true}`).

### Catégories : `/api/v1/finance/categories/`

```json
{ "id": "uuid", "name": "Alimentation", "type": "expense", "is_active": true, "created_at": "…", "updated_at": "…" }
```

- Le nom est unique par utilisateur et par type. **Le `type` n'est pas modifiable** après la création.
- Filtres : `type`, `is_active`. Recherche : `search`. Tri : `ordering=name|type|created_at`.
- `DELETE` d'une catégorie utilisée : **409**. Il faut la désactiver (`PATCH {"is_active": false}`).

### Transactions : `/api/v1/finance/transactions/`

```json
{
  "id": "uuid", "type": "expense", "amount": "12500.00", "currency": "XOF",
  "account": "uuid", "account_name": "Banque",
  "category": "uuid", "category_name": "Alimentation",
  "date": "2026-10-28", "description": "Marché", "payment_method": "mobile_money",
  "created_at": "…", "updated_at": "…"
}
```

- Obligatoires : `type`, `amount`, `account`, `category`, `date`. Facultatifs : `description`, `payment_method` (`cash`, `card`, `mobile_money`, `bank_transfer`, `check`, `other`).
- `amount` : chaîne décimale, au minimum `0.01`, au plus 2 décimales et 13 chiffres avant la virgule.
- `currency`, `account_name`, `category_name` : lecture seule.
- La catégorie doit être du même type que la transaction.
- Un compte archivé ou une catégorie désactivée sont refusés pour une **nouvelle** opération. Les opérations existantes restent modifiables.
- Filtres : `type`, `account`, `category`, `payment_method`, `date_after`, `date_before` (bornes incluses, `YYYY-MM-DD`), `amount_min`, `amount_max`.
- Recherche : `search` (description). Tri : `ordering=date|-date|amount|-amount|created_at` (par défaut `-date`).

### Transferts : `/api/v1/finance/transfers/`

```json
{
  "id": "uuid", "from_account": "uuid", "from_account_name": "Banque",
  "to_account": "uuid", "to_account_name": "Espèces",
  "amount": "20000.00", "currency": "XOF", "date": "2026-10-29", "description": "",
  "created_at": "…", "updated_at": "…"
}
```

- Comptes **distincts**, appartenant à l'utilisateur et **de même devise**.
- Un transfert ne crée ni revenu ni dépense : il modifie seulement les soldes des deux comptes.
- Filtres : `account` (compte débité **ou** crédité), `date_after`, `date_before`. Recherche : `search`. Tri : `ordering=date|amount|created_at`.

### Budgets : `/api/v1/finance/budgets/` (phase 8a)

```json
{
  "id": "uuid", "category": "uuid", "category_name": "Alimentation",
  "amount": "60000.00", "currency": "XOF", "period": "monthly",
  "period_start": "2026-11-01", "period_end": "2026-11-30",
  "spent": "12500.00", "remaining": "47500.00", "percent_used": "20.8",
  "created_at": "…", "updated_at": "…"
}
```

- Obligatoires : `amount` (≥ `0.01`), `period` (`weekly`, `monthly`, `yearly`). Facultatifs : `category` (`null` ou absent = **budget global**), `currency` (devise préférée par défaut).
- `category` : catégorie de **dépenses**, active pour un nouveau budget.
- Un seul budget par catégorie (ou global), période et devise : sinon 400 sur `category`.
- `period_start`, `period_end`, `spent`, `remaining`, `percent_used` : **lecture seule, calculés** pour la période qui contient la date de référence. `remaining` peut être négatif, et `percent_used` dépasser 100.
- Paramètre `date=YYYY-MM-DD` (liste, détail, et aussi réponses de `POST`/`PATCH`) : date de référence. Par défaut, aujourd'hui dans le fuseau de l'utilisateur. Une date invalide renvoie 400 sur `date`.
- Filtres : `period`, `currency`, `category`, `is_global`. Tri : `ordering=period|amount|created_at`.
- Supprimer un budget ne supprime aucune transaction. Une catégorie utilisée par un budget ne peut pas être supprimée (**409**).

### Objectifs d'épargne : `/api/v1/finance/goals/` (phase 8a)

```json
{
  "id": "uuid", "name": "Moto", "account": "uuid", "account_name": "Épargne",
  "currency": "XOF", "target_amount": "500000.00", "deadline": "2027-06-30",
  "current_amount": "125000.00", "remaining_amount": "375000.00",
  "percent": "25.0", "is_reached": false,
  "created_at": "…", "updated_at": "…"
}
```

- Obligatoires : `name`, `account`, `target_amount` (≥ `0.01`). Facultatif : `deadline` (pas dans le passé).
- `account` : compte de l'utilisateur, non archivé, **qui n'est rattaché à aucun autre objectif**.
- `current_amount` : **solde du compte** (lecture seule). `remaining_amount` ≥ 0, `percent` entre 0 et 100, `is_reached` vrai quand la cible est atteinte.
- Pour faire progresser un objectif, on fait un **transfert** vers son compte : il n'y a pas de versement propre à l'objectif, donc aucun double comptage.
- Recherche : `search` (nom). Tri : `ordering=name|deadline|target_amount|created_at`.
- Un compte rattaché à un objectif ne peut pas être supprimé (**409**) ; supprimer l'objectif ne touche pas au compte.

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

### 4.2 S'authentifier dans Swagger

1. Appeler `POST /api/v1/auth/register/` (*Try it out*) pour créer un compte de test.
2. Appeler `POST /api/v1/auth/login/` et copier la valeur `access` de la réponse.
3. Cliquer sur **Authorize** en haut de la page, coller le jeton (sans le préfixe `Bearer`) dans **jwtAuth** et valider.
4. Tous les appels suivants sont alors authentifiés. Le jeton `access` expire au bout de 15 minutes : refaire l'étape 2, ou appeler `POST /api/v1/auth/token/refresh/` avec le `refresh`.

Attention : après 5 connexions en une minute, `login/` répond 429. Il suffit d'attendre une minute.

### 4.2 bis Parcours de vérification de l'authentification

| # | Action | Résultat attendu |
|---|---|---|
| 1 | `register/` avec un mot de passe faible (`12345678`) | 400, erreur sur `password` |
| 2 | `register/` avec un mot de passe solide | 201, sans champ `password` dans la réponse |
| 3 | `login/` avec l'e-mail en MAJUSCULES | 200, `access` et `refresh` |
| 4 | **Authorize**, puis `GET me/` | 200, ton profil |
| 5 | `PATCH me/` avec `{"timezone": "Mars/Olympus"}` | 400 |
| 6 | `token/refresh/` avec le `refresh`, puis encore avec **le même** `refresh` | 200, puis 401 |
| 7 | `logout/` avec le nouveau `refresh` | 204 ; un `token/refresh/` avec ce jeton renvoie 401 |
| 8 | **Logout** dans la fenêtre Authorize, puis `GET me/` | 401 |
| 9 | `me/password/` avec un mauvais `current_password` | 400 |
| 10 | `me/delete/` avec le bon mot de passe | 204 ; `GET me/` renvoie ensuite 401 |

### 4.3 Scénario de vérification de l'isolation des données

1. Créer deux comptes, A et B.
2. Avec le jeton de A, créer un objet (par exemple une transaction) et noter son `id`.
3. Cliquer sur **Authorize**, se déconnecter, puis s'authentifier avec le jeton de B.
4. Appeler `GET`, `PATCH` et `DELETE` sur l'`id` de A : la réponse attendue est **404** à chaque fois.
5. Lister les objets de B : l'objet de A ne doit pas apparaître.
6. Avec B, créer une transaction en utilisant l'`id` du compte de A : la réponse attendue est **400** `"Objet introuvable."`.
7. Avec A, supprimer un compte qui a des transactions : la réponse attendue est **409**.

Ce scénario manuel complète les tests automatisés d'isolation ; il ne les remplace pas.

### 4.4 Valider le schéma OpenAPI

```bash
cd backend
python manage.py spectacular --validate --fail-on-warn --file schema.yml
```

La commande doit se terminer sans avertissement. Le fichier `schema.yml` généré peut aussi être importé dans Postman, Insomnia ou Bruno pour des tests manuels. Il sera aussi utilisé en phase 6 pour vérifier les types TypeScript du mobile.

### 4.5 Tester le backend déployé sur o2switch

Même procédure, avec `https://<domaine-api>/api/docs/` tant que la documentation est accessible en production. Ne pas utiliser de comptes contenant des données réelles pour ces essais.
