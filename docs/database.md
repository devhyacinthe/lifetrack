# Base de données

> Aucun modèle n'existe encore. Ce document fixe les conventions ; les modèles seront décrits à partir de la phase 2.

## 1. Environnements

| Environnement | Moteur | Configuration |
|---|---|---|
| Développement local | SQLite (`backend/db.sqlite3`, ignoré par Git) | par défaut dans `config.settings.dev` |
| Tests automatisés | SQLite par défaut ; PostgreSQL si `DATABASE_URL` le désigne | `config.settings.test` |
| Production (o2switch) | PostgreSQL | `DATABASE_URL` fourni par variable d'environnement |

La version de PostgreSQL proposée par o2switch reste à relever dans le cPanel. Django 5.2 exige PostgreSQL 14 ou plus récent.

## 2. Limites de SQLite à connaître

Le développement sur SQLite et la production sur PostgreSQL peuvent se comporter différemment :

- **Décimaux** : SQLite ne possède pas de vrai type décimal. Les agrégations (`Sum`, `Avg`) sur les montants peuvent produire des arrondis différents de PostgreSQL.
- **Contraintes** : SQLite vérifie moins strictement la longueur des `CharField` et certains types.
- **Concurrence** : SQLite ne gère pas `select_for_update()` comme PostgreSQL. Les transferts entre comptes ne sont donc pas testés en conditions concurrentes en local.
- **Recherche textuelle** : pas de fonctions de recherche spécifiques à PostgreSQL. On se limite à `icontains` tant que les tests ne tournent pas sur PostgreSQL.

**Règle :** les tests des calculs financiers (soldes, budgets, transferts) doivent aussi être exécutés sur PostgreSQL avant la mise en production. Il suffit de lancer `pytest` avec un `DATABASE_URL` PostgreSQL, sur une base locale, une base de test o2switch ou une CI. La solution sera choisie avant la phase 4.

## 3. Conventions de modélisation

- **Clés primaires** : `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` pour les objets exposés par l'API.
- **Propriété** : chaque objet privé possède `user = ForeignKey(settings.AUTH_USER_MODEL, on_delete=CASCADE)`, indexé.
- **Horodatage** : `created_at` (`auto_now_add`) et `updated_at` (`auto_now`) sur les modèles métier.
- **Montants** : `DecimalField(max_digits=15, decimal_places=2)`, jamais `FloatField`.
- **Devise** : `CharField(max_length=3)` avec un code ISO 4217, `XOF` par défaut.
- **Dates et heures** : `DateTimeField` stocké en UTC (`USE_TZ=True`) ; `DateField` quand seule la date a du sens.
- **Historique** : une catégorie utilisée n'est pas supprimée physiquement. Elle est désactivée (`is_active=False`) ou protégée par `on_delete=PROTECT`.
- **Intégrité** : on utilise `CheckConstraint` et `UniqueConstraint` (par exemple montant positif, intensité entre 1 et 10).
- **Migrations** : elles sont versionnées, jamais modifiées après avoir été appliquées en production, et toujours relues avant d'être commitées.
