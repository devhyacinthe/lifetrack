import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/auth-context';

import { useDeleteAccount } from './queries';

/** Suppression définitive du compte, confirmée par le mot de passe. */
export function DeleteAccount() {
  const { endSession } = useAuth();
  const { colors } = useTheme();
  const deleteAccount = useDeleteAccount();
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setVisible(false);
    setPassword('');
    setError(null);
  };

  const confirm = async () => {
    setError(null);
    try {
      await deleteAccount.mutateAsync(password);
      endSession();
    } catch (e) {
      const fieldError = e instanceof ApiError ? e.fieldErrors.password?.join(' ') : undefined;
      setError(fieldError ?? errorMessage(e));
    }
  };

  return (
    <>
      <Button
        mode="text"
        textColor={colors.error}
        icon="delete-outline"
        onPress={() => setVisible(true)}>
        Supprimer mon compte
      </Button>
      <Portal>
        <Dialog visible={visible} onDismiss={close}>
          <Dialog.Title>Supprimer le compte ?</Dialog.Title>
          <Dialog.Content style={styles.content}>
            <Text variant="bodyMedium">
              Toutes vos données (comptes, transactions, séances…) seront supprimées définitivement.
              Saisissez votre mot de passe pour confirmer.
            </Text>
            <TextInput
              mode="outlined"
              label="Mot de passe"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={Boolean(error)}
              accessibilityLabel="Mot de passe"
            />
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={close}>Annuler</Button>
            <Button
              onPress={confirm}
              textColor={colors.error}
              loading={deleteAccount.isPending}
              disabled={!password || deleteAccount.isPending}>
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
