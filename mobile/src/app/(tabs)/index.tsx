import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { EmptyState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { BalanceHero } from '@/features/dashboard/balance-hero';
import { DashboardSection } from '@/features/dashboard/dashboard-section';
import { useDashboard } from '@/features/dashboard/queries';
import { SportSummary } from '@/features/dashboard/sport-summary';
import { BudgetCard } from '@/features/finance/budget-card';
import { TransactionItem } from '@/features/finance/transaction-item';
import { useMe } from '@/features/profile/queries';
import { OngoingSessionCard } from '@/features/workouts/ongoing-session-card';
import { SessionItem } from '@/features/workouts/session-item';
import { WorkoutGoalCard } from '@/features/workouts/workout-goal-card';

/** Nombre de budgets et d'objectifs affichés sur l'accueil (les autres : « Tout voir »). */
const BUDGETS_PREVIEW = 3;
const GOALS_PREVIEW = 2;

export default function HomeScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const dashboard = useDashboard();
  const firstName = me.data?.first_name;
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const header = (
    <View style={styles.header}>
      <Text variant="labelLarge" style={{ color: colors.primary }}>
        {today.charAt(0).toUpperCase() + today.slice(1)}
      </Text>
      <Text variant="headlineLarge" accessibilityRole="header">
        {firstName ? `Bonjour, ${firstName}` : 'Bonjour'}
      </Text>
    </View>
  );

  let body;
  if (dashboard.isPending) {
    body = (
      <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement du tableau de bord" />
    );
  } else if (dashboard.isError) {
    body = (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Tableau de bord indisponible"
        message={errorMessage(dashboard.error)}
        actionLabel="Réessayer"
        onAction={() => dashboard.refetch()}
      />
    );
  } else {
    const data = dashboard.data;
    body = (
      <>
        {data.ongoing_session ? <OngoingSessionCard session={data.ongoing_session} /> : null}

        <BalanceHero dashboard={data} />

        <DashboardSection
          title="Budgets"
          href="/budgets"
          isEmpty={data.budgets.length === 0}
          emptyMessage="Aucun budget : fixez une limite de dépenses par mois ou par catégorie."
          emptyAction={{ label: 'Créer', href: '/budgets/new' }}>
          {data.budgets.slice(0, BUDGETS_PREVIEW).map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onPress={() => router.push({ pathname: '/budgets/[id]', params: { id: budget.id } })}
            />
          ))}
        </DashboardSection>

        <DashboardSection title="Sport ce mois-ci" href="/sport" isEmpty={false}>
          <SportSummary stats={data.workouts} />
        </DashboardSection>

        <DashboardSection
          title="Objectifs sportifs"
          href="/sport-goals"
          isEmpty={data.workout_goals.length === 0}
          emptyMessage="Aucun objectif : par exemple 3 séances par semaine."
          emptyAction={{ label: 'Créer', href: '/sport-goals/new' }}>
          {data.workout_goals.slice(0, GOALS_PREVIEW).map((goal) => (
            <WorkoutGoalCard
              key={goal.id}
              goal={goal}
              onPress={() =>
                router.push({ pathname: '/sport-goals/[id]', params: { id: goal.id } })
              }
            />
          ))}
        </DashboardSection>

        <DashboardSection
          title="Dernières transactions"
          href="/finances"
          isEmpty={data.latest_transactions.length === 0}
          emptyMessage="Aucune transaction enregistrée."
          emptyAction={{ label: 'Ajouter', href: '/transactions/new' }}>
          <ListCard>
            {data.latest_transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                showDate
                onPress={() =>
                  router.push({ pathname: '/transactions/[id]', params: { id: tx.id } })
                }
              />
            ))}
          </ListCard>
        </DashboardSection>

        <DashboardSection
          title="Dernières séances"
          href="/sport"
          isEmpty={data.latest_sessions.length === 0}
          emptyMessage="Aucune séance terminée."
          emptyAction={{ label: 'Démarrer', href: '/sessions/start' }}>
          <ListCard>
            {data.latest_sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                showDate
                onPress={() =>
                  router.push({ pathname: '/sessions/[id]', params: { id: session.id } })
                }
              />
            ))}
          </ListCard>
        </DashboardSection>
      </>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            onRefresh={() => void dashboard.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {header}
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 20 },
  header: { gap: 4 },
  loader: { marginTop: 48 },
});
