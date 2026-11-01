import { router, Stack } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { BudgetPeriod } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { BudgetCard } from '@/features/finance/budget-card';
import { BUDGET_PERIOD_LABELS, BUDGET_PERIODS } from '@/features/finance/labels';
import { useBudgets } from '@/features/finance/queries';

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const budgets = useBudgets();

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <IconButton
            icon="plus"
            mode="contained-tonal"
            onPress={() => router.push('/budgets/new')}
            accessibilityLabel="Nouveau budget"
          />
        ),
      }}
    />
  );

  if (budgets.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (budgets.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(budgets.error)}
        actionLabel="Réessayer"
        onAction={() => budgets.refetch()}
      />
    );
  }

  const byPeriod = (period: BudgetPeriod) => budgets.data.filter((b) => b.period === period);

  return (
    <>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={budgets.isRefetching}
            onRefresh={() => void budgets.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {budgets.data.length === 0 ? (
          <EmptyState
            icon="chart-donut"
            tone="primary"
            title="Aucun budget"
            message="Fixez un plafond de dépenses par semaine, par mois ou par an, pour toutes vos dépenses ou une catégorie."
            actionLabel="Créer un budget"
            onAction={() => router.push('/budgets/new')}
          />
        ) : (
          BUDGET_PERIODS.map((period) =>
            byPeriod(period).length ? (
              <View key={period} style={styles.section}>
                <Text
                  variant="titleSmall"
                  accessibilityRole="header"
                  style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                  {BUDGET_PERIOD_LABELS[period]}
                </Text>
                {byPeriod(period).map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onPress={() =>
                      router.push({ pathname: '/budgets/[id]', params: { id: budget.id } })
                    }
                  />
                ))}
              </View>
            ) : null,
          )
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { marginLeft: 4 },
});
