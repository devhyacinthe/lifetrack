from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import setup_default_activities


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="workouts_setup_new_user")
def create_default_activities(sender, instance, created, raw=False, **kwargs):
    # Tout nouveau compte reçoit les activités initiales (raw : chargement de fixtures).
    if created and not raw:
        setup_default_activities(instance)
