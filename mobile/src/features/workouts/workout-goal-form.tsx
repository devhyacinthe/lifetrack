import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { ActivityType, WorkoutGoal, WorkoutGoalPayload } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { EmptyState } from '@/components/empty-state';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors, renameFieldErrors } from '@/forms/api-errors';
import { type WorkoutGoalFormValues, workoutGoalSchema } from '@/schemas/workouts';

import { activityIcon, GOAL_PERIOD_LABELS, GOAL_PERIODS, METRIC_LABELS, METRICS } from './labels';
import { useActivities } from './queries';

const FIELDS = ['metric', 'period', 'activity', 'target'] as const;

const TARGET_LABELS = {
  sessions: 'Nombre de séances',
  duration: 'Durée totale (minutes)',
  distance: 'Distance totale',
} as const;

/** Valeur cible de l'API → saisie (la durée est saisie en minutes). */
function targetToInput(goal: WorkoutGoal): string {
  const value = Number(goal.target_value);
  if (goal.metric === 'duration') return String(Math.round(value / 60));
  if (goal.metric === 'sessions') return String(Math.round(value));
  return goal.target_value.replace(/\.00$/, '').replace('.', ',');
}

type WorkoutGoalFormProps = {
  initial?: WorkoutGoal;
  submitLabel: string;
  onSubmit: (payload: WorkoutGoalPayload) => Promise<void>;
};

export function WorkoutGoalForm(props: WorkoutGoalFormProps) {
  const activities = useActivities();

  if (activities.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (activities.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(activities.error)}
        actionLabel="Réessayer"
        onAction={() => activities.refetch()}
      />
    );
  }
  return <WorkoutGoalFormFields {...props} activities={activities.data} />;
}

function WorkoutGoalFormFields({
  initial,
  submitLabel,
  onSubmit,
  activities,
}: WorkoutGoalFormProps & { activities: ActivityType[] }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<
    WorkoutGoalFormValues,
    unknown,
    WorkoutGoalPayload
  >({
    resolver: zodResolver(workoutGoalSchema),
    defaultValues: {
      metric: initial?.metric ?? 'sessions',
      period: initial?.period ?? 'weekly',
      activity: initial?.activity ?? '',
      target: initial ? targetToInput(initial) : '',
    },
  });
  const metric = useWatch({ control, name: 'metric' });

  // La distance n'a de sens que pour les activités qui la mesurent.
  const activityOptions = [
    { value: '', label: 'Toutes activités', icon: 'all-inclusive' },
    ...activities
      .filter(
        (a) =>
          (a.is_active || a.id === initial?.activity) &&
          (metric !== 'distance' || a.tracks_distance || a.id === initial?.activity),
      )
      .map((a) => ({ value: a.id, label: a.name, icon: activityIcon(a.name) })),
  ];

  const submit = handleSubmit(async (payload) => {
    setMessage(null);
    try {
      await onSubmit(payload);
    } catch (error) {
      setMessage(
        applyApiErrors(renameFieldErrors(error, { target_value: 'target' }), setError, FIELDS),
      );
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="metric"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
              Objectif
            </Text>
            <SegmentedButtons
              value={field.value}
              onValueChange={field.onChange}
              buttons={METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
            />
            {fieldState.error ? (
              <Text variant="bodySmall" style={{ color: colors.error }}>
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="period"
        render={({ field }) => (
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
              Période (renouvelée automatiquement)
            </Text>
            <SegmentedButtons
              value={field.value}
              onValueChange={field.onChange}
              buttons={GOAL_PERIODS.map((p) => ({
                value: p,
                label: GOAL_PERIOD_LABELS[p].replace('Par ', ''),
              }))}
            />
          </View>
        )}
      />
      <FormTextInput
        control={control}
        name="target"
        label={TARGET_LABELS[metric]}
        icon="flag-outline"
        keyboardType={metric === 'distance' ? 'decimal-pad' : 'number-pad'}
        affix={metric === 'distance' ? 'km' : metric === 'duration' ? 'min' : undefined}
        autoFocus={!initial}
      />
      <Controller
        control={control}
        name="activity"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Activités concernées"
            options={activityOptions}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
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
  field: { gap: 8 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
