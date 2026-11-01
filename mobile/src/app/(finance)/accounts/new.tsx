import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { AccountForm } from '@/features/finance/account-form';
import { useCreateAccount } from '@/features/finance/queries';
import { useMe } from '@/features/profile/queries';

export default function NewAccountScreen() {
  const me = useMe();
  const createAccount = useCreateAccount();

  if (me.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AccountForm
        defaultCurrency={me.data?.preferred_currency ?? 'XOF'}
        submitLabel="Créer le compte"
        onSubmit={async (values) => {
          await createAccount.mutateAsync(values);
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
