import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';
import { Chip, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { dayLabel, fromIsoDate, toIsoDate } from '@/utils/dates';

type DateFieldProps = {
  label: string;
  /** Date locale YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Raccourcis « Aujourd'hui » et « Hier » (inutiles pour une échéance future). */
  showShortcuts?: boolean;
};

/** Choix d'une date (sans heure) : raccourcis et sélecteur natif du téléphone. */
export function DateField({ label, value, onChange, error, showShortcuts = true }: DateFieldProps) {
  const { colors } = useTheme();
  const today = new Date();
  const todayIso = toIsoDate(today);
  const yesterdayIso = toIsoDate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
  );

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: fromIsoDate(value),
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toIsoDate(date));
      },
    });

  return (
    <View style={styles.root}>
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
      {showShortcuts ? (
        <View style={styles.row}>
          <Chip
            selected={value === todayIso}
            showSelectedCheck={false}
            onPress={() => onChange(todayIso)}>
            Aujourd’hui
          </Chip>
          <Chip
            selected={value === yesterdayIso}
            showSelectedCheck={false}
            onPress={() => onChange(yesterdayIso)}>
            Hier
          </Chip>
        </View>
      ) : null}
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={fromIsoDate(value)}
          mode="date"
          display="compact"
          locale="fr-FR"
          onChange={(_event, date) => date && onChange(toIsoDate(date))}
          style={styles.iosPicker}
        />
      ) : (
        <TouchableRipple
          onPress={openAndroidPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${dayLabel(value)}. Modifier la date`}
          style={[
            styles.field,
            { borderColor: error ? colors.error : colors.outline, backgroundColor: colors.surface },
          ]}>
          <View style={styles.fieldContent}>
            <Icon source="calendar-month-outline" size={22} color={colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={styles.fieldText}>
              {dayLabel(value)}
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
  row: { flexDirection: 'row', gap: 8 },
  field: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  fieldContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  fieldText: { flex: 1 },
  iosPicker: { alignSelf: 'flex-start' },
});
