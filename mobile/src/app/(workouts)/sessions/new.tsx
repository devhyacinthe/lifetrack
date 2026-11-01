import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useCreateSession } from '@/features/workouts/queries';
import { SessionForm } from '@/features/workouts/session-form';

export default function NewSessionScreen() {
  const createSession = useCreateSession();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SessionForm
        submitLabel="Enregistrer la séance passée"
        onSubmit={async (payload) => {
          // L'écran ne se ferme qu'après la confirmation du backend.
          await createSession.mutateAsync(payload);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
