import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

import { IconBadge } from './icon-badge';

type EmptyStateProps = {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
};

/** État vide ou d'erreur d'une liste : icône, explication et action facultative. */
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'secondary',
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.root} accessibilityRole="summary">
      <IconBadge icon={icon} tone={tone} size={64} />
      <Text variant="titleMedium" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text variant="bodyMedium" style={[styles.center, { color: colors.onSurfaceVariant }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained-tonal" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  center: { textAlign: 'center' },
  action: { marginTop: 8 },
});
