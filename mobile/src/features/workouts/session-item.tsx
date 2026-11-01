import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { Workout } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';

import { formatDistance, formatDuration, localTimeOf } from './format';
import { activityIcon, intensityLabel } from './labels';

type SessionItemProps = {
  session: Workout;
  onPress: () => void;
};

/** Ligne d'une séance : activité, heure, intensité, distance et durée. */
export function SessionItem({ session, onPress }: SessionItemProps) {
  const { colors } = useTheme();
  const duration =
    session.duration_seconds === null ? 'En cours' : formatDuration(session.duration_seconds);
  const details = [
    localTimeOf(session.started_at),
    session.intensity === null
      ? null
      : `${intensityLabel(session.intensity)} (${session.intensity}/10)`,
    session.distance_km ? formatDistance(session.distance_km) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${session.activity_name}, ${duration}, ${details}`}
      accessibilityHint="Ouvre la séance pour la modifier">
      <View style={styles.row}>
        <IconBadge icon={activityIcon(session.activity_name)} tone="tertiary" size={44} />
        <View style={styles.text}>
          <Text variant="titleSmall" numberOfLines={1}>
            {session.activity_name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {details}
          </Text>
        </View>
        <Text variant="titleSmall" style={styles.duration}>
          {duration}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { flex: 1, gap: 2 },
  duration: { fontWeight: '700' },
});
