import pytest
from django.core.management import CommandError, call_command
from django.db import connection


@pytest.mark.django_db
@pytest.mark.skipif(connection.vendor == "mysql", reason="Vérifie le refus hors MariaDB.")
def test_command_refuses_non_mariadb_database():
    with pytest.raises(CommandError):
        call_command("convert_db_charset")


@pytest.mark.django_db
@pytest.mark.skipif(connection.vendor != "mysql", reason="Nécessite MariaDB (CI).")
def test_test_database_is_already_utf8mb4(capsys):
    # La base de test est créée en utf8mb4 (configure_mysql) : rien ne doit être converti.
    call_command("convert_db_charset")

    assert "Rien à convertir." in capsys.readouterr().out
