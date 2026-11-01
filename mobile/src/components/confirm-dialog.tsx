import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  loading?: boolean;
  /** Erreur renvoyée par le backend (ex. 409 : objet utilisé). */
  error?: string | null;
  /** Action proposée à la place (ex. « Archiver » quand la suppression est refusée). */
  alternative?: ReactNode;
  destructive?: boolean;
};

/** Confirmation d'une action définitive, avec affichage de l'erreur éventuelle du backend. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onDismiss,
  loading = false,
  error,
  alternative,
  destructive = true,
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text variant="bodyMedium">{message}</Text>
          {error ? (
            <Text variant="bodyMedium" style={{ color: colors.error }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Annuler</Button>
          {alternative ?? (
            <Button
              textColor={destructive ? colors.error : undefined}
              onPress={onConfirm}
              loading={loading}
              disabled={loading}>
              {confirmLabel}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
});
