from rest_framework.routers import DefaultRouter

from . import views

app_name = "body_metrics"

router = DefaultRouter()
router.include_root_view = False
router.register("metric-types", views.MetricTypeViewSet, basename="metric-type")
router.register("measurements", views.MeasurementViewSet, basename="measurement")

urlpatterns = router.urls
