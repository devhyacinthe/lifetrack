from decimal import Decimal

from rest_framework import serializers

from apps.core.api import ModelCleanMixin, OwnedPrimaryKeyRelatedField
from apps.core.periods import user_today

from .models import Measurement, MetricType
from .selectors import metric_types_with_latest

MIN_VALUE = Decimal("0.01")


class MetricTypeSerializer(serializers.ModelSerializer):
    # Calculés à partir des mesures enregistrées (voir selectors.metric_types_with_latest).
    latest_value = serializers.DecimalField(
        max_digits=7, decimal_places=2, read_only=True, allow_null=True
    )
    latest_date = serializers.DateField(read_only=True, allow_null=True)
    measurements_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = MetricType
        fields = [
            "id",
            "name",
            "unit",
            "is_active",
            "latest_value",
            "latest_date",
            "measurements_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        user = self.context["request"].user
        duplicates = MetricType.objects.filter(user=user, name=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Un type de mesure porte déjà ce nom.")
        return value

    def validate_unit(self, value):
        # Changer l'unité fausserait l'historique (72 kg deviendrait 72 lb).
        if self.instance and value != self.instance.unit and self.instance.measurements.exists():
            raise serializers.ValidationError(
                "L'unité ne peut plus changer : des mesures l'utilisent. Créez un autre type."
            )
        return value

    def create(self, validated_data):
        return MetricType.objects.create(user=self.context["request"].user, **validated_data)

    def to_representation(self, instance):
        # Après une création ou une modification, l'objet n'a pas les valeurs calculées.
        if not hasattr(instance, "measurements_count"):
            instance = metric_types_with_latest(instance.user).get(pk=instance.pk)
        return super().to_representation(instance)


class MeasurementSerializer(ModelCleanMixin, serializers.ModelSerializer):
    metric_type = OwnedPrimaryKeyRelatedField(queryset=MetricType.objects.all())
    metric_type_name = serializers.CharField(source="metric_type.name", read_only=True)
    unit = serializers.CharField(source="metric_type.unit", read_only=True)
    value = serializers.DecimalField(
        max_digits=7, decimal_places=2, min_value=MIN_VALUE, max_value=Decimal("99999.99")
    )

    class Meta:
        model = Measurement
        fields = [
            "id",
            "metric_type",
            "metric_type_name",
            "unit",
            "date",
            "value",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        # L'unicité (type, date) est vérifiée dans validate(), avec un message sur `date`.
        validators = []

    def validate_date(self, value):
        if value > user_today(self.context["request"].user):
            raise serializers.ValidationError("Une mesure ne peut pas être datée dans le futur.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        metric_type = attrs.get("metric_type", getattr(self.instance, "metric_type", None))
        date = attrs.get("date", getattr(self.instance, "date", None))

        # Un type désactivé reste valable pour l'historique, pas pour une nouvelle mesure.
        if (
            "metric_type" in attrs
            and not metric_type.is_active
            and metric_type != getattr(self.instance, "metric_type", None)
        ):
            raise serializers.ValidationError({"metric_type": "Ce type de mesure est désactivé."})

        duplicates = Measurement.objects.filter(metric_type=metric_type, date=date)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {"date": "Une mesure de ce type existe déjà à cette date : modifiez-la."}
            )

        candidate = Measurement(user=user, metric_type=metric_type)
        self.run_model_clean(candidate)
        return attrs

    def create(self, validated_data):
        return Measurement.objects.create(user=self.context["request"].user, **validated_data)


# --- Série (lecture seule, pour le schéma OpenAPI) ----------------------------------------


def _value_field():
    return serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)


class SeriesPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    value = serializers.DecimalField(max_digits=7, decimal_places=2)


class MetricSeriesSerializer(serializers.Serializer):
    metric_type = serializers.UUIDField()
    name = serializers.CharField()
    unit = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    points = SeriesPointSerializer(many=True)
    minimum = _value_field()
    maximum = _value_field()
    first = _value_field()
    last = _value_field()
    # Dernière valeur moins la première de la période (None sans mesure).
    change = _value_field()
