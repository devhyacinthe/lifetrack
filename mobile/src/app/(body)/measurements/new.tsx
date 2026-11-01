import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { MeasurementForm } from '@/features/body/measurement-form';
import { useCreateMeasurement } from '@/features/body/queries';

export default function NewMeasurementScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const createMeasurement = useCreateMeasurement();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <MeasurementForm
        defaultType={type}
        submitLabel="Enregistrer la mesure"
        onSubmit={async (payload) => {
          // L'écran ne se ferme qu'après la confirmation du backend.
          await createMeasurement.mutateAsync(payload);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
