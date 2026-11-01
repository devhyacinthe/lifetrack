import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { ActivityType, Workout, WorkoutPayload } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormMessage } from '@/components/form-message';
import { TimeField } from '@/components/time-field';
import { applyApiErrors, renameFieldErrors } from '@/forms/api-errors';
import { type SessionFormValues, sessionSchema } from '@/schemas/workouts';
import { toIsoDate } from '@/utils/dates';

import { localDateOf, localTimeOf, splitDuration } from './format';
import { activityIcon } from './labels';
import { useActivities } from './queries';
import { SessionEndFields } from './session-end-fields';

const FIELDS = [
  'activity',
  'date',
  'time',
  'minutes',
  'intensity',
  'distance',
  'calories',
  'notes',
] as const;

/** Champs de l'API → champs du formulaire, pour afficher les erreurs du backend. */
const API_FIELDS = {
  started_at: 'time',
  duration_seconds: 'minutes',
  distance_km: 'distance',
  estimated_calories: 'calories',
};

type SessionFormProps = {
  initial?: Workout;
  submitLabel: string;
  onSubmit: (payload: WorkoutPayload) => Promise<void>;
};

/**
 * Séance passée, saisie directement terminée (ou modification d'une séance terminée).
 * Charge les activités, puis affiche le formulaire.
 */
export function SessionForm(props: SessionFormProps) {
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
  return <SessionFormFields {...props} activities={activities.data} />;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function SessionFormFields({
  initial,
  submitLabel,
  onSubmit,
  activities,
}: SessionFormProps & { activities: ActivityType[] }) {
  const [message, setMessage] = useState<string | null>(null);

  // Une activité désactivée n'est proposée que pour la séance qui l'utilise déjà.
  const usable = activities.filter((a) => a.is_active || a.id === initial?.activity);

  const { control, handleSubmit, setError, formState } = useForm<
    SessionFormValues,
    unknown,
    WorkoutPayload
  >({
    resolver: zodResolver(sessionSchema),
    defaultValues: initial
      ? {
          activity: initial.activity,
          date: localDateOf(initial.started_at),
          time: localTimeOf(initial.started_at),
          ...splitDuration(initial.duration_seconds ?? 0),
          intensity: initial.intensity ?? 5,
          distance: initial.distance_km?.replace('.', ',') ?? '',
          calories: initial.estimated_calories?.toString() ?? '',
          notes: initial.notes,
        }
      : {
          activity: '',
          date: toIsoDate(new Date()),
          time: nowTime(),
          hours: '0',
          minutes: '',
          intensity: 5,
          distance: '',
          calories: '',
          notes: '',
        },
  });

  const activityId = useWatch({ control, name: 'activity' });
  const distance = useWatch({ control, name: 'distance' });
  const selected = activities.find((a) => a.id === activityId);
  // La distance n'est demandée que si elle a un sens (ou si elle est déjà renseignée).
  const showDistance = Boolean(selected?.tracks_distance || distance);

  const submit = handleSubmit(async (payload) => {
    setMessage(null);
    try {
      await onSubmit(payload);
    } catch (error) {
      setMessage(applyApiErrors(renameFieldErrors(error, API_FIELDS), setError, FIELDS));
    }
  });

  if (usable.length === 0) {
    return (
      <EmptyState
        icon="run"
        title="Aucune activité active"
        message="Réactivez ou créez une activité pour enregistrer une séance."
        actionLabel="Gérer les activités"
        onAction={() => router.push('/activities')}
      />
    );
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="activity"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Activité"
            options={usable.map((a) => ({
              value: a.id,
              label: a.is_active ? a.name : `${a.name} (désactivée)`,
              icon: activityIcon(a.name),
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.cell}>
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <DateField
                label="Date"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                showShortcuts={false}
              />
            )}
          />
        </View>
        <View style={styles.cell}>
          <Controller
            control={control}
            name="time"
            render={({ field, fieldState }) => (
              <TimeField
                label="Heure de début"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>

      <SessionEndFields control={control} showDistance={showDistance} focusDuration={!initial} />

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
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
