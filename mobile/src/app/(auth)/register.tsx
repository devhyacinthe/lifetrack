import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { useAuth } from '@/auth/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type RegisterValues, registerSchema } from '@/schemas/auth';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirm: '',
    },
  });

  const onSubmit = handleSubmit(async ({ password_confirm: _confirm, ...payload }) => {
    setMessage(null);
    try {
      await signUp(payload);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['first_name', 'last_name', 'email', 'password']));
    }
  });

  return (
    <AuthShell
      title="Inscription"
      subtitle="Créez votre compte en quelques secondes."
      footer={
        <Link href="/login" replace asChild>
          <Button mode="text">Déjà un compte ? Se connecter</Button>
        </Link>
      }>
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormTextInput
            control={control}
            name="first_name"
            label="Prénom"
            autoComplete="given-name"
          />
        </View>
        <View style={styles.cell}>
          <FormTextInput
            control={control}
            name="last_name"
            label="Nom"
            autoComplete="family-name"
          />
        </View>
      </View>
      <FormTextInput
        control={control}
        name="email"
        label="Adresse e-mail"
        icon="email-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormTextInput
        control={control}
        name="password"
        label="Mot de passe (8 caractères min.)"
        icon="lock-outline"
        secureTextEntry
        autoComplete="new-password"
      />
      <FormTextInput
        control={control}
        name="password_confirm"
        label="Confirmer le mot de passe"
        icon="lock-check-outline"
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={() => onSubmit()}
      />
      <FormMessage message={message} />
      <Button
        mode="contained"
        onPress={() => onSubmit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        Créer mon compte
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
