# Base de données

> Aucun modèle n'existe encore. Ce document fixe les conventions ; les modèles seront décrits à partir de la phase 2.

## 1. Environnements

| Environnement | Moteur | Configuration |
|---|---|---|
| Développement local | SQLite (`backend/db.sqlite3`, ignoré par Git) | par défaut dans `config.settings.dev` |
| Tests automatisés | SQLite par défaut ; MariaDB si `DATABASE_URL` le désigne | `config.settings.test` |
| Production (o2switch) | **MariaDB 11.4.13** (version serveur vérifiée) | `DATABASE_URL` fourni par variable d'environnement |

**Pourquoi pas PostgreSQL :** o2switch propose PostgreSQL 9.6 (client vérifié), qui n'est plus maintenu depuis 2021 et n'est pas supporté par Django 5.2 (PostgreSQL 14 minimum). MariaDB 11.4 est une version LTS supportée par Django 5.2 (MariaDB 10.5 minimum).

## 2. Configuration MariaDB

- Encodage : `utf8mb4` (gère tous les caractères Unicode, y compris les emojis).
- Mode SQL : `STRICT_TRANS_TABLES`, pour qu'une valeur invalide ou trop longue provoque une erreur au lieu d'être tronquée.
- Moteur de tables : InnoDB (transactions et clés étrangères).
- Pilote : `mysqlclient`, avec `PyMySQL` en repli (voir [deployment-o2switch.md](deployment-o2switch.md)).

## 3. Limites de SQLite à connaître

Le développement sur SQLite et la production sur MariaDB peuvent se comporter différemment :

- **Décimaux** : SQLite ne possède pas de vrai type décimal. Les agrégations (`Sum`, `Avg`) sur les montants peuvent produire des arrondis différents de MariaDB.
- **Contraintes** : SQLite vérifie moins strictement la longueur des `CharField` et les types.
- **Concurrence** : SQLite verrouille la base entière ; `select_for_update()` n'y a pas d'effet. Les transferts entre comptes ne sont donc pas testés en conditions concurrentes en local.
- **Comparaisons de texte** : la collation de MariaDB est par défaut insensible à la casse, contrairement à SQLite. Une contrainte d'unicité sur un nom de catégorie, par exemple, peut se comporter différemment.

**Règle :** les tests des calculs financiers (soldes, budgets, transferts) doivent aussi être exécutés sur MariaDB avant la mise en production. Il suffit de lancer `pytest` avec un `DATABASE_URL` MariaDB, sur une base de test o2switch, une base locale ou une CI. La solution sera choisie avant la phase 4.

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
