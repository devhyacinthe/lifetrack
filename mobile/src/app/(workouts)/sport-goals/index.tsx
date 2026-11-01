import { router, Stack } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, IconButton, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import { EmptyState } from '@/components/empty-state';
import { useWorkoutGoals } from '@/features/workouts/queries';
import { WorkoutGoalCard } from '@/features/workouts/workout-goal-card';

export default function WorkoutGoalsScreen() {
  const { colors } = useTheme();
  const goals = useWorkoutGoals();

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <IconButton
            icon="plus"
            mode="contained-tonal"
            onPress={() => router.push('/sport-goals/new')}
            accessibilityLabel="Nouvel objectif sportif"
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
            title="Aucun objectif sportif"
            message="Fixez un nombre de séances, une durée ou une distance à atteindre chaque semaine ou chaque mois."
            actionLabel="Créer un objectif"
            onAction={() => router.push('/sport-goals/new')}
          />
        ) : (
          goals.data.map((goal) => (
            <WorkoutGoalCard
              key={goal.id}
              goal={goal}
              onPress={() =>
                router.push({ pathname: '/sport-goals/[id]', params: { id: goal.id } })
              }
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
