import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Switch, Text } from 'react-native-paper';

import type { ActivityType } from '@/api/types';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type ActivityValues, activitySchema } from '@/schemas/workouts';

import { useCreateActivity, useUpdateActivity } from './queries';

type ActivityDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Activité modifiée ; absente pour une création. */
  activity?: ActivityType;
};

/** Création ou modification d'une activité (nom et suivi de la distance). */
export function ActivityDialog({ visible, onDismiss, activity }: ActivityDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        {/* Monté à chaque ouverture : le formulaire repart des bonnes valeurs. */}
        {visible ? <ActivityDialogForm onDismiss={onDismiss} activity={activity} /> : null}
      </Dialog>
    </Portal>
  );
}

function ActivityDialogForm({ onDismiss, activity }: Omit<ActivityDialogProps, 'visible'>) {
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: activity?.name ?? '',
      tracks_distance: activity?.tracks_distance ?? false,
    },
  });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      if (activity) await updateActivity.mutateAsync({ id: activity.id, ...values });
      else await createActivity.mutateAsync(values);
      onDismiss();
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['name', 'tracks_distance']));
    }
  });

  return (
    <>
      <Dialog.Title>{activity ? 'Modifier l’activité' : 'Nouvelle activité'}</Dialog.Title>
      <Dialog.Content style={styles.content}>
        <FormTextInput
          control={control}
          name="name"
          label="Nom"
          icon="run"
          autoFocus
          maxLength={60}
        />
        <Controller
          control={control}
          name="tracks_distance"
          render={({ field }) => (
            <View style={styles.switchRow}>
              <Text variant="bodyLarge" style={styles.switchLabel}>
                Mesurer la distance
              </Text>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                accessibilityLabel="Mesurer la distance"
              />
            </View>
          )}
        />
        <FormMessage message={message} />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Annuler</Button>
        <Button
          onPress={() => submit()}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}>
          {activity ? 'Enregistrer' : 'Créer'}
        </Button>
      </Dialog.Actions>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { flex: 1 },
});
