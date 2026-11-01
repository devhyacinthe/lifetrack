"""
Activités créées pour chaque nouvel utilisateur : (nom, mesure la distance).

Ce module ne contient que des constantes : il est aussi importé par une migration de données.
"""

DEFAULT_ACTIVITIES = [
    ("Course à pied", True),
    ("Marche", True),
    ("Vélo", True),
    ("Natation", True),
    ("Musculation", False),
    ("Football", False),
    ("Basketball", False),
    ("Yoga", False),
    ("Danse", False),
    ("Autre", False),
]
