import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import type { ActivityType, FinishWorkoutPayload, Workout } from '@/api/types';
import { FormMessage } from '@/components/form-message';
import { applyApiErrors, renameFieldErrors } from '@/forms/api-errors';
import {
  type FinishSessionFormValues,
  finishSessionSchema,
  MAX_DURATION_SECONDS,
} from '@/schemas/workouts';

import { elapsedSeconds, splitDuration } from './format';
import { SessionEndFields } from './session-end-fields';

const FIELDS = ['minutes', 'intensity', 'distance', 'calories', 'notes'] as const;

type FinishSessionFormProps = {
  session: Workout;
  activity?: ActivityType;
  onSubmit: (payload: FinishWorkoutPayload) => Promise<void>;
};

/**
 * Fin d'une séance en cours. La durée proposée est le temps écoulé depuis le début ; elle
 * reste modifiable (séance terminée plus tôt, oubli de l'arrêter…).
 */
export function FinishSessionForm({ session, activity, onSubmit }: FinishSessionFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  // Au-delà de 24 h, aucune durée n'est proposée : l'utilisateur saisit la durée réelle.
  const elapsed = elapsedSeconds(session.started_at);
  const duration =
    elapsed >= 60 && elapsed <= MAX_DURATION_SECONDS
      ? splitDuration(elapsed)
      : { hours: '', minutes: '' };

  const { control, handleSubmit, setError, formState } = useForm<
    FinishSessionFormValues,
    unknown,
    FinishWorkoutPayload
  >({
    resolver: zodResolver(finishSessionSchema),
    defaultValues: {
      ...duration,
      intensity: 5,
      distance: '',
      calories: '',
      notes: session.notes,
    },
  });
  const distance = useWatch({ control, name: 'distance' });

  const submit = handleSubmit(async (payload) => {
    setMessage(null);
    try {
      await onSubmit(payload);
    } catch (error) {
      const renamed = renameFieldErrors(error, {
        duration_seconds: 'minutes',
        distance_km: 'distance',
        estimated_calories: 'calories',
      });
      setMessage(applyApiErrors(renamed, setError, FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <SessionEndFields
        control={control}
        showDistance={Boolean(activity?.tracks_distance || distance)}
      />
      <FormMessage message={message} />
      <Button
        mode="contained"
        icon="flag-checkered"
        onPress={() => submit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        Terminer la séance
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
