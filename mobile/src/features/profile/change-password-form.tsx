import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type ChangePasswordValues, changePasswordSchema } from '@/schemas/auth';

import { useChangePassword } from './queries';

const EMPTY = { current_password: '', new_password: '', new_password_confirm: '' };

export function ChangePasswordForm({ email }: { email: string }) {
  const changePassword = useChangePassword(email);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setMessage(null);
    try {
      await changePassword.mutateAsync({ current_password, new_password });
      reset(EMPTY);
      setMessage({
        text: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.',
        type: 'success',
      });
    } catch (error) {
      const text = applyApiErrors(error, setError, ['current_password', 'new_password']);
      if (text) setMessage({ text, type: 'error' });
    }
  });

  return (
    <View style={styles.form}>
      <FormTextInput
        control={control}
        name="current_password"
        label="Mot de passe actuel"
        icon="lock-outline"
        secureTextEntry
        autoComplete="current-password"
      />
      <FormTextInput
        control={control}
        name="new_password"
        label="Nouveau mot de passe"
        icon="lock-plus-outline"
        secureTextEntry
        autoComplete="new-password"
      />
      <FormTextInput
        control={control}
        name="new_password_confirm"
        label="Confirmer le nouveau mot de passe"
        icon="lock-check-outline"
        secureTextEntry
        autoComplete="new-password"
      />
      <FormMessage message={message?.text ?? null} type={message?.type} />
      <Button
        mode="outlined"
        onPress={() => onSubmit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}>
        Changer le mot de passe
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
