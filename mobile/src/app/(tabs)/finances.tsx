import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import type { TransactionFilters as ApiFilters } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { periodRange } from '@/features/finance/format';
import { groupByDay, type TransactionSection } from '@/features/finance/grouping';
import { useCategories, useTransactions } from '@/features/finance/queries';
import {
  DEFAULT_FILTERS,
  type FilterState,
  hasActiveFilters,
  TransactionFilters,
} from '@/features/finance/transaction-filters';
import { TransactionItem } from '@/features/finance/transaction-item';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { dayLabel } from '@/utils/dates';

export default function FinancesScreen() {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const search = useDebouncedValue(filters.search.trim());
  const categories = useCategories();

  const apiFilters = useMemo<ApiFilters>(
    () => ({
      search: search || undefined,
      type: filters.type,
      category: filters.category,
      ordering: filters.ordering,
      ...periodRange(filters.period),
    }),
    [search, filters.type, filters.category, filters.ordering, filters.period],
  );
  const transactions = useTransactions(apiFilters);

  // Trié par date : sections par jour. Trié par montant : une seule section, date dans la ligne.
  const byDate = filters.ordering === '-date' || filters.ordering === 'date';
  const items = useMemo(
    () => transactions.data?.pages.flatMap((page) => page.results) ?? [],
    [transactions.data],
  );
  const sections = useMemo<TransactionSection[]>(
    () => (byDate ? groupByDay(items) : items.length ? [{ date: '', data: items }] : []),
    [byDate, items],
  );
  const count = transactions.data?.pages[0]?.count;
  const filtered = hasActiveFilters(filters);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text variant="headlineLarge" accessibilityRole="header">
            Finances
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {count === undefined
              ? 'Vos revenus et dépenses'
              : `${count} transaction${count > 1 ? 's' : ''}${filtered ? ' trouvée' + (count > 1 ? 's' : '') : ''}`}
          </Text>
        </View>
        <IconButton
          icon="shape-outline"
          mode="contained-tonal"
          onPress={() => router.push('/categories')}
          accessibilityLabel="Gérer les catégories"
        />
      </View>
      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        categories={categories.data ?? []}
      />
    </View>
  );

  const renderEmpty = () => {
    if (transactions.isPending) {
      return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
    }
    if (transactions.isError) {
      return (
        <EmptyState
          icon="wifi-alert"
          tone="error"
          title="Chargement impossible"
          message={errorMessage(transactions.error)}
          actionLabel="Réessayer"
          onAction={() => transactions.refetch()}
        />
      );
    }
    return filtered ? (
      <EmptyState
        icon="magnify-close"
        title="Aucun résultat"
        message="Aucune transaction ne correspond à ces filtres."
        actionLabel="Réinitialiser les filtres"
        onAction={() => setFilters(DEFAULT_FILTERS)}
      />
    ) : (
      <EmptyState
        icon="cash-plus"
        tone="primary"
        title="Aucune transaction"
        message="Enregistrez votre première dépense ou votre premier revenu."
        actionLabel="Ajouter une transaction"
        onAction={() => router.push('/transactions/new')}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(tx) => tx.id}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) =>
          section.date ? (
            <Text
              variant="labelLarge"
              style={[styles.sectionHeader, { color: colors.onSurfaceVariant }]}
              accessibilityRole="header">
              {dayLabel(section.date)}
            </Text>
          ) : (
            <View style={styles.sectionSpacer} />
          )
        }
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              index === 0 && styles.cardFirst,
              index === section.data.length - 1 && styles.cardLast,
              index > 0 && styles.cardNext,
            ]}>
            <TransactionItem
              transaction={item}
              showDate={!byDate}
              onPress={() =>
                router.push({ pathname: '/transactions/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        onEndReached={() => {
          if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
            transactions.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          transactions.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} accessibilityLabel="Chargement de la suite" />
          ) : transactions.isFetchNextPageError ? (
            <Text style={[styles.footer, styles.center, { color: colors.error }]}>
              Impossible de charger la suite. Faites défiler pour réessayer.
            </Text>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={transactions.isRefetching && !transactions.isFetchingNextPage}
            onRefresh={() => void transactions.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
      <FAB
        icon="plus"
        label="Ajouter"
        style={styles.fab}
        onPress={() => router.push('/transactions/new')}
        accessibilityLabel="Ajouter une transaction"
      />
    </SafeAreaView>
  );
}

const RADIUS = 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  header: { gap: 16, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleText: { flex: 1, gap: 4 },
  loader: { marginTop: 48 },
  sectionHeader: { marginTop: 16, marginBottom: 8, marginLeft: 4 },
  sectionSpacer: { height: 12 },
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
  center: { textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20, borderRadius: 18 },
});
