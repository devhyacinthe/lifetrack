"""
Types de mesure créés pour chaque nouvel utilisateur : (nom, unité).

Ce module ne contient que des constantes : il est aussi importé par une migration de données.
"""

DEFAULT_METRIC_TYPES = [
    ("Poids", "kg"),
    ("Tour de taille", "cm"),
    ("Tour de hanches", "cm"),
    ("Tour de poitrine", "cm"),
    ("Masse grasse", "%"),
]
