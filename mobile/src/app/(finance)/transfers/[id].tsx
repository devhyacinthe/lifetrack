import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { QueryStatus } from '@/components/query-status';
import { formatAmount } from '@/features/finance/format';
import { useDeleteTransfer, useTransfer, useUpdateTransfer } from '@/features/finance/queries';
import { TransferForm } from '@/features/finance/transfer-form';

export default function EditTransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const transfer = useTransfer(id);
  const updateTransfer = useUpdateTransfer(id);
  const deleteTransfer = useDeleteTransfer(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!transfer.isSuccess) {
    return <QueryStatus query={transfer} notFoundTitle="Transfert introuvable" />;
  }
  const tr = transfer.data;

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTransfer.mutateAsync();
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
              accessibilityLabel="Supprimer le transfert"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TransferForm
          initial={tr}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (values) => {
            await updateTransfer.mutateAsync(values);
            router.back();
          }}
        />
      </ScrollView>
      <ConfirmDialog
        visible={confirmVisible}
        title="Supprimer le transfert ?"
        message={`${tr.from_account_name} → ${tr.to_account_name} · ${formatAmount(tr.amount, tr.currency)}. Les soldes des deux comptes seront recalculés.`}
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={() => {
          setConfirmVisible(false);
          setDeleteError(null);
        }}
        loading={deleteTransfer.isPending}
        error={deleteError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
