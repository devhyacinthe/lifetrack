import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { WorkoutStats } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { formatDistance, formatDuration } from '@/features/workouts/format';

/** Séances terminées du mois : nombre, durée totale et distance. */
export function SportSummary({ stats }: { stats: WorkoutStats }) {
  const { colors } = useTheme();
  const sessions = `${stats.sessions_count} séance${stats.sessions_count > 1 ? 's' : ''}`;

  return (
    <TouchableRipple
      onPress={() => router.push('/sport')}
      borderless
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
      accessibilityRole="button"
      accessibilityLabel={`Sport ce mois-ci : ${sessions}, ${formatDuration(
        stats.total_duration_seconds,
      )}. Ouvre l’onglet Sport`}>
      <View style={styles.content}>
        <IconBadge icon="run-fast" tone="tertiary" size={44} />
        {stats.sessions_count === 0 ? (
          <Text variant="bodyMedium" style={[styles.flex, { color: colors.onSurfaceVariant }]}>
            Aucune séance terminée ce mois-ci.
          </Text>
        ) : (
          <View style={styles.figures}>
            <Figure
              value={String(stats.sessions_count)}
              label={stats.sessions_count > 1 ? 'séances' : 'séance'}
            />
            <Figure value={formatDuration(stats.total_duration_seconds)} label="au total" />
            <Figure value={formatDistance(stats.total_distance_km)} label="parcourus" />
          </View>
        )}
        <Icon source="chevron-right" size={20} color={colors.onSurfaceVariant} />
      </View>
    </TouchableRipple>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.flex}>
      <Text variant="titleMedium" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth },
  content: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  figures: { flex: 1, flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
