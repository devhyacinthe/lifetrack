import { StyleSheet, View } from 'react-native';
import { IconButton, Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { MetricType } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { dayLabel } from '@/utils/dates';

import { formatMeasure, metricIcon } from './format';

type MetricTypeRowProps = {
  metricType: MetricType;
  onPress: () => void;
  onOptions: () => void;
};

/** Ligne d'un type : dernière valeur et sa date, ou « Aucune mesure ». */
export function MetricTypeRow({ metricType, onPress, onOptions }: MetricTypeRowProps) {
  const { colors } = useTheme();
  const latest =
    metricType.latest_value !== null && metricType.latest_date
      ? `${formatMeasure(metricType.latest_value, metricType.unit)} · ${dayLabel(metricType.latest_date)}`
      : 'Aucune mesure';

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${metricType.name}${metricType.is_active ? '' : ', désactivée'} : ${latest}`}
      accessibilityHint="Ouvre l’historique et la courbe">
      <View style={[styles.row, !metricType.is_active && styles.inactive]}>
        <IconBadge icon={metricIcon(metricType.name, metricType.unit)} size={40} />
        <View style={styles.text}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {metricType.name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {latest}
          </Text>
        </View>
        <IconButton
          icon="dots-horizontal"
          onPress={onOptions}
          accessibilityLabel={`Options de ${metricType.name}`}
        />
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 16, paddingVertical: 6 },
  text: { flex: 1, gap: 2 },
  inactive: { opacity: 0.6 },
});
