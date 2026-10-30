import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import { useAuth } from '@/auth/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type LoginValues, loginSchema } from '@/schemas/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setMessage(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthShell
      title="Connexion"
      subtitle="Heureux de vous revoir !"
      footer={
        <Link href="/register" replace asChild>
          <Button mode="text">Pas encore de compte ? S’inscrire</Button>
        </Link>
      }>
      <FormTextInput
        control={control}
        name="email"
        label="Adresse e-mail"
        icon="email-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormTextInput
        control={control}
        name="password"
        label="Mot de passe"
        icon="lock-outline"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
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
        Se connecter
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
