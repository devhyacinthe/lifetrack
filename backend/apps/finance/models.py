"""
Modèles financiers.

Règles qui ne peuvent pas être imposées par la base (elles portent sur plusieurs tables) :
elles sont vérifiées dans clean() et appliquées par les services avant chaque écriture.
"""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel
from apps.core.validators import currency_validator

AMOUNT_MAX_DIGITS = 15
AMOUNT_DECIMAL_PLACES = 2


def amount_field(verbose_name, **kwargs):
    return models.DecimalField(
        verbose_name,
        max_digits=AMOUNT_MAX_DIGITS,
        decimal_places=AMOUNT_DECIMAL_PLACES,
        **kwargs,
    )


class TransactionType(models.TextChoices):
    INCOME = "income", "Revenu"
    EXPENSE = "expense", "Dépense"


class AccountType(models.TextChoices):
    CASH = "cash", "Espèces"
    BANK = "bank", "Compte bancaire"
    MOBILE_MONEY = "mobile_money", "Mobile Money"
    SAVINGS = "savings", "Épargne"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Espèces"
    CARD = "card", "Carte"
    MOBILE_MONEY = "mobile_money", "Mobile Money"
    BANK_TRANSFER = "bank_transfer", "Virement"
    CHECK = "check", "Chèque"
    OTHER = "other", "Autre"


class Account(TimeStampedModel):
    """Compte financier. Le solde n'est jamais stocké : il est calculé (voir selectors)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accounts"
    )
    name = models.CharField("nom", max_length=100)
    type = models.CharField("type", max_length=20, choices=AccountType.choices)
    currency = models.CharField("devise", max_length=3, validators=[currency_validator])
    # Peut être négatif (découvert bancaire).
    initial_balance = amount_field("solde initial", default=Decimal("0"))
    is_archived = models.BooleanField("archivé", default=False)

    class Meta:
        verbose_name = "compte"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="finance_account_unique_name"),
        ]

    def __str__(self):
        return f"{self.name} ({self.currency})"


class Category(TimeStampedModel):
    """Catégorie de revenus ou de dépenses. Désactivée plutôt que supprimée si elle sert."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories"
    )
    name = models.CharField("nom", max_length=60)
    type = models.CharField("type", max_length=10, choices=TransactionType.choices)
    is_active = models.BooleanField("active", default=True)

    class Meta:
        verbose_name = "catégorie"
        ordering = ["type", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "type", "name"], name="finance_category_unique_name"
            ),
        ]

    def __str__(self):
        return self.name


class Transaction(TimeStampedModel):
    """Revenu ou dépense. Le montant est toujours positif ; le type donne le sens."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions"
    )
    type = models.CharField("type", max_length=10, choices=TransactionType.choices)
    amount = amount_field("montant")
    # RESTRICT : un compte ou une catégorie utilisés ne peuvent pas être supprimés seuls,
    # mais la suppression de l'utilisateur (et donc de toutes ses données) reste possible.
    account = models.ForeignKey(
        Account, on_delete=models.RESTRICT, related_name="transactions", verbose_name="compte"
    )
    category = models.ForeignKey(
        Category, on_delete=models.RESTRICT, related_name="transactions", verbose_name="catégorie"
    )
    date = models.DateField("date")
    description = models.CharField("description", max_length=255, blank=True)
    payment_method = models.CharField(
        "moyen de paiement", max_length=20, choices=PaymentMethod.choices, blank=True
    )

    class Meta:
        verbose_name = "transaction"
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["user", "date"], name="finance_tx_user_date")]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="finance_tx_amount_positive"),
            models.CheckConstraint(
                condition=Q(type__in=TransactionType.values), name="finance_tx_type_valid"
            ),
        ]

    def __str__(self):
        return f"{self.get_type_display()} {self.amount} {self.date}"

    @property
    def currency(self):
        """Une transaction est toujours exprimée dans la devise de son compte."""
        return self.account.currency

    def clean(self):
        errors = {}
        if self.account_id and self.account.user_id != self.user_id:
            errors["account"] = "Compte introuvable."
        if self.category_id:
            if self.category.user_id != self.user_id:
                errors["category"] = "Catégorie introuvable."
            elif self.category.type != self.type:
                errors["category"] = "La catégorie ne correspond pas au type de la transaction."
        if errors:
            raise ValidationError(errors)


class Transfer(TimeStampedModel):
    """
    Transfert entre deux comptes du même utilisateur.

    Un transfert est un enregistrement unique : il ne crée ni dépense ni revenu, et son
    écriture est donc atomique par construction.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transfers"
    )
    from_account = models.ForeignKey(
        Account,
        on_delete=models.RESTRICT,
        related_name="transfers_out",
        verbose_name="compte débité",
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.RESTRICT,
        related_name="transfers_in",
        verbose_name="compte crédité",
    )
    amount = amount_field("montant")
    date = models.DateField("date")
    description = models.CharField("description", max_length=255, blank=True)

    class Meta:
        verbose_name = "transfert"
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["user", "date"], name="finance_transfer_user_date")]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0), name="finance_transfer_amount_positive"
            ),
            models.CheckConstraint(
                condition=~Q(from_account=F("to_account")),
                name="finance_transfer_distinct_accounts",
            ),
        ]

    def __str__(self):
        return f"{self.from_account} → {self.to_account} : {self.amount}"

    def clean(self):
        if not (self.from_account_id and self.to_account_id):
            return
        errors = {}
        if self.from_account.user_id != self.user_id:
            errors["from_account"] = "Compte introuvable."
        if self.to_account.user_id != self.user_id:
            errors["to_account"] = "Compte introuvable."
        if errors:
            raise ValidationError(errors)
        if self.from_account_id == self.to_account_id:
            raise ValidationError({"to_account": "Les deux comptes doivent être différents."})
        if self.from_account.currency != self.to_account.currency:
            raise ValidationError(
                {"to_account": "Les transferts entre devises différentes ne sont pas gérés."}
            )


class BudgetPeriod(models.TextChoices):
    WEEKLY = "weekly", "Hebdomadaire"
    MONTHLY = "monthly", "Mensuel"
    YEARLY = "yearly", "Annuel"


class Budget(TimeStampedModel):
    """
    Plafond de dépenses récurrent, global (sans catégorie) ou limité à une catégorie.

    Rien n'est stocké pour une période donnée : la consommation est recalculée à partir des
    dépenses enregistrées (voir selectors.attach_budget_usage).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets"
    )
    # Vide : budget global, toutes catégories de dépenses confondues.
    category = models.ForeignKey(
        Category,
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="budgets",
        verbose_name="catégorie",
    )
    amount = amount_field("montant")
    # Seules les dépenses des comptes de cette devise sont comptées.
    currency = models.CharField("devise", max_length=3, validators=[currency_validator])
    period = models.CharField("période", max_length=10, choices=BudgetPeriod.choices)

    class Meta:
        verbose_name = "budget"
        ordering = ["period", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0), name="finance_budget_amount_positive"
            ),
            models.CheckConstraint(
                condition=Q(period__in=BudgetPeriod.values), name="finance_budget_period_valid"
            ),
            # Unicité des budgets par catégorie. Les budgets globaux (catégorie NULL) sont
            # vérifiés par le serializer : MariaDB ne gère pas les contraintes conditionnelles.
            models.UniqueConstraint(
                fields=["user", "category", "period", "currency"],
                name="finance_budget_unique",
            ),
        ]

    def __str__(self):
        scope = self.category.name if self.category_id else "Global"
        return f"{scope} : {self.amount} {self.currency} ({self.get_period_display()})"

    def clean(self):
        if not self.category_id:
            return
        if self.category.user_id != self.user_id:
            raise ValidationError({"category": "Catégorie introuvable."})
        if self.category.type != TransactionType.EXPENSE:
            raise ValidationError({"category": "Un budget porte sur une catégorie de dépenses."})


class SavingsGoal(TimeStampedModel):
    """
    Objectif d'épargne rattaché à un compte : sa progression est le solde de ce compte.

    Un compte ne sert qu'à un seul objectif, ce qui évite de compter deux fois le même argent.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="savings_goals"
    )
    name = models.CharField("nom", max_length=100)
    account = models.OneToOneField(
        Account, on_delete=models.RESTRICT, related_name="savings_goal", verbose_name="compte"
    )
    target_amount = amount_field("montant cible")
    deadline = models.DateField("échéance", null=True, blank=True)

    class Meta:
        verbose_name = "objectif d'épargne"
        verbose_name_plural = "objectifs d'épargne"
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(target_amount__gt=0), name="finance_goal_target_positive"
            ),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        if self.account_id and self.account.user_id != self.user_id:
            raise ValidationError({"account": "Compte introuvable."})
