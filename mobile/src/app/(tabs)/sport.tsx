import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, FAB, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import type { Workout } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { localDateOf } from '@/features/workouts/format';
import { activityIcon } from '@/features/workouts/labels';
import { OngoingSessionCard } from '@/features/workouts/ongoing-session-card';
import {
  useActivities,
  useOngoingSession,
  useSessions,
  useWorkoutGoals,
  workoutKeys,
} from '@/features/workouts/queries';
import { SessionItem } from '@/features/workouts/session-item';
import { StatsSummary } from '@/features/workouts/stats-summary';
import { WorkoutGoalCard } from '@/features/workouts/workout-goal-card';
import { dayLabel } from '@/utils/dates';

/** Nombre d'objectifs affichés sur l'onglet (les autres sont dans « Objectifs »). */
const GOALS_PREVIEW = 2;

type Section = { date: string; data: Workout[] };

/** Regroupe les séances (déjà triées par date) par jour local, sans changer l'ordre. */
function groupByLocalDay(sessions: Workout[]): Section[] {
  const sections: Section[] = [];
  for (const session of sessions) {
    const date = localDateOf(session.started_at);
    const last = sections[sections.length - 1];
    if (last && last.date === date) last.data.push(session);
    else sections.push({ date, data: [session] });
  }
  return sections;
}

export default function SportScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [activity, setActivity] = useState<string | undefined>();
  const activities = useActivities();
  const goals = useWorkoutGoals();
  // L'historique ne montre que les séances terminées ; la séance en cours est à part.
  const sessions = useSessions({ activity, status: 'completed' });
  const ongoing = useOngoingSession();
  const [fabOpen, setFabOpen] = useState(false);

  const items = useMemo(
    () => sessions.data?.pages.flatMap((page) => page.results) ?? [],
    [sessions.data],
  );
  const sections = useMemo(() => groupByLocalDay(items), [items]);
  const usedActivities = (activities.data ?? []).filter((a) => a.is_active);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text variant="headlineLarge" accessibilityRole="header">
          Sport
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          Séances, progression et objectifs
        </Text>
      </View>

      {ongoing.data ? <OngoingSessionCard session={ongoing.data} /> : null}

      <StatsSummary />

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="flag-checkered"
          onPress={() => router.push('/sport-goals')}
          style={styles.action}>
          Objectifs
        </Button>
        <Button
          mode="contained-tonal"
          icon="run"
          onPress={() => router.push('/activities')}
          style={styles.action}>
          Activités
        </Button>
      </View>

      {goals.data && goals.data.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.blockTitle}>
            <Text variant="titleMedium" accessibilityRole="header" style={styles.flex}>
              Objectifs en cours
            </Text>
            {goals.data.length > GOALS_PREVIEW ? (
              <Button compact onPress={() => router.push('/sport-goals')}>
                Tout voir
              </Button>
            ) : null}
          </View>
          {goals.data.slice(0, GOALS_PREVIEW).map((goal) => (
            <WorkoutGoalCard
              key={goal.id}
              goal={goal}
              onPress={() =>
                router.push({ pathname: '/sport-goals/[id]', params: { id: goal.id } })
              }
            />
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text variant="titleMedium" accessibilityRole="header">
          Historique
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          <Chip
            selected={!activity}
            showSelectedOverlay
            onPress={() => setActivity(undefined)}
            style={!activity ? { backgroundColor: colors.primaryContainer } : undefined}>
            Toutes
          </Chip>
          {usedActivities.map((a) => (
            <Chip
              key={a.id}
              icon={activityIcon(a.name)}
              selected={activity === a.id}
              showSelectedOverlay
              onPress={() => setActivity(activity === a.id ? undefined : a.id)}
              style={activity === a.id ? { backgroundColor: colors.primaryContainer } : undefined}>
              {a.name}
            </Chip>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (sessions.isPending) {
      return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
    }
    if (sessions.isError) {
      return (
        <EmptyState
          icon="wifi-alert"
          tone="error"
          title="Chargement impossible"
          message={errorMessage(sessions.error)}
          actionLabel="Réessayer"
          onAction={() => sessions.refetch()}
        />
      );
    }
    return activity ? (
      <EmptyState
        icon="magnify-close"
        title="Aucune séance"
        message="Aucune séance enregistrée pour cette activité."
        actionLabel="Voir toutes les séances"
        onAction={() => setActivity(undefined)}
      />
    ) : (
      <EmptyState
        icon="run-fast"
        tone="tertiary"
        title="Aucune séance"
        message="Démarrez une séance maintenant, ou ajoutez une séance déjà faite."
        actionLabel="Démarrer une séance"
        onAction={() => router.push('/sessions/start')}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(session) => session.id}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text
            variant="labelLarge"
            style={[styles.sectionHeader, { color: colors.onSurfaceVariant }]}
            accessibilityRole="header">
            {dayLabel(section.date)}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              index === 0 && styles.cardFirst,
              index === section.data.length - 1 && styles.cardLast,
              index > 0 && styles.cardNext,
            ]}>
            <SessionItem
              session={item}
              onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        onEndReached={() => {
          if (sessions.hasNextPage && !sessions.isFetchingNextPage) sessions.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          sessions.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} accessibilityLabel="Chargement de la suite" />
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={sessions.isRefetching && !sessions.isFetchingNextPage}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: workoutKeys.all })}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
      {/* Dans l'écran (pas de Portal) : le bouton ne doit pas apparaître sur les autres onglets. */}
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        label={fabOpen ? undefined : 'Séance'}
        onStateChange={({ open }) => setFabOpen(open)}
        accessibilityLabel="Ajouter une séance"
        actions={[
          // Une seule séance en cours : le démarrage n'est proposé que s'il n'y en a pas.
          ...(ongoing.data
            ? []
            : [
                {
                  icon: 'play',
                  label: 'Démarrer une séance',
                  onPress: () => router.push('/sessions/start'),
                },
              ]),
          {
            icon: 'history',
            label: 'Ajouter une séance passée',
            onPress: () => router.push('/sessions/new'),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const RADIUS = 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  header: { gap: 20, marginBottom: 4 },
  titleBlock: { gap: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, borderRadius: 16 },
  block: { gap: 12 },
  blockTitle: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  chips: { gap: 8, paddingRight: 20 },
  loader: { marginTop: 48 },
  sectionHeader: { marginTop: 16, marginBottom: 8, marginLeft: 4 },
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
