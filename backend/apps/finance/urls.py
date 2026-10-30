from rest_framework.routers import DefaultRouter

from . import views

app_name = "finance"

router = DefaultRouter()
router.include_root_view = False
router.register("accounts", views.AccountViewSet, basename="account")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("transfers", views.TransferViewSet, basename="transfer")

urlpatterns = router.urls
