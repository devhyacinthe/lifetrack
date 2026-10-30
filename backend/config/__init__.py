# PyMySQL remplace mysqlclient comme pilote MariaDB : mysqlclient doit être compilé,
# ce qui est impossible sur o2switch (accès à gcc refusé). Doit être exécuté avant
# le chargement du backend django.db.backends.mysql.
import pymysql

pymysql.install_as_MySQLdb()
