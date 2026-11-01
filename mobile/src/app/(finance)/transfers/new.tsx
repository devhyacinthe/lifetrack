import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useCreateTransfer } from '@/features/finance/queries';
import { TransferForm } from '@/features/finance/transfer-form';

export default function NewTransferScreen() {
  const { from, to } = useLocalSearchParams<{ from?: string; to?: string }>();
  const createTransfer = useCreateTransfer();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TransferForm
        defaultFrom={from}
        defaultTo={to}
        submitLabel="Transférer"
        onSubmit={async (values) => {
          // L'écran ne se ferme qu'après la confirmation du backend.
          await createTransfer.mutateAsync(values);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
