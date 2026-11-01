import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

type TimeFieldProps = {
  label: string;
  /** Heure locale HH:MM. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const toValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Choix d'une heure avec le sélecteur natif du téléphone (format 24 h). */
export function TimeField({ label, value, onChange, error }: TimeFieldProps) {
  const { colors } = useTheme();

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: toDate(value),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toValue(date));
      },
    });

  return (
    <View style={styles.root}>
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="compact"
          locale="fr-FR"
          onChange={(_event, date) => date && onChange(toValue(date))}
          style={styles.iosPicker}
        />
      ) : (
        <TouchableRipple
          onPress={openAndroidPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${value}. Modifier l’heure`}
          style={[
            styles.field,
            { borderColor: error ? colors.error : colors.outline, backgroundColor: colors.surface },
          ]}>
          <View style={styles.fieldContent}>
            <Icon source="clock-outline" size={22} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={styles.fieldText}>
              {value}
            </Text>
            <Icon source="chevron-down" size={22} color={colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      )}
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
  field: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  fieldContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  fieldText: { flex: 1 },
  iosPicker: { alignSelf: 'flex-start' },
});
