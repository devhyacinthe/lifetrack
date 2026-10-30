from django.core.validators import RegexValidator

currency_validator = RegexValidator(
    regex=r"^[A-Z]{3}$", message="La devise doit être un code ISO 4217 (ex. XOF, EUR)."
)
