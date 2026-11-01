import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Measurement, MeasurementPayload, MetricType } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type MeasurementFormValues, measurementSchema } from '@/schemas/body';
import { toIsoDate } from '@/utils/dates';

import { metricIcon, valueToInput } from './format';
import { useMetricTypes } from './queries';

const FIELDS = ['metric_type', 'date', 'value', 'notes'] as const;

type MeasurementFormProps = {
  initial?: Measurement;
  /** Type présélectionné (ouverture depuis l'écran d'un type). */
  defaultType?: string;
  submitLabel: string;
  onSubmit: (payload: MeasurementPayload) => Promise<void>;
};

export function MeasurementForm(props: MeasurementFormProps) {
  const types = useMetricTypes();

  if (types.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (types.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(types.error)}
        actionLabel="Réessayer"
        onAction={() => types.refetch()}
      />
    );
  }
  return <MeasurementFormFields {...props} types={types.data} />;
}

function MeasurementFormFields({
  initial,
  defaultType,
  submitLabel,
  onSubmit,
  types,
}: MeasurementFormProps & { types: MetricType[] }) {
  const [message, setMessage] = useState<string | null>(null);
  // Un type désactivé reste proposé pour la mesure qui l'utilise déjà.
  const available = types.filter((t) => t.is_active || t.id === initial?.metric_type);
  const { control, handleSubmit, setError, formState } = useForm<
    MeasurementFormValues,
    unknown,
    MeasurementPayload
  >({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      metric_type: initial?.metric_type ?? defaultType ?? available[0]?.id ?? '',
      date: initial?.date ?? toIsoDate(new Date()),
      value: initial ? valueToInput(initial.value) : '',
      notes: initial?.notes ?? '',
    },
  });
  const typeId = useWatch({ control, name: 'metric_type' });
  const unit = types.find((t) => t.id === typeId)?.unit;

  const submit = handleSubmit(async (payload) => {
    setMessage(null);
    try {
      await onSubmit(payload);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="metric_type"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Mesure"
            options={available.map((t) => ({
              value: t.id,
              label: t.name,
              icon: metricIcon(t.name, t.unit),
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextInput
        control={control}
        name="value"
        label="Valeur"
        icon="pencil-outline"
        keyboardType="decimal-pad"
        affix={unit}
        autoFocus={!initial}
      />
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <DateField
            label="Date"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextInput
        control={control}
        name="notes"
        label="Notes (facultatif)"
        icon="note-text-outline"
        maxLength={255}
        multiline
      />
      <FormMessage message={message} />
      <Button
        mode="contained"
        onPress={() => submit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        {submitLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  form: { gap: 20 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
