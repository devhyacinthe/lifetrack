import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import {
  useDeleteWorkoutGoal,
  useUpdateWorkoutGoal,
  useWorkoutGoal,
} from '@/features/workouts/queries';
import { WorkoutGoalCard } from '@/features/workouts/workout-goal-card';
import { WorkoutGoalForm } from '@/features/workouts/workout-goal-form';

export default function EditWorkoutGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const goal = useWorkoutGoal(id);
  const updateGoal = useUpdateWorkoutGoal(id);
  const deleteGoal = useDeleteWorkoutGoal(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!goal.isSuccess) return <QueryStatus query={goal} notFoundTitle="Objectif introuvable" />;

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteGoal.mutateAsync();
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
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              onPress={() => setConfirmVisible(true)}
              accessibilityLabel="Supprimer l’objectif"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WorkoutGoalCard goal={goal.data} />
        <WorkoutGoalForm
          initial={goal.data}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (payload) => {
            await updateGoal.mutateAsync(payload);
            router.back();
          }}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title="Supprimer l’objectif ?"
        message="Vos séances ne sont pas modifiées : seul l’objectif est supprimé."
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={() => {
          setConfirmVisible(false);
          setDeleteError(null);
        }}
        loading={deleteGoal.isPending}
        error={deleteError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 24 },
});
