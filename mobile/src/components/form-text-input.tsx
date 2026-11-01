import { useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, type TextInputProps, useTheme } from 'react-native-paper';

type FormTextInputProps<T extends FieldValues, TTransformed = T> = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error' | 'left' | 'right'
> & {
  /** Les valeurs validées peuvent être transformées par le schéma (TTransformed). */
  control: Control<T, unknown, TTransformed>;
  name: Path<T>;
  label: string;
  /** Icône affichée à gauche du champ. */
  icon?: string;
  /** Unité affichée à droite du champ (ex. « km »). */
  affix?: string;
};

/**
 * Champ texte relié à React Hook Form, avec son message d'erreur accessible.
 * Un champ mot de passe reçoit un bouton pour afficher ou masquer la saisie.
 */
export function FormTextInput<T extends FieldValues, TTransformed = T>({
  control,
  name,
  label,
  icon,
  affix,
  secureTextEntry,
  ...inputProps
}: FormTextInputProps<T, TTransformed>) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View>
          <TextInput
            mode="outlined"
            label={label}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={Boolean(error)}
            accessibilityLabel={label}
            outlineStyle={styles.outline}
            outlineColor={colors.outline}
            style={{ backgroundColor: colors.surface }}
            secureTextEntry={secureTextEntry && hidden}
            left={icon ? <TextInput.Icon icon={icon} color={colors.onSurfaceVariant} /> : undefined}
            right={
              secureTextEntry ? (
                <TextInput.Icon
                  icon={hidden ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setHidden((h) => !h)}
                  accessibilityLabel={
                    hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'
                  }
                  color={colors.onSurfaceVariant}
                />
              ) : affix ? (
                <TextInput.Affix text={affix} />
              ) : undefined
            }
            {...inputProps}
          />
          {error?.message ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {error.message}
            </HelperText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  outline: { borderRadius: 16 },
});
