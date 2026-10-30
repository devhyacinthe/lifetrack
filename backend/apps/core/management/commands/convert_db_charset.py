"""
Convertit la base MariaDB et toutes ses tables en utf8mb4 (encodage du projet).

Sans --apply, la commande affiche seulement l'état actuel et les instructions prévues.
Faire une sauvegarde (mariadb-dump) avant de lancer avec --apply.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from config.settings.base import MYSQL_CHARSET, MYSQL_COLLATION


class Command(BaseCommand):
    help = "Convertit la base MariaDB et ses tables en utf8mb4 (affichage seul sans --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Exécute la conversion.")

    def handle(self, *args, apply=False, **options):
        if connection.vendor != "mysql":
            raise CommandError("Cette commande ne concerne que MariaDB/MySQL.")

        database = settings.DATABASES["default"]["NAME"]
        with connection.cursor() as cursor:
            cursor.execute("SELECT @@character_set_database, @@collation_database")
            charset, collation = cursor.fetchone()
            self.stdout.write(f"Base {database} : {charset} / {collation}")
            cursor.execute(
                "SELECT table_name, table_collation FROM information_schema.tables "
                "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            )
            tables = cursor.fetchall()

        to_convert = [name for name, coll in tables if coll != MYSQL_COLLATION]
        for name, coll in tables:
            marker = "à convertir" if name in to_convert else "ok"
            self.stdout.write(f"  {name:<45} {coll:<28} {marker}")

        statements = []
        if collation != MYSQL_COLLATION:
            statements.append(
                f"ALTER DATABASE `{database}` CHARACTER SET {MYSQL_CHARSET} "
                f"COLLATE {MYSQL_COLLATION}"
            )
        statements += [
            f"ALTER TABLE `{name}` CONVERT TO CHARACTER SET {MYSQL_CHARSET} "
            f"COLLATE {MYSQL_COLLATION}"
            for name in to_convert
        ]

        if not statements:
            self.stdout.write(self.style.SUCCESS("Rien à convertir."))
            return
        if not apply:
            self.stdout.write("\nInstructions prévues (relancer avec --apply pour les exécuter) :")
            for statement in statements:
                self.stdout.write(f"  {statement};")
            return

        with connection.cursor() as cursor:
            # Les clés étrangères relient des tables converties une par une.
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            try:
                for statement in statements:
                    self.stdout.write(f"  {statement}")
                    cursor.execute(statement)
            finally:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        self.stdout.write(self.style.SUCCESS(f"{len(statements)} instruction(s) exécutée(s)."))
