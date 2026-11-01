import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useStartSession } from '@/features/workouts/queries';
import { StartSessionForm } from '@/features/workouts/start-session-form';

export default function StartSessionScreen() {
  const startSession = useStartSession();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StartSessionForm
        submitLabel="Démarrer maintenant"
        submitIcon="play"
        onSubmit={async (values) => {
          // Refusé par le backend si une séance est déjà en cours (message affiché).
          await startSession.mutateAsync({
            ...values,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          });
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
