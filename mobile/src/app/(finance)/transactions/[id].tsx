import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import { EmptyState } from '@/components/empty-state';
import { formatAmount } from '@/features/finance/format';
import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/features/finance/queries';
import { TransactionForm } from '@/features/finance/transaction-form';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const transaction = useTransaction(id);
  const updateTransaction = useUpdateTransaction(id);
  const deleteTransaction = useDeleteTransaction(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTransaction.mutateAsync();
      setConfirmVisible(false);
      router.back();
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  if (transaction.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }

  if (transaction.isError) {
    const notFound = transaction.error instanceof ApiError && transaction.error.status === 404;
    return (
      <EmptyState
        icon={notFound ? 'file-question-outline' : 'wifi-alert'}
        tone="error"
        title={notFound ? 'Transaction introuvable' : 'Chargement impossible'}
        message={notFound ? 'Elle a peut-être été supprimée.' : errorMessage(transaction.error)}
        actionLabel={notFound ? 'Retour' : 'Réessayer'}
        onAction={() => (notFound ? router.back() : transaction.refetch())}
      />
    );
  }

  const tx = transaction.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: tx.type === 'income' ? 'Revenu' : 'Dépense',
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              onPress={() => setConfirmVisible(true)}
              accessibilityLabel="Supprimer la transaction"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TransactionForm
          initial={tx}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (values) => {
            await updateTransaction.mutateAsync(values);
            router.back();
          }}
        />
      </ScrollView>
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Supprimer la transaction ?</Dialog.Title>
          <Dialog.Content style={styles.dialog}>
            <Text variant="bodyMedium">
              {`${tx.category_name} · ${formatAmount(tx.amount, tx.currency)}. Cette action est définitive.`}
            </Text>
            {deleteError ? <Text style={{ color: colors.error }}>{deleteError}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Annuler</Button>
            <Button
              textColor={colors.error}
              onPress={onDelete}
              loading={deleteTransaction.isPending}
              disabled={deleteTransaction.isPending}>
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40 },
  dialog: { gap: 8 },
});
