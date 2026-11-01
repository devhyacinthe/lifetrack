import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, type barDataItem } from 'react-native-gifted-charts';
import { Text, useTheme } from 'react-native-paper';

import { ChartCard } from '@/components/charts/chart-card';
import { useChartTheme } from '@/components/charts/chart-theme';
import { Legend } from '@/components/charts/legend';
import { formatAmount } from '@/features/finance/format';
import { STATS_MONTHS, useMonthlyStats } from '@/features/finance/queries';
import { formatPeriodRange } from '@/utils/dates';

import { compactNumber, hasMoneyMovements, monthBars } from './chart-data';

const GROUP_SPACING = 14;
const BAR_GAP = 2;

/**
 * Revenus et dépenses des 6 derniers mois (barres groupées). Toucher un mois affiche ses
 * montants exacts ; le mois en cours est sélectionné par défaut.
 */
export function FinanceTrendCard() {
  const { colors } = useTheme();
  const chart = useChartTheme();
  const stats = useMonthlyStats();
  const [selected, setSelected] = useState<number | null>(null);

  const months = stats.data?.months ?? [];
  const bars = monthBars(months);
  const index = selected ?? months.length - 1;
  const month = months[index];
  const currency = stats.data?.currency ?? 'XOF';
  const [incomeColor, expenseColor] = chart.series;

  const groupWidth = chart.plotWidth / Math.max(bars.length, 1);
  const barWidth = Math.max(Math.floor((groupWidth - GROUP_SPACING - BAR_GAP) / 2), 6);

  const data: barDataItem[] = bars.flatMap((bar, i) => [
    {
      value: bar.income,
      frontColor: incomeColor,
      spacing: BAR_GAP,
      label: bar.label,
      labelWidth: barWidth * 2 + BAR_GAP,
      labelTextStyle: {
        ...chart.axis.xAxisLabelTextStyle,
        color: i === index ? colors.onSurface : colors.onSurfaceVariant,
        fontWeight: i === index ? '700' : '400',
      },
      onPress: () => setSelected(i),
    },
    { value: bar.expense, frontColor: expenseColor, onPress: () => setSelected(i) },
  ]);

  return (
    <ChartCard
      icon="chart-bar"
      title="Revenus et dépenses"
      subtitle={`${STATS_MONTHS} derniers mois · ${currency} · transferts exclus`}
      query={stats}
      emptyMessage={
        stats.isSuccess && !hasMoneyMovements(months)
          ? 'Aucune transaction sur les 6 derniers mois.'
          : null
      }>
      <View accessible accessibilityLabel={accessibilitySummary(bars, currency)}>
        <BarChart
          data={data}
          width={chart.plotWidth}
          height={180}
          barWidth={barWidth}
          spacing={GROUP_SPACING}
          initialSpacing={6}
          endSpacing={0}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          formatYLabel={(label) => compactNumber(Number(label))}
          disableScroll
          {...chart.axis}
        />
      </View>
      {month ? (
        <View style={[styles.detail, { backgroundColor: colors.surfaceVariant }]}>
          <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
            {formatPeriodRange(month.period_start, month.period_end)}
          </Text>
          <Legend
            layout="list"
            items={[
              {
                key: 'income',
                label: 'Revenus',
                color: incomeColor,
                value: formatAmount(month.income, currency),
              },
              {
                key: 'expense',
                label: 'Dépenses',
                color: expenseColor,
                value: formatAmount(month.expense, currency),
              },
            ]}
          />
          <View style={styles.net}>
            <Text variant="bodyMedium" style={styles.flex}>
              Solde du mois
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: Number(month.net) < 0 ? colors.error : colors.onSurface }}>
              {formatAmount(month.net, currency)}
            </Text>
          </View>
        </View>
      ) : null}
    </ChartCard>
  );
}

function accessibilitySummary(bars: ReturnType<typeof monthBars>, currency: string): string {
  const parts = bars.map(
    (b) => `${b.label} : revenus ${compactNumber(b.income)}, dépenses ${compactNumber(b.expense)}`,
  );
  return `Graphique des revenus et dépenses en ${currency}. ${parts.join(' ; ')}.`;
}

const styles = StyleSheet.create({
  detail: { borderRadius: 16, padding: 14, gap: 10 },
  net: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
