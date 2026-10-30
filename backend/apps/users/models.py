import uuid
import zoneinfo

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone as django_timezone

DEFAULT_CURRENCY = "XOF"
DEFAULT_TIMEZONE = "Africa/Abidjan"

currency_validator = RegexValidator(
    regex=r"^[A-Z]{3}$", message="La devise doit être un code ISO 4217 (ex. XOF, EUR)."
)


def validate_timezone(value):
    if value not in zoneinfo.available_timezones():
        raise ValidationError(f"Fuseau horaire inconnu : {value}.")


def normalize_email(email):
    """Adresse entièrement en minuscules : l'e-mail est l'identifiant de connexion."""
    return email.strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        user = self.model(email=normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Un superutilisateur doit avoir is_staff et is_superuser.")
        return self.create_user(email, password, **extra_fields)

    def get_by_natural_key(self, username):
        # Connexion insensible à la casse de l'adresse e-mail.
        return self.get(email=normalize_email(username))


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("adresse e-mail", unique=True)
    first_name = models.CharField("prénom", max_length=150, blank=True)
    last_name = models.CharField("nom", max_length=150, blank=True)
    preferred_currency = models.CharField(
        "devise préférée",
        max_length=3,
        default=DEFAULT_CURRENCY,
        validators=[currency_validator],
    )
    timezone = models.CharField(
        "fuseau horaire",
        max_length=64,
        default=DEFAULT_TIMEZONE,
        validators=[validate_timezone],
    )
    is_active = models.BooleanField("actif", default=True)
    is_staff = models.BooleanField("accès à l'administration", default=False)
    date_joined = models.DateTimeField("date d'inscription", default=django_timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Garantit l'unicité insensible à la casse, quel que soit le chemin de création.
        self.email = normalize_email(self.email)
        super().save(*args, **kwargs)
