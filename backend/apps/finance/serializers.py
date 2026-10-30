from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from . import services
from .models import (
    AMOUNT_DECIMAL_PLACES,
    AMOUNT_MAX_DIGITS,
    Account,
    Category,
    Transaction,
    Transfer,
)
from .selectors import account_balance, account_has_operations

MIN_AMOUNT = Decimal("0.01")


def amount_field(**kwargs):
    return serializers.DecimalField(
        max_digits=AMOUNT_MAX_DIGITS, decimal_places=AMOUNT_DECIMAL_PLACES, **kwargs
    )


class OwnedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Clé étrangère limitée aux objets de l'utilisateur connecté (sinon « introuvable »)."""

    default_error_messages = {"does_not_exist": "Objet introuvable."}

    def get_queryset(self):
        return super().get_queryset().filter(user=self.context["request"].user)


class ModelCleanMixin:
    """Applique Model.clean() et convertit ses erreurs au format de l'API."""

    def run_model_clean(self, instance):
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


# --- Comptes ---------------------------------------------------------------------


class AccountSerializer(serializers.ModelSerializer):
    # Calculé (annotation de selectors.accounts_with_balance), jamais stocké.
    balance = amount_field(read_only=True)
    initial_balance = amount_field(required=False)
    currency = serializers.CharField(max_length=3, required=False)

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "type",
            "currency",
            "initial_balance",
            "balance",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        user = self.context["request"].user
        duplicates = Account.objects.filter(user=user, name=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Un compte porte déjà ce nom.")
        return value

    def validate_currency(self, value):
        # Validation du code ISO 4217 par le validateur du modèle.
        Account._meta.get_field("currency").run_validators(value)
        if self.instance and value != self.instance.currency:
            if account_has_operations(self.instance):
                raise serializers.ValidationError(
                    "La devise d'un compte ne peut plus changer une fois qu'il a des opérations."
                )
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data.setdefault("currency", user.preferred_currency)
        return Account.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        account = super().update(instance, validated_data)
        # Le solde annoté par la requête initiale peut être périmé (solde initial modifié).
        account.__dict__.pop("balance", None)
        return account

    def to_representation(self, instance):
        # En liste, le solde vient de l'annotation SQL ; sinon il est calculé ici.
        if not hasattr(instance, "balance"):
            instance.balance = account_balance(instance)
        return super().to_representation(instance)


# --- Catégories ------------------------------------------------------------------


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "type", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_type(self, value):
        if self.instance and value != self.instance.type:
            raise serializers.ValidationError("Le type d'une catégorie ne peut pas être modifié.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        name = attrs.get("name", getattr(self.instance, "name", None))
        type_ = attrs.get("type", getattr(self.instance, "type", None))
        duplicates = Category.objects.filter(user=user, name=name, type=type_)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {"name": "Une catégorie de ce type porte déjà ce nom."}
            )
        return attrs

    def create(self, validated_data):
        return Category.objects.create(user=self.context["request"].user, **validated_data)


# --- Transactions ------------------------------------------------------------------


class TransactionSerializer(ModelCleanMixin, serializers.ModelSerializer):
    amount = amount_field(min_value=MIN_AMOUNT)
    account = OwnedPrimaryKeyRelatedField(queryset=Account.objects.all())
    category = OwnedPrimaryKeyRelatedField(queryset=Category.objects.all())
    currency = serializers.CharField(source="account.currency", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "type",
            "amount",
            "currency",
            "account",
            "account_name",
            "category",
            "category_name",
            "date",
            "description",
            "payment_method",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        account = attrs.get("account")
        category = attrs.get("category")
        # Un compte archivé ou une catégorie désactivée restent valables pour l'historique,
        # mais ne peuvent pas être choisis pour une nouvelle opération.
        if account and account.is_archived and account != getattr(self.instance, "account", None):
            raise serializers.ValidationError({"account": "Ce compte est archivé."})
        if (
            category
            and not category.is_active
            and category != getattr(self.instance, "category", None)
        ):
            raise serializers.ValidationError({"category": "Cette catégorie est désactivée."})

        candidate = Transaction(user=self.context["request"].user)
        if self.instance:
            for field in ["type", "account", "category"]:
                setattr(candidate, field, getattr(self.instance, field))
        for field, value in attrs.items():
            setattr(candidate, field, value)
        self.run_model_clean(candidate)
        return attrs

    def create(self, validated_data):
        return services.create_transaction(self.context["request"].user, **validated_data)


# --- Transferts ---------------------------------------------------------------------


class TransferSerializer(ModelCleanMixin, serializers.ModelSerializer):
    amount = amount_field(min_value=MIN_AMOUNT)
    from_account = OwnedPrimaryKeyRelatedField(queryset=Account.objects.all())
    to_account = OwnedPrimaryKeyRelatedField(queryset=Account.objects.all())
    currency = serializers.CharField(source="from_account.currency", read_only=True)
    from_account_name = serializers.CharField(source="from_account.name", read_only=True)
    to_account_name = serializers.CharField(source="to_account.name", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id",
            "from_account",
            "from_account_name",
            "to_account",
            "to_account_name",
            "amount",
            "currency",
            "date",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        for field in ["from_account", "to_account"]:
            account = attrs.get(field)
            if account and account.is_archived and account != getattr(self.instance, field, None):
                raise serializers.ValidationError({field: "Ce compte est archivé."})

        candidate = Transfer(user=self.context["request"].user)
        if self.instance:
            candidate.from_account = self.instance.from_account
            candidate.to_account = self.instance.to_account
        for field, value in attrs.items():
            setattr(candidate, field, value)
        self.run_model_clean(candidate)
        return attrs

    def create(self, validated_data):
        return services.create_transfer(self.context["request"].user, **validated_data)
