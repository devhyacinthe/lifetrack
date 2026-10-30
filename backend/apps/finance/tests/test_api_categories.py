import pytest
from django.urls import reverse

from apps.finance.models import Category, TransactionType

from .factories import CategoryFactory, TransactionFactory

pytestmark = pytest.mark.django_db

LIST = reverse("finance:category-list")


def detail(category):
    return reverse("finance:category-detail", args=[category.pk])


def test_list_returns_own_default_categories(auth_client, other_user):
    CategoryFactory(user=other_user, name="Catégorie de B")

    response = auth_client.get(LIST, {"page_size": 100})

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 17
    assert "Catégorie de B" not in {c["name"] for c in body["results"]}


def test_filter_by_type(auth_client):
    response = auth_client.get(LIST, {"type": "income", "page_size": 100})

    assert {c["type"] for c in response.json()["results"]} == {"income"}
    assert response.json()["count"] == 6


def test_create_category(auth_client, user):
    response = auth_client.post(LIST, {"name": "Tontine", "type": "expense"}, format="json")

    assert response.status_code == 201
    assert Category.objects.get(pk=response.json()["id"]).user == user


def test_same_name_allowed_for_other_type(auth_client):
    response = auth_client.post(LIST, {"name": "Alimentation", "type": "income"}, format="json")

    assert response.status_code == 201


def test_duplicate_name_rejected(auth_client):
    response = auth_client.post(LIST, {"name": "Alimentation", "type": "expense"}, format="json")

    assert response.status_code == 400
    assert "name" in response.json()


def test_rename_and_deactivate(auth_client, user):
    category = CategoryFactory(user=user)

    response = auth_client.patch(
        detail(category), {"name": "Renommée", "is_active": False}, format="json"
    )

    assert response.status_code == 200
    category.refresh_from_db()
    assert (category.name, category.is_active) == ("Renommée", False)


def test_type_cannot_change(auth_client, user):
    category = CategoryFactory(user=user, type=TransactionType.EXPENSE)

    response = auth_client.patch(detail(category), {"type": "income"}, format="json")

    assert response.status_code == 400
    assert "type" in response.json()


def test_delete_unused_category(auth_client, user):
    category = CategoryFactory(user=user)

    assert auth_client.delete(detail(category)).status_code == 204


def test_delete_used_category_returns_conflict(auth_client, user):
    tx = TransactionFactory(user=user)

    response = auth_client.delete(detail(tx.category))

    assert response.status_code == 409
    assert "désactivez" in response.json()["detail"]


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_category_is_not_found(auth_client, other_user, method):
    category = CategoryFactory(user=other_user)

    response = getattr(auth_client, method)(detail(category), {"name": "Piratée"}, format="json")

    assert response.status_code == 404
    assert Category.objects.get(pk=category.pk).name != "Piratée"
