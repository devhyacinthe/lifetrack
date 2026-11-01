import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, IconButton } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { EmptyState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { AccountRow } from '@/features/finance/account-card';
import { useAccounts } from '@/features/finance/queries';

export default function AccountsScreen() {
  const accounts = useAccounts();

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <IconButton
            icon="plus"
            mode="contained-tonal"
            onPress={() => router.push('/accounts/new')}
            accessibilityLabel="Nouveau compte"
          />
        ),
      }}
    />
  );

  if (accounts.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (accounts.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(accounts.error)}
        actionLabel="Réessayer"
        onAction={() => accounts.refetch()}
      />
    );
  }

  const active = accounts.data.filter((a) => !a.is_archived);
  const archived = accounts.data.filter((a) => a.is_archived);
  const open = (id: string) => router.push({ pathname: '/accounts/[id]', params: { id } });

  return (
    <>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="swap-horizontal"
            onPress={() => router.push('/transfers/new')}
            disabled={active.length < 2}
            style={styles.action}>
            Transférer
          </Button>
          <Button
            mode="contained-tonal"
            icon="history"
            onPress={() => router.push('/transfers')}
            style={styles.action}>
            Historique
          </Button>
        </View>

        {active.length === 0 ? (
          <EmptyState
            icon="wallet-plus-outline"
            title="Aucun compte actif"
            message="Ajoutez vos comptes : espèces, banque, Mobile Money ou épargne."
            actionLabel="Nouveau compte"
            onAction={() => router.push('/accounts/new')}
          />
        ) : (
          <ListCard
            title="Comptes actifs"
            subtitle="Soldes calculés à partir de vos opérations enregistrées.">
            {active.map((account) => (
              <AccountRow key={account.id} account={account} onPress={() => open(account.id)} />
            ))}
          </ListCard>
        )}

        {archived.length > 0 ? (
          <ListCard
            title="Archivés"
            subtitle="Conservés pour l’historique, ils ne sont plus proposés à la saisie.">
            {archived.map((account) => (
              <AccountRow key={account.id} account={account} onPress={() => open(account.id)} />
            ))}
          </ListCard>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, borderRadius: 16 },
});
