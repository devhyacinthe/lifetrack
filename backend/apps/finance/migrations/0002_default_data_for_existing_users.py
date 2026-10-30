"""
Données initiales pour les utilisateurs créés avant le module financier (phase 2).

Les nouveaux utilisateurs les reçoivent via le signal post_save (apps/finance/signals.py).
Cette migration utilise les modèles historiques : elle ne doit pas appeler les services.
"""

from django.conf import settings
from django.db import migrations

from apps.finance.defaults import (
    DEFAULT_ACCOUNT_NAME,
    DEFAULT_ACCOUNT_TYPE,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
)


def create_default_data(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Account = apps.get_model("finance", "Account")
    Category = apps.get_model("finance", "Category")

    for user in User.objects.all():
        if not Category.objects.filter(user=user).exists():
            Category.objects.bulk_create(
                [Category(user=user, name=n, type="expense") for n in DEFAULT_EXPENSE_CATEGORIES]
                + [Category(user=user, name=n, type="income") for n in DEFAULT_INCOME_CATEGORIES]
            )
        if not Account.objects.filter(user=user).exists():
            Account.objects.create(
                user=user,
                name=DEFAULT_ACCOUNT_NAME,
                type=DEFAULT_ACCOUNT_TYPE,
                currency=user.preferred_currency,
            )


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    # Retour arrière : rien à faire, les tables sont supprimées par 0001.
    operations = [migrations.RunPython(create_default_data, migrations.RunPython.noop)]
