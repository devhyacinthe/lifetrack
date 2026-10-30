"""
Données créées pour chaque nouvel utilisateur : catégories initiales et compte par défaut.

Ce module ne contient que des constantes : il est aussi importé par une migration de données.
"""

DEFAULT_EXPENSE_CATEGORIES = [
    "Alimentation",
    "Transport",
    "Logement",
    "Factures (eau, électricité)",
    "Communication (crédit, internet)",
    "Santé",
    "Éducation",
    "Loisirs",
    "Vêtements",
    "Famille et dons",
    "Autres dépenses",
]

DEFAULT_INCOME_CATEGORIES = [
    "Salaire",
    "Activité indépendante",
    "Commerce",
    "Cadeaux reçus",
    "Remboursements",
    "Autres revenus",
]

DEFAULT_ACCOUNT_NAME = "Espèces"
DEFAULT_ACCOUNT_TYPE = "cash"
