import { StyleSheet, View } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';

export type ChoiceOption = { value: string; label: string; icon?: string };

type ChoiceChipsProps = {
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Permet de désélectionner le choix courant (champ facultatif). */
  allowEmpty?: boolean;
  error?: string;
};

/** Choix unique parmi des pastilles, accessible comme un groupe de boutons radio. */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  allowEmpty = false,
  error,
}: ChoiceChipsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={option.value}
              icon={option.icon}
              selected={selected}
              showSelectedOverlay
              onPress={() => onChange(selected && allowEmpty ? '' : option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={selected ? { backgroundColor: colors.primaryContainer } : undefined}>
              {option.label}
            </Chip>
          );
        })}
      </View>
      {error ? (
        <Text variant="bodySmall" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
