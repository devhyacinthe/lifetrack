from django.apps import AppConfig


class FinanceConfig(AppConfig):
    """Comptes, catégories, transactions et transferts."""

    name = "apps.finance"
    label = "finance"
    verbose_name = "Finances"

    def ready(self):
        from . import signals  # noqa: F401
