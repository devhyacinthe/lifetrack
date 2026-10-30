import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """Base des modèles métier : identifiant UUID et dates de création et de modification."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        abstract = True
