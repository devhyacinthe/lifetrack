import django_filters
from django.db.models import Q

from .models import Account, Category, PaymentMethod, Transaction, TransactionType, Transfer

# Les filtres par compte ou catégorie prennent un UUID sans vérifier qu'il existe : un
# identifiant appartenant à un autre utilisateur donne simplement une liste vide, sans
# révéler son existence (le queryset de base est déjà limité à l'utilisateur).


class AccountFilter(django_filters.FilterSet):
    class Meta:
        model = Account
        fields = ["type", "is_archived", "currency"]


class CategoryFilter(django_filters.FilterSet):
    class Meta:
        model = Category
        fields = ["type", "is_active"]


class TransactionFilter(django_filters.FilterSet):
    type = django_filters.ChoiceFilter(choices=TransactionType.choices)
    account = django_filters.UUIDFilter(field_name="account_id")
    category = django_filters.UUIDFilter(field_name="category_id")
    payment_method = django_filters.ChoiceFilter(choices=PaymentMethod.choices)
    date_after = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    amount_min = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    amount_max = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")

    class Meta:
        model = Transaction
        fields = []


class TransferFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(method="filter_account", label="Compte débité ou crédité")
    date_after = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = Transfer
        fields = []

    def filter_account(self, queryset, name, value):
        return queryset.filter(Q(from_account_id=value) | Q(to_account_id=value))
