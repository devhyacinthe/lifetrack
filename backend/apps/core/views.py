import logging

from django.db import DatabaseError, connection
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok", "error"])
    database = serializers.ChoiceField(choices=["ok", "unavailable"])


class HealthView(APIView):
    """État de l'API et de la connexion à la base de données (public)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        summary="État de l'API",
        responses={200: HealthSerializer, 503: HealthSerializer},
        tags=["core"],
    )
    def get(self, request):
        try:
            connection.ensure_connection()
        except DatabaseError:
            # Le détail reste dans les journaux : il n'est jamais renvoyé au client.
            logger.exception("Health check : base de données inaccessible")
            return Response(
                {"status": "error", "database": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "database": "ok"})
