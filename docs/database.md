# Base de données

> Les modèles métier sont décrits au fil des phases (section 5).

## 1. Environnements

| Environnement | Moteur | Configuration |
|---|---|---|
| Développement local | SQLite (`backend/db.sqlite3`, ignoré par Git) | par défaut dans `config.settings.dev` |
| Tests automatisés | SQLite en mémoire par défaut ; MariaDB si `TEST_DATABASE_URL` le désigne | `config.settings.test` |
| Production (o2switch) | **MariaDB 11.4.13** (version serveur vérifiée) | `DATABASE_URL` fourni par variable d'environnement |

**Pourquoi pas PostgreSQL :** o2switch propose PostgreSQL 9.6 (client vérifié), qui n'est plus maintenu depuis 2021 et n'est pas supporté par Django 5.2 (PostgreSQL 14 minimum). MariaDB 11.4 est une version LTS supportée par Django 5.2 (MariaDB 10.5 minimum).

## 2. Configuration MariaDB

- Encodage : `utf8mb4` (gère tous les caractères Unicode, y compris les emojis).
- Mode SQL : `STRICT_TRANS_TABLES`, pour qu'une valeur invalide ou trop longue provoque une erreur au lieu d'être tronquée.
- Moteur de tables : InnoDB (transactions et clés étrangères).
- Pilote : `PyMySQL`, enregistré comme `MySQLdb` dans `backend/config/__init__.py`. `mysqlclient` est inutilisable sur o2switch, car sa compilation exige gcc, dont l'accès est refusé.

## 3. Limites de SQLite à connaître

Le développement sur SQLite et la production sur MariaDB peuvent se comporter différemment :

- **Décimaux** : SQLite ne possède pas de vrai type décimal. Les agrégations (`Sum`, `Avg`) sur les montants peuvent produire des arrondis différents de MariaDB.
- **Contraintes** : SQLite vérifie moins strictement la longueur des `CharField` et les types.
- **Concurrence** : SQLite verrouille la base entière ; `select_for_update()` n'y a pas d'effet. Les transferts entre comptes ne sont donc pas testés en conditions concurrentes en local.
- **Comparaisons de texte** : la collation de MariaDB est par défaut insensible à la casse, contrairement à SQLite. Une contrainte d'unicité sur un nom de catégorie, par exemple, peut se comporter différemment.

**Règle :** les tests des calculs financiers (soldes, budgets, transferts) doivent aussi être exécutés sur MariaDB avant la mise en production. Il suffit de lancer `pytest` avec `TEST_DATABASE_URL` pointant vers une base MariaDB dédiée aux tests (jamais la base de production : pytest crée et détruit une base `test_…`), sur une base de test o2switch, une base locale ou une CI. La solution sera choisie avant la phase 4.

## 4. Conventions de modélisation

- **Clés primaires** : `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` pour les objets exposés par l'API.
- **Propriété** : chaque objet privé possède `user = ForeignKey(settings.AUTH_USER_MODEL, on_delete=CASCADE)`, indexé.
- **Horodatage** : `created_at` (`auto_now_add`) et `updated_at` (`auto_now`) sur les modèles métier.
- **Montants** : `DecimalField(max_digits=15, decimal_places=2)`, jamais `FloatField`.
- **Devise** : `CharField(max_length=3)` avec un code ISO 4217, `XOF` par défaut.
- **Dates et heures** : `DateTimeField` stocké en UTC (`USE_TZ=True`) ; `DateField` quand seule la date a du sens.
- **Historique** : une catégorie utilisée n'est pas supprimée physiquement. Elle est désactivée (`is_active=False`) ou protégée par `on_delete=PROTECT`.
- **Intégrité** : on utilise `CheckConstraint` et `UniqueConstraint` (par exemple montant positif, intensité entre 1 et 10). MariaDB applique les `CheckConstraint`.
- **Migrations** : elles sont versionnées, jamais modifiées après avoir été appliquées en production, et toujours relues avant d'être commitées.

## 5. Modèles

### 5.1 `users.User` (phase 2)

Modèle utilisateur personnalisé (`AUTH_USER_MODEL = "users.User"`), défini dès la première migration.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | clé primaire |
| `email` | EmailField(254) | unique, identifiant de connexion, toujours enregistré en minuscules |
| `password` | hachage Django | jamais exposé par l'API |
| `first_name`, `last_name` | CharField(150) | facultatifs |
| `preferred_currency` | CharField(3) | code ISO 4217, `XOF` par défaut |
| `timezone` | CharField(64) | nom IANA validé, `Africa/Lome` par défaut (les comptes créés avant la phase 3 ont gardé `Africa/Abidjan`, même heure UTC+0) |
| `is_active`, `is_staff`, `is_superuser` | booléens | non modifiables via l'API |
| `date_joined`, `last_login` | DateTimeField (UTC) | |

L'unicité insensible à la casse de l'e-mail est garantie par la normalisation en minuscules dans `User.save()`. Un index fonctionnel sur `LOWER(email)` n'est pas utilisable : MariaDB ne supporte pas les index d'expression dans Django.

### 5.2 Tables techniques

| Table | Origine | Rôle |
|---|---|---|
| `token_blacklist_outstandingtoken` | SimpleJWT | jetons de renouvellement émis |
| `token_blacklist_blacklistedtoken` | SimpleJWT | jetons révoqués (déconnexion, rotation, changement de mot de passe) |
| `lifetrack_cache` | `createcachetable` | cache partagé (compteurs de limitation des tentatives) |

Les jetons expirés s'accumulent dans ces tables. Ils seront purgés régulièrement avec `python manage.py flushexpiredtokens` (tâche cron à mettre en place en phase 14).

### 5.3 Module financier (phase 3)

Tous les modèles héritent de `core.TimeStampedModel` (`id` UUID, `created_at`, `updated_at`) et appartiennent à un utilisateur (`user`, `on_delete=CASCADE`).

```
User ─┬─< Account ──┬─< Transaction >── Category >─┐
      │             ├─< Transfer (from_account)    │
      │             └─< Transfer (to_account)      │
      └──────────────────────────────────────────────┘ (chaque objet porte aussi user)
```

**`finance.Account`** : compte financier

| Champ | Règles |
|---|---|
| `name` | unique par utilisateur |
| `type` | `cash`, `bank`, `mobile_money`, `savings` |
| `currency` | ISO 4217 ; toutes les opérations du compte sont dans cette devise |
| `initial_balance` | Decimal(15,2), peut être négatif |
| `is_archived` | compte masqué mais conservé pour l'historique |

**`finance.Category`** : catégorie de revenus ou de dépenses

| Champ | Règles |
|---|---|
| `name` | unique par utilisateur et par type |
| `type` | `income` ou `expense` |
| `is_active` | une catégorie utilisée est désactivée plutôt que supprimée |

**`finance.Transaction`** : revenu ou dépense

| Champ | Règles |
|---|---|
| `type` | `income` ou `expense` (contrainte en base) |
| `amount` | Decimal(15,2), **strictement positif** (contrainte en base) ; le type donne le sens |
| `account` | obligatoire, du même utilisateur ; `RESTRICT` |
| `category` | obligatoire, du même utilisateur et du même type que la transaction ; `RESTRICT` |
| `date` | date sans heure (pas d'ambiguïté de fuseau horaire) |
| `description` | facultative, 255 caractères |
| `payment_method` | facultatif : `cash`, `card`, `mobile_money`, `bank_transfer`, `check`, `other` |

La devise d'une transaction est celle de son compte : elle n'est pas stockée une seconde fois.

**`finance.Transfer`** : transfert entre deux comptes

| Champ | Règles |
|---|---|
| `from_account`, `to_account` | comptes distincts (contrainte en base), du même utilisateur, de même devise ; `RESTRICT` |
| `amount` | Decimal(15,2), strictement positif (contrainte en base) |
| `date`, `description` | comme pour les transactions |

Un transfert est **un seul enregistrement**. Il ne crée ni dépense ni revenu, et ne fausse donc pas les statistiques. Son écriture est atomique par construction.

**Solde d'un compte**, calculé et jamais stocké (`finance.selectors.account_balance`) :

```
solde = solde initial + revenus − dépenses + transferts reçus − transferts émis
```

**Règles de suppression :**

- Un compte ou une catégorie utilisés ne peuvent pas être supprimés seuls (`RESTRICT`) : il faut les archiver ou les désactiver.
- La suppression d'un utilisateur supprime toutes ses données financières. `RESTRICT`, contrairement à `PROTECT`, autorise cette suppression en cascade.

**Où sont vérifiées les règles :**

| Règle | Où |
|---|---|
| Montant positif, type valide, comptes distincts, unicité des noms | contraintes MariaDB/SQLite |
| Compte et catégorie du même utilisateur, catégorie du bon type, même devise pour un transfert | `clean()` des modèles, appelé par `finance.services` avant toute écriture |

**Données initiales :** chaque nouvel utilisateur reçoit 11 catégories de dépenses, 6 de revenus et un compte « Espèces » dans sa devise préférée. Ces données sont créées par un signal `post_save` (`finance/signals.py`) ; la liste est dans `finance/defaults.py`. Les utilisateurs créés avant la phase 3 les ont reçues via la migration `finance.0002`.

### 5.4 Budgets et objectifs d'épargne (phase 8a)

Migration `finance.0003_budgets_and_savings_goals`.

**`finance.Budget`** : plafond de dépenses récurrent

| Champ | Règles |
|---|---|
| `category` | facultative : vide = **budget global** (toutes les dépenses) ; sinon catégorie de **dépenses** du même utilisateur ; `RESTRICT` |
| `amount` | Decimal(15,2), strictement positif (contrainte en base) |
| `currency` | ISO 4217, devise préférée par défaut ; seules les dépenses des comptes de cette devise sont comptées |
| `period` | `weekly`, `monthly` ou `yearly` (contrainte en base) |

Unicité : un budget par (catégorie, période, devise). Pour les budgets par catégorie, la contrainte est en base. Pour les budgets globaux (catégorie `NULL`), elle est vérifiée par le serializer : MariaDB ne gère pas les contraintes d'unicité conditionnelles, et deux `NULL` y sont toujours considérés comme différents.

**Périodes** (`finance.selectors.period_bounds`), bornes incluses :

| Période | Début | Fin |
|---|---|---|
| `weekly` | lundi (semaine ISO 8601) | dimanche |
| `monthly` | 1er du mois | dernier jour du mois (28 à 31, années bissextiles comprises) |
| `yearly` | 1er janvier | 31 décembre |

La période en cours est celle qui contient la date du jour **dans le fuseau horaire de l'utilisateur** (`users.User.timezone`). Les périodes passées se consultent avec une date de référence.

**Consommation**, calculée et jamais stockée (`finance.selectors.attach_budget_usage`) :

```
dépensé = somme des dépenses de la période (catégorie du budget, ou toutes), sur les comptes de la devise du budget
restant = montant − dépensé        (négatif en cas de dépassement)
pourcentage = dépensé × 100 / montant   (arrondi à 0,1 ; peut dépasser 100)
```

Les revenus et les transferts ne sont jamais comptés. Une seule requête SQL est faite par type de période présent, quel que soit le nombre de budgets.

**`finance.SavingsGoal`** : objectif d'épargne

| Champ | Règles |
|---|---|
| `name` | 100 caractères |
| `account` | compte du même utilisateur, **un seul objectif par compte** (`OneToOne`, contrainte en base) ; `RESTRICT` |
| `target_amount` | Decimal(15,2), strictement positif (contrainte en base) |
| `deadline` | facultative ; ne peut pas être fixée dans le passé (une échéance passée déjà enregistrée reste modifiable) |

**Progression** (`finance.selectors.goals_with_progress`) : le montant actuel est **le solde du compte**, calculé avec la même formule que les comptes, en une seule requête. Le montant restant n'est jamais négatif et le pourcentage est borné entre 0 et 100.

**Pas de double comptage :** un objectif ne stocke aucun versement. L'argent n'existe qu'une fois, dans le solde d'un compte, et un compte ne sert qu'à un seul objectif. Pour épargner, on fait un **transfert** vers le compte de l'objectif : ce n'est ni une dépense ni un revenu.

**Suppression :** une catégorie utilisée par un budget, ou un compte rattaché à un objectif, ne peut pas être supprimé (409). Supprimer un budget ou un objectif ne touche ni les transactions ni le compte.

### 5.5 Module sportif (phase 9)

Application `workouts`, migrations `0001_initial` et `0002_default_activities_for_existing_users`. Tous les modèles appartiennent à un utilisateur (`CASCADE`).

**`workouts.ActivityType`** : activité, propre à chaque utilisateur et extensible

| Champ | Règles |
|---|---|
| `name` | unique par utilisateur (contrainte en base), 60 caractères |
| `tracks_distance` | la distance a un sens pour cette activité (course, vélo…) |
| `is_active` | une activité utilisée est désactivée plutôt que supprimée |

Chaque nouvel utilisateur reçoit 10 activités (`workouts/defaults.py`), par un signal `post_save`. Les utilisateurs existants les reçoivent par la migration `0002`.

**`workouts.Workout`** : séance saisie manuellement

| Champ | Règles |
|---|---|
| `activity` | du même utilisateur ; `RESTRICT` |
| `started_at` | date et heure, stockées en UTC ; pas dans le futur (tolérance de 5 min, vérifiée par l'API) |
| `duration_seconds` | entier de 1 à 86 400 (24 h), contrainte en base |
| `intensity` | entier de 1 à 10, contrainte en base |
| `distance_km` | facultative, Decimal(7,2), strictement positive (contrainte en base) |
| `estimated_calories` | facultatif, entier ≥ 0 ; **toujours une estimation**, jamais une mesure |
| `notes` | facultatives, 1000 caractères |

**`workouts.WorkoutGoal`** : objectif sportif récurrent

| Champ | Règles |
|---|---|
| `metric` | `sessions` (nombre de séances), `duration` (secondes) ou `distance` (km) |
| `period` | `weekly` (du lundi au dimanche) ou `monthly` |
| `activity` | facultative : vide = toutes les activités ; `RESTRICT` |
| `target_value` | Decimal(10,2) > 0 ; nombre entier pour `sessions` et `duration` |

Un seul objectif par (mesure, période, activité). La contrainte est en base pour une activité donnée ; pour « toutes activités » (`NULL`), elle est vérifiée par le serializer, comme pour les budgets.

**Calculs** (`workouts/selectors.py`), jamais stockés :

- Les périodes sont calculées par `core.periods.period_bounds`, la même fonction que pour les budgets, dans le fuseau de l'utilisateur. Une séance compte pour le jour **local** où elle a commencé (`core.periods.local_day_range`).
- **Statistiques** : nombre de séances, durée totale, durée moyenne (arrondie à la seconde), distance totale, et détail par activité. Une période sans séance renvoie des zéros.
- **Progression** d'un objectif : la valeur atteinte sur la période, un pourcentage borné à 100, et `is_reached`. Une requête SQL par type de période présent.
