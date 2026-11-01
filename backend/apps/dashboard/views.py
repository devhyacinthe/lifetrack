from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import REFERENCE_DATE_PARAMETER, reference_date

from .selectors import build_dashboard
from .serializers import DashboardSerializer


@extend_schema(
    tags=["dashboard"], parameters=[REFERENCE_DATE_PARAMETER], responses=DashboardSerializer
)
class DashboardView(APIView):
    """
    Indicateurs du mois en cours, dans la devise préférée : revenus, dépenses, solde estimé
    des comptes actifs, budgets, séances, objectifs sportifs, dernières opérations.
    """

    def get(self, request):
        day = reference_date(request)
        dashboard = build_dashboard(request.user, day)
        # Les budgets et objectifs calculent leur progression pour la date de référence.
        context = {"request": request, "reference_date": day}
        return Response(DashboardSerializer(dashboard, context=context).data)
