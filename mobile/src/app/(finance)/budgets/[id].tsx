import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import { BudgetCard } from '@/features/finance/budget-card';
import { BudgetForm } from '@/features/finance/budget-form';
import { useBudget, useDeleteBudget, useUpdateBudget } from '@/features/finance/queries';

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const budget = useBudget(id);
  const updateBudget = useUpdateBudget(id);
  const deleteBudget = useDeleteBudget(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!budget.isSuccess) return <QueryStatus query={budget} notFoundTitle="Budget introuvable" />;
  const b = budget.data;

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteBudget.mutateAsync();
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
              accessibilityLabel="Supprimer le budget"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BudgetCard budget={b} />
        <BudgetForm
          initial={b}
          defaultCurrency={b.currency}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (payload) => {
            await updateBudget.mutateAsync(payload);
            router.back();
          }}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title="Supprimer le budget ?"
        message="Vos transactions ne sont pas modifiées : seul le plafond est supprimé."
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={() => {
          setConfirmVisible(false);
          setDeleteError(null);
        }}
        loading={deleteBudget.isPending}
        error={deleteError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 24 },
});
