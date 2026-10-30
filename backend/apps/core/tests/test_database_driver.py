import importlib


def test_django_mysql_backend_loads_with_pymysql():
    # Échoue si PyMySQL n'est pas enregistré ou si Django refuse sa version déclarée.
    base = importlib.import_module("django.db.backends.mysql.base")

    assert base.Database.__name__ == "pymysql"
