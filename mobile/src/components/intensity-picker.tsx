import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

type IntensityPickerProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Libellé de l'intensité choisie (ex. « Modérée »). */
  describe: (value: number) => string;
};

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

/** Échelle de 1 à 10 : dix pastilles, accessibles comme un réglage ajustable. */
export function IntensityPicker({ label, value, onChange, describe }: IntensityPickerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 1,
        max: 10,
        now: value,
        text: `${value} sur 10, ${describe(value)}`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(Math.min(10, value + 1));
        if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}>
      <View style={styles.header}>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="labelLarge" style={{ color: colors.primary }}>
          {`${value}/10 · ${describe(value)}`}
        </Text>
      </View>
      <View style={styles.row}>
        {LEVELS.map((level) => {
          const active = level <= value;
          return (
            <TouchableRipple
              key={level}
              onPress={() => onChange(level)}
              borderless
              importantForAccessibility="no"
              style={[
                styles.dot,
                {
                  backgroundColor: active
                    ? level >= 9
                      ? colors.error
                      : level >= 7
                        ? colors.tertiary
                        : colors.primary
                    : colors.surfaceVariant,
                },
              ]}>
              <Text
                variant="labelMedium"
                style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
                {level}
              </Text>
            </TouchableRipple>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
