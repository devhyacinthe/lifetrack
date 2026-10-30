from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import setup_default_finance


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="finance_setup_new_user")
def create_default_finance_data(sender, instance, created, raw=False, **kwargs):
    # Tout nouveau compte (inscription, admin, createsuperuser) reçoit ses données initiales.
    # raw : chargement de fixtures, où les données sont fournies telles quelles.
    if created and not raw:
        setup_default_finance(instance)
