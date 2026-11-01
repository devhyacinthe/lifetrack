import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { EmptyState } from '@/components/empty-state';
import { QueryStatus } from '@/components/query-status';
import { FinishSessionForm } from '@/features/workouts/finish-session-form';
import { localTimeOf } from '@/features/workouts/format';
import { useActivities, useFinishSession, useSession } from '@/features/workouts/queries';

export default function FinishSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const session = useSession(id);
  const activities = useActivities();
  const finishSession = useFinishSession(id);

  if (!session.isSuccess) return <QueryStatus query={session} notFoundTitle="Séance introuvable" />;
  const s = session.data;

  if (s.status !== 'in_progress') {
    return (
      <EmptyState
        icon="check-circle-outline"
        tone="primary"
        title="Séance déjà terminée"
        message="Vous pouvez encore la modifier depuis l’historique."
        actionLabel="Retour"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Terminer : ${s.activity_name}` }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text variant="titleMedium">{`Commencée à ${localTimeOf(s.started_at)}`}</Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            La durée proposée est le temps écoulé depuis le début : corrigez-la si besoin.
          </Text>
        </View>
        <FinishSessionForm
          session={s}
          activity={activities.data?.find((a) => a.id === s.activity)}
          onSubmit={async (payload) => {
            // L'écran ne se ferme qu'après la confirmation du backend.
            await finishSession.mutateAsync(payload);
            router.back();
          }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  intro: { gap: 4 },
});
