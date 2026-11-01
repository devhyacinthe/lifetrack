import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Chip, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import type { WorkoutGoalPeriod } from '@/api/types';
import { ChartCard } from '@/components/charts/chart-card';
import { useChartTheme } from '@/components/charts/chart-theme';
import { formatDistance, formatDuration } from '@/features/workouts/format';
import { useWorkoutHistory } from '@/features/workouts/queries';
import { formatPeriodRange } from '@/utils/dates';

import { compactNumber, type HistoryMetric, historyBars } from './chart-data';

const SPACING = 10;

/** Séances terminées des 8 dernières semaines ou des 6 derniers mois. */
export function WorkoutHistoryCard() {
  const { colors } = useTheme();
  const chart = useChartTheme();
  const [period, setPeriod] = useState<WorkoutGoalPeriod>('weekly');
  const [metric, setMetric] = useState<HistoryMetric>('duration');
  const [selected, setSelected] = useState<number | null>(null);
  const history = useWorkoutHistory(period);

  const periods = history.data?.periods ?? [];
  const bars = history.data ? historyBars(history.data, metric) : [];
  const index = selected !== null && selected < periods.length ? selected : periods.length - 1;
  const current = periods[index];
  const barWidth = Math.max(
    Math.floor((chart.plotWidth - SPACING * bars.length) / Math.max(bars.length, 1)),
    8,
  );
  const color = chart.series[1];

  return (
    <ChartCard
      icon="run-fast"
      tone="tertiary"
      title="Activité sportive"
      subtitle={
        period === 'weekly'
          ? '8 dernières semaines · séances terminées'
          : '6 derniers mois · séances terminées'
      }
      controls={
        <View style={styles.controls}>
          <SegmentedButtons
            value={period}
            onValueChange={(value) => {
              setPeriod(value as WorkoutGoalPeriod);
              setSelected(null);
            }}
            buttons={[
              { value: 'weekly', label: 'Semaines' },
              { value: 'monthly', label: 'Mois' },
            ]}
          />
          <View style={styles.chips}>
            <Chip
              selected={metric === 'duration'}
              showSelectedOverlay
              onPress={() => setMetric('duration')}>
              Durée (min)
            </Chip>
            <Chip
              selected={metric === 'sessions'}
              showSelectedOverlay
              onPress={() => setMetric('sessions')}>
              Séances
            </Chip>
          </View>
        </View>
      }
      query={history}
      emptyMessage={
        history.isSuccess && periods.every((p) => p.sessions_count === 0)
          ? 'Aucune séance terminée sur cette période.'
          : null
      }>
      <View
        accessible
        accessibilityLabel={`Graphique : ${metric === 'duration' ? 'minutes' : 'séances'} par ${
          period === 'weekly' ? 'semaine' : 'mois'
        }. ${bars.map((b) => `${b.label} : ${b.value}`).join(' ; ')}.`}>
        <BarChart
          data={bars.map((bar, i) => ({
            value: bar.value,
            label: bar.label,
            frontColor: color,
            // La période sélectionnée garde sa couleur pleine ; les autres sont atténuées.
            opacity: i === index ? 1 : 0.55,
            onPress: () => setSelected(i),
          }))}
          width={chart.plotWidth}
          height={160}
          barWidth={barWidth}
          spacing={SPACING}
          initialSpacing={6}
          endSpacing={0}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          formatYLabel={(label) => compactNumber(Number(label))}
          disableScroll
          {...chart.axis}
        />
      </View>
      {current ? (
        <View style={[styles.detail, { backgroundColor: colors.surfaceVariant }]}>
          <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
            {formatPeriodRange(current.period_start, current.period_end)}
          </Text>
          <View style={styles.metrics}>
            <Metric
              label={current.sessions_count > 1 ? 'séances' : 'séance'}
              value={String(current.sessions_count)}
            />
            <Metric label="au total" value={formatDuration(current.total_duration_seconds)} />
            <Metric label="parcourus" value={formatDistance(current.total_distance_km)} />
          </View>
        </View>
      ) : null}
    </ChartCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Text variant="titleMedium" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 10 },
  chips: { flexDirection: 'row', gap: 8 },
  detail: { borderRadius: 16, padding: 14, gap: 8 },
  metrics: { flexDirection: 'row' },
  metric: { flex: 1, gap: 2 },
});
