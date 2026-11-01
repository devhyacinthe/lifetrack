import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, TextInput, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { ActivityType, Workout } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { EmptyState } from '@/components/empty-state';
import { FormMessage } from '@/components/form-message';
import { applyApiErrors } from '@/forms/api-errors';
import { type StartSessionValues, startSessionSchema } from '@/schemas/workouts';

import { activityIcon } from './labels';
import { useActivities } from './queries';

type StartSessionFormProps = {
  /** Séance en cours modifiée ; absente pour un démarrage. */
  initial?: Workout;
  submitLabel: string;
  submitIcon?: string;
  onSubmit: (values: StartSessionValues) => Promise<void>;
};

/** Démarrage d'une séance (activité et notes), ou modification d'une séance en cours. */
export function StartSessionForm(props: StartSessionFormProps) {
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
  return <StartSessionFields {...props} activities={activities.data} />;
}

function StartSessionFields({
  initial,
  submitLabel,
  submitIcon,
  onSubmit,
  activities,
}: StartSessionFormProps & { activities: ActivityType[] }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const usable = activities.filter((a) => a.is_active || a.id === initial?.activity);
  const { control, handleSubmit, setError, formState } = useForm<StartSessionValues>({
    resolver: zodResolver(startSessionSchema),
    defaultValues: { activity: initial?.activity ?? '', notes: initial?.notes ?? '' },
  });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['activity', 'notes']));
    }
  });

  if (usable.length === 0) {
    return (
      <EmptyState
        icon="run"
        title="Aucune activité active"
        message="Réactivez ou créez une activité pour démarrer une séance."
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
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Notes (facultatif)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              maxLength={1000}
              error={Boolean(fieldState.error)}
              accessibilityLabel="Notes"
              outlineStyle={styles.outline}
              style={{ backgroundColor: colors.surface }}
            />
            {fieldState.error ? (
              <HelperText type="error" visible>
                {fieldState.error.message}
              </HelperText>
            ) : null}
          </View>
        )}
      />
      {!initial ? (
        <HelperText type="info" visible>
          La séance démarre maintenant. Durée, intensité, distance et calories se renseignent quand
          vous la terminez.
        </HelperText>
      ) : null}
      <FormMessage message={message} />
      <Button
        mode="contained"
        icon={submitIcon}
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
  outline: { borderRadius: 16 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
