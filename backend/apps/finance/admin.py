from django.contrib import admin

from .models import Account, Category, Transaction, Transfer


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "type", "currency", "initial_balance", "is_archived"]
    list_filter = ["type", "currency", "is_archived"]
    search_fields = ["name", "user__email"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "type", "is_active"]
    list_filter = ["type", "is_active"]
    search_fields = ["name", "user__email"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "type", "amount", "account", "category"]
    list_filter = ["type", "payment_method"]
    search_fields = ["description", "user__email"]
    date_hierarchy = "date"
    list_select_related = ["user", "account", "category"]


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "from_account", "to_account", "amount"]
    search_fields = ["description", "user__email"]
    date_hierarchy = "date"
    list_select_related = ["user", "from_account", "to_account"]
