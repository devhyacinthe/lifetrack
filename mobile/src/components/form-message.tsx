import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

type FormMessageProps = {
  message: string | null;
  type?: 'error' | 'success';
};

/** Message général d'un formulaire (erreur du serveur, confirmation). */
export function FormMessage({ message, type = 'error' }: FormMessageProps) {
  const { colors } = useTheme();
  if (!message) return null;
  const isError = type === 'error';
  const fg = isError ? colors.onErrorContainer : colors.onPrimaryContainer;

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: isError ? colors.errorContainer : colors.primaryContainer },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Icon
        source={isError ? 'alert-circle-outline' : 'check-circle-outline'}
        size={20}
        color={fg}
      />
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  text: { flex: 1 },
});
