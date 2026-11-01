import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import { GoalCard } from '@/features/finance/goal-card';
import { GoalForm } from '@/features/finance/goal-form';
import { useDeleteGoal, useGoal, useUpdateGoal } from '@/features/finance/queries';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const goal = useGoal(id);
  const updateGoal = useUpdateGoal(id);
  const deleteGoal = useDeleteGoal(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!goal.isSuccess) return <QueryStatus query={goal} notFoundTitle="Objectif introuvable" />;
  const g = goal.data;

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
          title: g.name,
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
        <GoalCard goal={g} />
        <GoalForm
          initial={g}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (payload) => {
            await updateGoal.mutateAsync(payload);
            router.back();
          }}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title={`Supprimer « ${g.name} » ?`}
        message={`Le compte « ${g.account_name} » et son solde sont conservés : seul l’objectif est supprimé.`}
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
