import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';

import type { TransactionType } from '@/api/types';
import { ChartCard } from '@/components/charts/chart-card';
import { useChartTheme } from '@/components/charts/chart-theme';
import { Legend } from '@/components/charts/legend';
import { formatAmount } from '@/features/finance/format';
import { useCategoryStats } from '@/features/finance/queries';
import { formatPeriodRange } from '@/utils/dates';

import { categorySlices } from './chart-data';

const RADIUS = 80;

/** Répartition du mois en cours par catégorie (anneau), avec les montants en clair. */
export function CategoryCard() {
  const { colors } = useTheme();
  const chart = useChartTheme();
  const [type, setType] = useState<TransactionType>('expense');
  const stats = useCategoryStats(type);

  const slices = stats.data ? categorySlices(stats.data.categories, stats.data.total) : [];
  const colorOf = (index: number | null) => (index === null ? chart.neutral : chart.series[index]);
  const currency = stats.data?.currency ?? 'XOF';

  return (
    <ChartCard
      icon="chart-donut"
      tone="tertiary"
      title="Par catégorie"
      subtitle={
        stats.data
          ? `${formatPeriodRange(stats.data.period_start, stats.data.period_end)} · ${currency}`
          : 'Mois en cours'
      }
      controls={
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: 'Dépenses' },
            { value: 'income', label: 'Revenus' },
          ]}
        />
      }
      query={stats}
      emptyMessage={
        stats.isSuccess && slices.length === 0
          ? type === 'expense'
            ? 'Aucune dépense ce mois-ci.'
            : 'Aucun revenu ce mois-ci.'
          : null
      }>
      {stats.data ? (
        <>
          <View
            style={styles.chart}
            accessible={false}
            importantForAccessibility="no-hide-descendants">
            <PieChart
              data={slices.map((s) => ({ value: s.value, color: colorOf(s.colorIndex) }))}
              donut
              radius={RADIUS}
              innerRadius={RADIUS - 22}
              innerCircleColor={colors.surface}
              strokeWidth={2}
              strokeColor={colors.surface}
              centerLabelComponent={() => (
                <View style={styles.center}>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                    Total
                  </Text>
                  <Text variant="titleSmall" numberOfLines={1} adjustsFontSizeToFit>
                    {formatAmount(stats.data.total, currency)}
                  </Text>
                </View>
              )}
            />
          </View>
          <Legend
            layout="list"
            items={slices.map((s) => ({
              key: s.key,
              label: s.label,
              color: colorOf(s.colorIndex),
              value: formatAmount(s.total, currency),
              detail: `${s.percent.replace('.', ',')} %`,
            }))}
          />
        </>
      ) : null}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chart: { alignItems: 'center' },
  center: { alignItems: 'center', maxWidth: (RADIUS - 26) * 2 },
});
