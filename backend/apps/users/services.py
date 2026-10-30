"""Opérations sur les comptes : révocation des jetons, mot de passe, suppression."""

from django.db import transaction
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken


class InvalidRefreshToken(Exception):
    """Jeton absent, expiré, déjà révoqué ou appartenant à un autre utilisateur."""


def revoke_all_refresh_tokens(user):
    """Révoque tous les jetons de renouvellement émis pour l'utilisateur."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


def logout(user, raw_refresh_token):
    """Révoque le jeton de renouvellement fourni, s'il appartient bien à l'utilisateur."""
    try:
        token = RefreshToken(raw_refresh_token)
    except TokenError as exc:  # jeton invalide, expiré ou déjà révoqué
        raise InvalidRefreshToken from exc
    if str(token.get(api_settings.USER_ID_CLAIM)) != str(user.pk):
        raise InvalidRefreshToken
    token.blacklist()


@transaction.atomic
def change_password(user, new_password):
    """Change le mot de passe et déconnecte toutes les sessions existantes."""
    user.set_password(new_password)
    user.save(update_fields=["password"])
    revoke_all_refresh_tokens(user)


@transaction.atomic
def delete_account(user):
    """Supprime définitivement le compte et les données qui lui sont rattachées."""
    revoke_all_refresh_tokens(user)
    user.delete()
