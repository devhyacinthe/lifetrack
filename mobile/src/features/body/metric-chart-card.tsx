import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Text, useTheme } from 'react-native-paper';

import type { MetricType } from '@/api/types';
import { ChartCard } from '@/components/charts/chart-card';
import { useChartTheme } from '@/components/charts/chart-theme';
import { lineAxis, linePoints } from '@/features/stats/chart-data';
import { formatPeriodRange } from '@/utils/dates';

import { formatChange, formatMeasure, metricIcon } from './format';
import { SERIES_MONTHS, useMetricSeries } from './queries';

const AXIS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

type MetricChartCardProps = {
  metricType: MetricType;
  /** Contenu ajouté sous le graphique (ex. choix du type sur l'onglet Statistiques). */
  controls?: React.ReactNode;
};

/**
 * Courbe d'une mesure sur 6 mois. Seules les valeurs saisies sont tracées : les points
 * sont équidistants (un par mesure), l'axe horizontal n'est donc pas proportionnel au temps.
 */
export function MetricChartCard({ metricType, controls }: MetricChartCardProps) {
  const { colors } = useTheme();
  const chart = useChartTheme();
  const series = useMetricSeries(metricType.id);
  const points = series.data ? linePoints(series.data) : [];
  const axis = lineAxis(points.map((p) => p.value));
  const color = chart.series[0];
  const unit = metricType.unit;
  const spacing = points.length > 1 ? Math.max((chart.plotWidth - 24) / (points.length - 1), 4) : 0;

  return (
    <ChartCard
      icon={metricIcon(metricType.name, unit)}
      title={metricType.name}
      subtitle={
        series.data
          ? `${formatPeriodRange(series.data.start_date, series.data.end_date)} · ${unit}`
          : `${SERIES_MONTHS} derniers mois`
      }
      controls={controls}
      query={series}
      emptyMessage={
        series.isSuccess && points.length === 0
          ? `Aucune mesure sur les ${SERIES_MONTHS} derniers mois.`
          : null
      }>
      {series.data && series.data.last !== null ? (
        <>
          {points.length > 1 ? (
            <View
              accessible
              accessibilityLabel={`Courbe ${metricType.name} : ${series.data.points
                .map((p) => `${p.date} ${formatMeasure(p.value, unit)}`)
                .join(' ; ')}`}>
              <LineChart
                // Valeurs réelles : la bibliothèque retire elle-même le décalage de l'axe.
                data={points}
                yAxisOffset={axis.offset}
                maxValue={axis.range}
                showFractionalValues
                roundToDigits={1}
                width={chart.plotWidth}
                height={160}
                spacing={spacing}
                initialSpacing={12}
                endSpacing={12}
                color={color}
                thickness={2}
                dataPointsColor={color}
                dataPointsRadius={4}
                hideDataPoints={points.length > 30}
                areaChart
                startFillColor={color}
                endFillColor={color}
                startOpacity={0.18}
                endOpacity={0.02}
                formatYLabel={(label) => AXIS_FORMAT.format(Number(label))}
                disableScroll
                {...chart.axis}
              />
            </View>
          ) : (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Une seule mesure sur la période : ajoutez-en d’autres pour voir l’évolution.
            </Text>
          )}
          <View style={[styles.summary, { backgroundColor: colors.surfaceVariant }]}>
            <Stat label="Dernière" value={formatMeasure(series.data.last, unit)} />
            <Stat
              label="Évolution"
              value={series.data.change !== null ? formatChange(series.data.change, unit) : '—'}
            />
            <Stat
              label="Min. – max."
              value={`${formatMeasure(series.data.minimum ?? '0', '')}– ${formatMeasure(
                series.data.maximum ?? '0',
                unit,
              )}`}
            />
          </View>
        </>
      ) : null}
    </ChartCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="titleSmall" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', borderRadius: 16, padding: 14, gap: 8 },
  stat: { flex: 1, gap: 2 },
});
