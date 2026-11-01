import { router, Stack } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { EmptyState } from '@/components/empty-state';
import { GoalCard } from '@/features/finance/goal-card';
import { useGoals } from '@/features/finance/queries';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const goals = useGoals();

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <IconButton
            icon="plus"
            mode="contained-tonal"
            onPress={() => router.push('/goals/new')}
            accessibilityLabel="Nouvel objectif"
          />
        ),
      }}
    />
  );

  if (goals.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (goals.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(goals.error)}
        actionLabel="Réessayer"
        onAction={() => goals.refetch()}
      />
    );
  }

  return (
    <>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={goals.isRefetching}
            onRefresh={() => void goals.refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {goals.data.length === 0 ? (
          <EmptyState
            icon="flag-checkered"
            tone="tertiary"
            title="Aucun objectif"
            message="Fixez un montant à atteindre, suivi par le solde d’un compte d’épargne."
            actionLabel="Créer un objectif"
            onAction={() => router.push('/goals/new')}
          />
        ) : (
          goals.data.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
});
