import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type ProgressMeterProps = {
  /** Pourcentage calculé par le backend ; peut dépasser 100 (budget dépassé). */
  percent: number;
  /** « budget » : orange à 80 %, rouge au-delà de 100 %. « goal » : toujours vert. */
  kind: 'budget' | 'goal';
  accessibilityLabel: string;
};

/** Barre de progression arrondie, colorée selon le niveau atteint. */
export function ProgressMeter({ percent, kind, accessibilityLabel }: ProgressMeterProps) {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(percent, 0), 100);
  let fill = colors.primary;
  if (kind === 'budget' && percent > 100) fill = colors.error;
  else if (kind === 'budget' && percent >= 80) fill = colors.tertiary;

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceVariant }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
