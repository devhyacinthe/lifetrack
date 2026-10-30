import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import type { User } from '@/api/types';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type ProfileValues, profileSchema } from '@/schemas/auth';

import { useUpdateMe } from './queries';

const FIELDS = ['first_name', 'last_name', 'preferred_currency', 'timezone'] as const;

export function ProfileForm({ user }: { user: User }) {
  const updateMe = useUpdateMe();
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_currency: user.preferred_currency,
      timezone: user.timezone,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      // Le formulaire se resynchronise avec le profil renvoyé par le serveur (option values).
      await updateMe.mutateAsync(values);
      setMessage({ text: 'Profil enregistré.', type: 'success' });
    } catch (error) {
      const text = applyApiErrors(error, setError, FIELDS);
      if (text) setMessage({ text, type: 'error' });
    }
  });

  return (
    <View style={styles.form}>
      <FormTextInput control={control} name="first_name" label="Prénom" icon="account-outline" />
      <FormTextInput control={control} name="last_name" label="Nom" icon="account-outline" />
      <FormTextInput
        control={control}
        name="preferred_currency"
        label="Devise préférée (ex. XOF)"
        icon="cash-multiple"
        autoCapitalize="characters"
        maxLength={3}
      />
      <FormTextInput
        control={control}
        name="timezone"
        label="Fuseau horaire (ex. Africa/Lome)"
        icon="earth"
        autoCapitalize="none"
      />
      <FormMessage message={message?.text ?? null} type={message?.type} />
      <Button
        mode="contained"
        onPress={() => onSubmit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting || !formState.isDirty}>
        Enregistrer
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
