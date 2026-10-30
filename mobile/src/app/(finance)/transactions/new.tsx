import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { TransactionForm } from '@/features/finance/transaction-form';
import { useCreateTransaction } from '@/features/finance/queries';

export default function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const createTransaction = useCreateTransaction();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TransactionForm
        defaultType={type === 'income' ? 'income' : 'expense'}
        submitLabel="Enregistrer"
        onSubmit={async (values) => {
          // L'écran ne se ferme qu'après la confirmation du backend.
          await createTransaction.mutateAsync(values);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
