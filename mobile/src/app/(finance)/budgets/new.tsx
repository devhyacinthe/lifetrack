import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { BudgetForm } from '@/features/finance/budget-form';
import { useCreateBudget } from '@/features/finance/queries';
import { useMe } from '@/features/profile/queries';

export default function NewBudgetScreen() {
  const me = useMe();
  const createBudget = useCreateBudget();

  if (me.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BudgetForm
        defaultCurrency={me.data?.preferred_currency ?? 'XOF'}
        submitLabel="Créer le budget"
        onSubmit={async (payload) => {
          await createBudget.mutateAsync(payload);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40 },
});
