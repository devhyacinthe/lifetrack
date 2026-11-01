import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { WorkoutGoalPeriod } from '@/api/types';
import { formatPeriodRange } from '@/utils/dates';

import { formatDistance, formatDuration } from './format';
import { useWorkoutStats } from './queries';

function Metric({ label, value, onHero }: { label: string; value: string; onHero: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="titleLarge" style={{ color: onHero }} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="labelMedium" style={[styles.dim, { color: onHero }]}>
        {label}
      </Text>
    </View>
  );
}

/** Résumé de la semaine ou du mois, calculé par le backend dans le fuseau de l'utilisateur. */
export function StatsSummary() {
  const { colors, dark } = useTheme();
  const [period, setPeriod] = useState<WorkoutGoalPeriod>('weekly');
  const stats = useWorkoutStats(period);
  const heroColor = dark ? colors.tertiaryContainer : colors.tertiary;
  const onHero = dark ? colors.onTertiaryContainer : colors.onTertiary;

  return (
    <View style={styles.root}>
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as WorkoutGoalPeriod)}
        buttons={[
          { value: 'weekly', label: 'Cette semaine' },
          { value: 'monthly', label: 'Ce mois-ci' },
        ]}
      />
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        {stats.isPending ? (
          <ActivityIndicator color={onHero} accessibilityLabel="Chargement des statistiques" />
        ) : stats.isError ? (
          <View style={styles.error}>
            <Text style={{ color: onHero }}>{errorMessage(stats.error)}</Text>
            <Button mode="contained-tonal" onPress={() => stats.refetch()}>
              Réessayer
            </Button>
          </View>
        ) : (
          <>
            <Text variant="labelLarge" style={[styles.dim, { color: onHero }]}>
              {formatPeriodRange(stats.data.period_start, stats.data.period_end)}
            </Text>
            {stats.data.sessions_count === 0 ? (
              <Text variant="titleMedium" style={{ color: onHero }}>
                {period === 'weekly'
                  ? 'Aucune séance cette semaine pour l’instant.'
                  : 'Aucune séance ce mois-ci pour l’instant.'}
              </Text>
            ) : (
              <View style={styles.grid}>
                <Metric
                  label={stats.data.sessions_count > 1 ? 'séances' : 'séance'}
                  value={String(stats.data.sessions_count)}
                  onHero={onHero}
                />
                <Metric
                  label="au total"
                  value={formatDuration(stats.data.total_duration_seconds)}
                  onHero={onHero}
                />
                <Metric
                  label="en moyenne"
                  value={formatDuration(stats.data.average_duration_seconds)}
                  onHero={onHero}
                />
                <Metric
                  label="parcourus"
                  value={formatDistance(stats.data.total_distance_km)}
                  onHero={onHero}
                />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  hero: { borderRadius: 28, padding: 20, gap: 12, minHeight: 120, justifyContent: 'center' },
  dim: { opacity: 0.85 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  metric: { width: '50%', gap: 2 },
  error: { gap: 12, alignItems: 'flex-start' },
});
