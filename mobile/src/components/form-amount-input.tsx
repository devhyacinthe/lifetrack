import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, useTheme } from 'react-native-paper';

type FormAmountInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Code devise affiché à droite du montant. */
  currency?: string;
  autoFocus?: boolean;
  /** Grand affichage (montant principal d'un formulaire). */
  large?: boolean;
  /** Autorise le signe moins (le clavier décimal n'en propose pas sur iOS). */
  allowNegative?: boolean;
};

/**
 * Saisie d'un montant reliée à React Hook Form. La valeur reste du texte (« 12 500 »,
 * « 12,50 ») : le schéma Zod la convertit en chaîne décimale exacte pour l'API.
 */
export function FormAmountInput<T extends FieldValues>({
  control,
  name,
  label,
  currency,
  autoFocus,
  large = false,
  allowNegative = false,
}: FormAmountInputProps<T>) {
  const { colors } = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View>
          <TextInput
            mode="outlined"
            label={label}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
            error={Boolean(fieldState.error)}
            accessibilityLabel={label}
            outlineStyle={styles.outline}
            style={[large && styles.large, { backgroundColor: colors.surface }]}
            contentStyle={large ? styles.largeContent : undefined}
            right={currency ? <TextInput.Affix text={currency} /> : undefined}
            autoFocus={autoFocus}
          />
          {fieldState.error ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {fieldState.error.message}
            </HelperText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  outline: { borderRadius: 16 },
  large: { fontSize: 28 },
  largeContent: { fontWeight: '700' },
});
