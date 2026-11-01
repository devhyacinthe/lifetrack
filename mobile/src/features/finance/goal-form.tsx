import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, Switch, Text } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Account, SavingsGoal, SavingsGoalPayload } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormAmountInput } from '@/components/form-amount-input';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type GoalFormValues, type GoalValues, goalSchema } from '@/schemas/finance';
import { toIsoDate } from '@/utils/dates';

import { amountToInput, formatAmount } from './format';
import { ACCOUNT_TYPE_ICONS } from './labels';
import { useAccounts, useGoals } from './queries';

const FIELDS = ['name', 'account', 'target_amount', 'deadline'] as const;

/** Valeurs du formulaire → données de l'API (échéance vide = aucune). */
export function toGoalPayload(values: GoalValues): SavingsGoalPayload {
  return { ...values, deadline: values.deadline || null };
}

type GoalFormProps = {
  initial?: SavingsGoal;
  submitLabel: string;
  onSubmit: (payload: SavingsGoalPayload) => Promise<void>;
};

/** Charge les comptes et les objectifs existants, puis affiche le formulaire. */
export function GoalForm(props: GoalFormProps) {
  const accounts = useAccounts();
  const goals = useGoals();

  if (accounts.isPending || goals.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (accounts.isError || goals.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(accounts.error ?? goals.error)}
        actionLabel="Réessayer"
        onAction={() => {
          accounts.refetch();
          goals.refetch();
        }}
      />
    );
  }

  // Un compte ne sert qu'à un seul objectif : ceux déjà rattachés ailleurs sont exclus.
  const usedByOthers = new Set(
    goals.data.filter((g) => g.id !== props.initial?.id).map((g) => g.account),
  );
  const available = accounts.data.filter(
    (a) => !usedByOthers.has(a.id) && (!a.is_archived || a.id === props.initial?.account),
  );
  return <GoalFormFields {...props} accounts={available} />;
}

function GoalFormFields({
  initial,
  submitLabel,
  onSubmit,
  accounts,
}: GoalFormProps & { accounts: Account[] }) {
  const [message, setMessage] = useState<string | null>(null);
  // Un compte d'épargne est proposé en premier par défaut.
  const suggested = accounts.find((a) => a.type === 'savings') ?? accounts[0];

  const { control, handleSubmit, setError, setValue, formState } = useForm<
    GoalFormValues,
    unknown,
    GoalValues
  >({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initial?.name ?? '',
      account: initial?.account ?? suggested?.id ?? '',
      target_amount: initial ? amountToInput(initial.target_amount) : '',
      deadline: initial?.deadline ?? '',
    },
  });
  const accountId = useWatch({ control, name: 'account' });
  const deadline = useWatch({ control, name: 'deadline' });
  const currency = accounts.find((a) => a.id === accountId)?.currency;

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(toGoalPayload(values));
    } catch (error) {
      setMessage(applyApiErrors(error, setError, FIELDS));
    }
  });

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="piggy-bank-outline"
        title="Aucun compte disponible"
        message="Chaque objectif suit le solde d’un compte qui lui est réservé. Créez par exemple un compte « Épargne »."
        actionLabel="Nouveau compte"
        onAction={() => router.push('/accounts/new')}
      />
    );
  }

  return (
    <View style={styles.form}>
      <FormTextInput
        control={control}
        name="name"
        label="Nom de l’objectif (ex. Moto)"
        icon="flag-outline"
        maxLength={100}
        autoFocus={!initial}
      />
      <FormAmountInput
        control={control}
        name="target_amount"
        label="Montant à atteindre"
        currency={currency}
        large
      />
      <Controller
        control={control}
        name="account"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Compte suivi"
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} · ${formatAmount(a.balance, a.currency)}`,
              icon: ACCOUNT_TYPE_ICONS[a.type],
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <HelperText type="info" visible>
        La progression est le solde de ce compte. Pour épargner, faites un transfert vers lui :
        l’argent n’est jamais compté deux fois.
      </HelperText>

      <View style={styles.switchRow}>
        <Text variant="bodyLarge" style={styles.switchLabel}>
          Fixer une échéance
        </Text>
        <Switch
          value={Boolean(deadline)}
          onValueChange={(on) =>
            setValue('deadline', on ? toIsoDate(nextYear()) : '', { shouldDirty: true })
          }
          accessibilityLabel="Fixer une échéance"
        />
      </View>
      {deadline ? (
        <Controller
          control={control}
          name="deadline"
          render={({ field, fieldState }) => (
            <DateField
              label="Échéance"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              showShortcuts={false}
            />
          )}
        />
      ) : null}

      <FormMessage message={message} />
      <Button
        mode="contained"
        onPress={() => submit()}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        {submitLabel}
      </Button>
    </View>
  );
}

function nextYear() {
  const today = new Date();
  return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  form: { gap: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { flex: 1 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
