import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import { formatMeasure } from '@/features/body/format';
import { MeasurementForm } from '@/features/body/measurement-form';
import {
  useDeleteMeasurement,
  useMeasurement,
  useUpdateMeasurement,
} from '@/features/body/queries';
import { dayLabel } from '@/utils/dates';

export default function EditMeasurementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const measurement = useMeasurement(id);
  const updateMeasurement = useUpdateMeasurement(id);
  const deleteMeasurement = useDeleteMeasurement(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!measurement.isSuccess) {
    return <QueryStatus query={measurement} notFoundTitle="Valeur introuvable" />;
  }

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteMeasurement.mutateAsync();
      setConfirmVisible(false);
      router.back();
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: measurement.data.metric_type_name,
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              onPress={() => setConfirmVisible(true)}
              accessibilityLabel="Supprimer la valeur"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <MeasurementForm
          initial={measurement.data}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (payload) => {
            await updateMeasurement.mutateAsync(payload);
            router.back();
          }}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title="Supprimer cette valeur ?"
        message={`${measurement.data.metric_type_name} : ${formatMeasure(
          measurement.data.value,
          measurement.data.unit,
        )} (${dayLabel(measurement.data.date)}).`}
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={() => {
          setConfirmVisible(false);
          setDeleteError(null);
        }}
        loading={deleteMeasurement.isPending}
        error={deleteError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
