from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import services
from .serializers import (
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
)


@extend_schema(tags=["auth"], summary="Créer un compte", responses={201: UserSerializer})
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"], summary="Se connecter (obtenir les jetons)")
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_scope = "login"


@extend_schema(tags=["auth"], summary="Renouveler les jetons")
class RefreshView(TokenRefreshView):
    pass


@extend_schema(
    tags=["auth"],
    summary="Se déconnecter (révoquer le jeton de renouvellement)",
    request=LogoutSerializer,
    responses={204: None, 400: OpenApiResponse(description="Jeton invalide ou déjà révoqué.")},
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            services.logout(request.user, serializer.validated_data["refresh"])
        except services.InvalidRefreshToken:
            return Response(
                {"refresh": ["Jeton invalide ou déjà révoqué."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"])
class MeView(generics.RetrieveUpdateAPIView):
    """Profil de l'utilisateur connecté (jamais celui d'un autre utilisateur)."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["auth"],
    summary="Changer le mot de passe (révoque toutes les sessions)",
    request=ChangePasswordSerializer,
    responses={204: None},
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        services.change_password(request.user, serializer.validated_data["new_password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["auth"],
    summary="Supprimer définitivement son compte",
    request=DeleteAccountSerializer,
    responses={204: None},
)
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        services.delete_account(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
