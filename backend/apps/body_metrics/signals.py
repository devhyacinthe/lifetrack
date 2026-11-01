from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import setup_default_metric_types


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="body_metrics_setup_new_user")
def create_default_metric_types(sender, instance, created, raw=False, **kwargs):
    # Tout nouveau compte reçoit les types de mesure initiaux (raw : chargement de fixtures).
    if created and not raw:
        setup_default_metric_types(instance)
