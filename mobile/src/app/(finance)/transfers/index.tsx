import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Transfer } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { formatAmount } from '@/features/finance/format';
import { useTransfers } from '@/features/finance/queries';
import { dayLabel } from '@/utils/dates';

function TransferRow({ transfer: tr }: { transfer: Transfer }) {
  const { colors } = useTheme();
  const amount = formatAmount(tr.amount, tr.currency);

  return (
    <TouchableRipple
      onPress={() => router.push({ pathname: '/transfers/[id]', params: { id: tr.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Transfert de ${tr.from_account_name} vers ${tr.to_account_name}, ${amount}`}>
      <View style={styles.row}>
        <IconBadge icon="swap-horizontal" tone="secondary" size={44} />
        <View style={styles.text}>
          <Text variant="titleSmall" numberOfLines={1}>
            {`${tr.from_account_name} → ${tr.to_account_name}`}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {[dayLabel(tr.date), tr.description].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text variant="titleSmall" style={styles.amount}>
          {amount}
        </Text>
      </View>
    </TouchableRipple>
  );
}

export default function TransfersScreen() {
  const { colors } = useTheme();
  const transfers = useTransfers();
  const items = useMemo(
    () => transfers.data?.pages.flatMap((page) => page.results) ?? [],
    [transfers.data],
  );

  const renderEmpty = () => {
    if (transfers.isPending) {
      return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
    }
    if (transfers.isError) {
      return (
        <EmptyState
          icon="wifi-alert"
          tone="error"
          title="Chargement impossible"
          message={errorMessage(transfers.error)}
          actionLabel="Réessayer"
          onAction={() => transfers.refetch()}
        />
      );
    }
    return (
      <EmptyState
        icon="swap-horizontal"
        title="Aucun transfert"
        message="Déplacez de l’argent entre vos comptes sans créer de dépense ni de revenu."
        actionLabel="Nouveau transfert"
        onAction={() => router.push('/transfers/new')}
      />
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon="plus"
              mode="contained-tonal"
              onPress={() => router.push('/transfers/new')}
              accessibilityLabel="Nouveau transfert"
            />
          ),
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(tr) => tr.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              index === 0 && styles.cardFirst,
              index === items.length - 1 && styles.cardLast,
              index > 0 && styles.cardNext,
            ]}>
            <TransferRow transfer={item} />
          </View>
        )}
        onEndReached={() => {
          if (transfers.hasNextPage && !transfers.isFetchingNextPage) transfers.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          transfers.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} accessibilityLabel="Chargement de la suite" />
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={transfers.isRefetching && !transfers.isFetchingNextPage}
            onRefresh={() => void transfers.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </>
  );
}

const RADIUS = 20;

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  list: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { flex: 1, gap: 2 },
  amount: { fontWeight: '700' },
  card: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  cardLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  cardNext: { borderTopWidth: StyleSheet.hairlineWidth },
  footer: { marginTop: 16 },
});
