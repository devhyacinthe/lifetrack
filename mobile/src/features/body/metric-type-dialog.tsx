import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

import type { MetricType } from '@/api/types';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type MetricTypeValues, metricTypeSchema } from '@/schemas/body';

import { useCreateMetricType, useUpdateMetricType } from './queries';

type MetricTypeDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Type modifié ; absent pour une création. */
  metricType?: MetricType;
};

/** Création ou modification d'un type de mesure (nom et unité). */
export function MetricTypeDialog({ visible, onDismiss, metricType }: MetricTypeDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        {/* Monté à chaque ouverture : le formulaire repart des bonnes valeurs. */}
        {visible ? <MetricTypeDialogForm onDismiss={onDismiss} metricType={metricType} /> : null}
      </Dialog>
    </Portal>
  );
}

function MetricTypeDialogForm({ onDismiss, metricType }: Omit<MetricTypeDialogProps, 'visible'>) {
  const { colors } = useTheme();
  const createType = useCreateMetricType();
  const updateType = useUpdateMetricType();
  const [message, setMessage] = useState<string | null>(null);
  // Changer l'unité fausserait l'historique : le backend la refuse dès qu'une mesure existe.
  const unitLocked = (metricType?.measurements_count ?? 0) > 0;
  const { control, handleSubmit, setError, formState } = useForm<MetricTypeValues>({
    resolver: zodResolver(metricTypeSchema),
    defaultValues: { name: metricType?.name ?? '', unit: metricType?.unit ?? '' },
  });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      if (metricType) {
        await updateType.mutateAsync({
          id: metricType.id,
          name: values.name,
          ...(unitLocked ? {} : { unit: values.unit }),
        });
      } else {
        await createType.mutateAsync(values);
      }
      onDismiss();
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['name', 'unit']));
    }
  });

  return (
    <>
      <Dialog.Title>{metricType ? 'Modifier la mesure' : 'Nouvelle mesure'}</Dialog.Title>
      <Dialog.Content style={styles.content}>
        <FormTextInput
          control={control}
          name="name"
          label="Nom (ex. Tour de bras)"
          icon="tape-measure"
          autoFocus
          maxLength={60}
        />
        <FormTextInput
          control={control}
          name="unit"
          label="Unité (kg, cm, %…)"
          icon="ruler"
          maxLength={15}
          disabled={unitLocked}
          autoCapitalize="none"
        />
        {unitLocked ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            L’unité ne peut plus changer : des valeurs sont déjà enregistrées. Créez une autre
            mesure pour une autre unité.
          </Text>
        ) : null}
        <FormMessage message={message} />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Annuler</Button>
        <Button
          onPress={() => submit()}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}>
          {metricType ? 'Enregistrer' : 'Créer'}
        </Button>
      </Dialog.Actions>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
