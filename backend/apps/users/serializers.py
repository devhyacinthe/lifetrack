from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, normalize_email

# Borne la taille des mots de passe reçus (le hachage coûte cher en calcul).
PASSWORD_MAX_LENGTH = 128


class UserSerializer(serializers.ModelSerializer):
    """Profil de l'utilisateur connecté. L'e-mail et les dates ne sont pas modifiables."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "preferred_currency",
            "timezone",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, max_length=PASSWORD_MAX_LENGTH, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]

    def validate_email(self, value):
        email = normalize_email(value)
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cette adresse e-mail.")
        return email

    def validate(self, attrs):
        # Les validateurs de Django comparent le mot de passe aux autres champs du profil.
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Connexion par e-mail, insensible à la casse."""

    def validate(self, attrs):
        attrs[self.username_field] = normalize_email(attrs[self.username_field])
        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True, max_length=PASSWORD_MAX_LENGTH, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True, max_length=PASSWORD_MAX_LENGTH, style={"input_type": "password"}
    )

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, user=self.context["request"].user)
        return value


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(
        write_only=True, max_length=PASSWORD_MAX_LENGTH, style={"input_type": "password"}
    )

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe incorrect.")
        return value
