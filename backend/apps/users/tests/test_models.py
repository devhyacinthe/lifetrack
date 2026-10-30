import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.users.models import User

from .factories import UserFactory

pytestmark = pytest.mark.django_db


def test_create_user_normalizes_email_and_hashes_password():
    user = User.objects.create_user("  Ama.Mensah@Example.COM ", password="Secret-2026-ok")

    assert user.email == "ama.mensah@example.com"
    assert user.password != "Secret-2026-ok"
    assert user.check_password("Secret-2026-ok")


def test_user_defaults():
    user = UserFactory()

    assert user.preferred_currency == "XOF"
    assert user.timezone == "Africa/Abidjan"
    assert user.is_active is True
    assert user.is_staff is False
    assert str(user) == user.email


def test_primary_key_is_uuid():
    user = UserFactory()

    assert len(str(user.pk)) == 36


def test_email_is_required():
    with pytest.raises(ValueError):
        User.objects.create_user("", password="Secret-2026-ok")


def test_email_is_unique_regardless_of_case():
    UserFactory(email="kofi@example.com")

    with pytest.raises(IntegrityError):
        User.objects.create_user("KOFI@example.com", password="Secret-2026-ok")


def test_create_superuser_sets_flags():
    admin = User.objects.create_superuser("admin@example.com", password="Secret-2026-ok")

    assert admin.is_staff is True
    assert admin.is_superuser is True


def test_create_superuser_rejects_inconsistent_flags():
    with pytest.raises(ValueError):
        User.objects.create_superuser("admin@example.com", password="x", is_staff=False)


@pytest.mark.parametrize("currency", ["xof", "EURO", "E1R", ""])
def test_invalid_currency_is_rejected(currency):
    user = UserFactory.build(preferred_currency=currency)

    with pytest.raises(ValidationError) as exc:
        user.full_clean(exclude=["password"])
    assert "preferred_currency" in exc.value.message_dict


def test_invalid_timezone_is_rejected():
    user = UserFactory.build(timezone="Mars/Olympus")

    with pytest.raises(ValidationError) as exc:
        user.full_clean(exclude=["password"])
    assert "timezone" in exc.value.message_dict


def test_natural_key_lookup_is_case_insensitive():
    user = UserFactory(email="efua@example.com")

    assert User.objects.get_by_natural_key("EFUA@Example.com") == user
