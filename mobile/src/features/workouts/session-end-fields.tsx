import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, useTheme } from 'react-native-paper';

import { FormTextInput } from '@/components/form-text-input';
import { IntensityPicker } from '@/components/intensity-picker';

import { intensityLabel } from './labels';

/** Champs communs du formulaire : durée, intensité, distance, calories, notes. */
type EndFieldValues = {
  hours: string;
  minutes: string;
  intensity: number;
  distance: string;
  calories: string;
  notes: string;
};

type SessionEndFieldsProps<T extends FieldValues & EndFieldValues, TTransformed> = {
  control: Control<T, unknown, TTransformed>;
  /** Afficher la distance (activité qui la mesure, ou distance déjà renseignée). */
  showDistance: boolean;
  /** Mettre le curseur dans les minutes à l'ouverture. */
  focusDuration?: boolean;
};

const name = <T extends FieldValues>(field: keyof EndFieldValues) => field as Path<T>;

/**
 * Ce qui se mesure à la fin d'une séance, partagé par le formulaire de fin et celui d'une
 * séance passée.
 */
export function SessionEndFields<T extends FieldValues & EndFieldValues, TTransformed>({
  control,
  showDistance,
  focusDuration = false,
}: SessionEndFieldsProps<T, TTransformed>) {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormTextInput
            control={control}
            name={name<T>('hours')}
            label="Heures"
            icon="timer-outline"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.cell}>
          <FormTextInput
            control={control}
            name={name<T>('minutes')}
            label="Minutes"
            keyboardType="number-pad"
            maxLength={2}
            autoFocus={focusDuration}
          />
        </View>
      </View>

      <Controller
        control={control}
        name={name<T>('intensity')}
        render={({ field }) => (
          <IntensityPicker
            label="Intensité ressentie"
            value={field.value}
            onChange={field.onChange}
            describe={intensityLabel}
          />
        )}
      />

      {showDistance ? (
        <FormTextInput
          control={control}
          name={name<T>('distance')}
          label="Distance (facultatif)"
          icon="map-marker-distance"
          keyboardType="decimal-pad"
          affix="km"
        />
      ) : null}

      <View>
        <FormTextInput
          control={control}
          name={name<T>('calories')}
          label="Calories estimées (facultatif)"
          icon="fire"
          keyboardType="number-pad"
          maxLength={5}
          affix="kcal"
        />
        <HelperText type="info" visible>
          Une estimation que vous saisissez (montre, application…) : ce n’est jamais une mesure
          exacte.
        </HelperText>
      </View>

      <Controller
        control={control}
        name={name<T>('notes')}
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Notes (facultatif)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              maxLength={1000}
              error={Boolean(fieldState.error)}
              accessibilityLabel="Notes"
              outlineStyle={styles.outline}
              style={{ backgroundColor: colors.surface }}
            />
            {fieldState.error ? (
              <HelperText type="error" visible>
                {fieldState.error.message}
              </HelperText>
            ) : null}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  outline: { borderRadius: 16 },
});
