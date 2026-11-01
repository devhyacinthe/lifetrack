import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormMessage } from '@/components/form-message';
import { QueryStatus } from '@/components/query-status';
import { AccountForm } from '@/features/finance/account-form';
import { formatAmount } from '@/features/finance/format';
import { ACCOUNT_TYPE_LABELS } from '@/features/finance/labels';
import { useAccount, useDeleteAccount, useUpdateAccount } from '@/features/finance/queries';

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, dark } = useTheme();
  const account = useAccount(id);
  const updateAccount = useUpdateAccount(id);
  const deleteAccount = useDeleteAccount(id);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [inUse, setInUse] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  if (!account.isSuccess) return <QueryStatus query={account} notFoundTitle="Compte introuvable" />;
  const acc = account.data;

  const closeConfirm = () => {
    setConfirmVisible(false);
    setDeleteError(null);
    setInUse(false);
  };

  const setArchived = async (isArchived: boolean) => {
    setArchiveError(null);
    try {
      await updateAccount.mutateAsync({ is_archived: isArchived });
      closeConfirm();
    } catch (error) {
      setArchiveError(errorMessage(error));
    }
  };

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync();
      closeConfirm();
      router.back();
    } catch (error) {
      // 409 : le compte a des opérations ou un objectif ; on propose de l'archiver.
      if (error instanceof ApiError && error.status === 409) setInUse(true);
      setDeleteError(errorMessage(error));
    }
  };

  const heroColor = dark ? colors.primaryContainer : colors.primary;
  const onHero = dark ? colors.onPrimaryContainer : colors.onPrimary;

  return (
    <>
      <Stack.Screen
        options={{
          title: acc.name,
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              onPress={() => setConfirmVisible(true)}
              accessibilityLabel="Supprimer le compte"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: heroColor }]}>
          <Text variant="labelLarge" style={[styles.dim, { color: onHero }]}>
            {`Solde actuel · ${ACCOUNT_TYPE_LABELS[acc.type]}`}
          </Text>
          <Text variant="headlineMedium" style={{ color: onHero }}>
            {formatAmount(acc.balance, acc.currency)}
          </Text>
          <Text variant="bodySmall" style={[styles.dim, { color: onHero }]}>
            {`Solde initial : ${formatAmount(acc.initial_balance, acc.currency)}`}
          </Text>
        </View>

        {!acc.is_archived ? (
          <Button
            mode="contained-tonal"
            icon="swap-horizontal"
            onPress={() => router.push({ pathname: '/transfers/new', params: { from: acc.id } })}>
            Transférer depuis ce compte
          </Button>
        ) : null}

        <AccountForm
          initial={acc}
          defaultCurrency={acc.currency}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (values) => {
            await updateAccount.mutateAsync(values);
            router.back();
          }}
        />

        <FormMessage message={archiveError} />
        <Button
          mode="outlined"
          icon={acc.is_archived ? 'archive-arrow-up-outline' : 'archive-outline'}
          onPress={() => setArchived(!acc.is_archived)}
          loading={updateAccount.isPending}>
          {acc.is_archived ? 'Réactiver le compte' : 'Archiver le compte'}
        </Button>
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title={`Supprimer « ${acc.name} » ?`}
        message="Un compte qui a des opérations ou un objectif d’épargne ne peut pas être supprimé : il peut seulement être archivé."
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        onDismiss={closeConfirm}
        loading={deleteAccount.isPending}
        error={deleteError}
        alternative={
          inUse && !acc.is_archived ? (
            <Button onPress={() => setArchived(true)} loading={updateAccount.isPending}>
              Archiver
            </Button>
          ) : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  hero: { borderRadius: 28, padding: 20, gap: 4 },
  dim: { opacity: 0.85 },
});
