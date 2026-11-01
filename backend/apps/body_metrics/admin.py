from django.contrib import admin

from .models import Measurement, MetricType


@admin.register(MetricType)
class MetricTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "unit", "user", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "user__email"]


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "metric_type", "value"]
    search_fields = ["notes", "user__email"]
    date_hierarchy = "date"
    list_select_related = ["user", "metric_type"]
