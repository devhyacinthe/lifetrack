import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import { formatDuration } from '@/features/workouts/format';
import { useDeleteSession, useSession, useUpdateSession } from '@/features/workouts/queries';
import { SessionForm } from '@/features/workouts/session-form';
import { StartSessionForm } from '@/features/workouts/start-session-form';

export default function EditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const session = useSession(id);
  const updateSession = useUpdateSession(id);
  const deleteSession = useDeleteSession(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!session.isSuccess) return <QueryStatus query={session} notFoundTitle="Séance introuvable" />;
  const s = session.data;
  const ongoing = s.status === 'in_progress';

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteSession.mutateAsync();
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
          title: ongoing ? `${s.activity_name} (en cours)` : s.activity_name,
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              onPress={() => setConfirmVisible(true)}
              accessibilityLabel="Supprimer la séance"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {ongoing ? (
          <>
            <Button
              mode="contained"
              icon="flag-checkered"
              onPress={() =>
                router.replace({ pathname: '/sessions/[id]/finish', params: { id: s.id } })
              }
              buttonColor={colors.tertiary}
              textColor={colors.onTertiary}
              contentStyle={styles.buttonContent}>
              Terminer la séance
            </Button>
            {/* En cours : seuls l'activité et les notes se modifient. */}
            <StartSessionForm
              initial={s}
              submitLabel="Enregistrer"
              onSubmit={async (values) => {
                await updateSession.mutateAsync(values);
                router.back();
              }}
            />
          </>
        ) : (
          <SessionForm
            initial={s}
            submitLabel="Enregistrer les modifications"
            onSubmit={async (payload) => {
              // Le statut ne change pas par une modification : il est retiré de l'envoi.
              const { status: _status, ...changes } = payload;
              await updateSession.mutateAsync(changes);
              router.back();
            }}
          />
        )}
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title="Supprimer la séance ?"
        message={
          s.duration_seconds
            ? `${s.activity_name} · ${formatDuration(s.duration_seconds)}. Cette action est définitive.`
            : `${s.activity_name} (en cours). Cette action est définitive.`
        }
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={() => {
          setConfirmVisible(false);
          setDeleteError(null);
        }}
        loading={deleteSession.isPending}
        error={deleteError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  buttonContent: { height: 52 },
});
