import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, TextInput, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Account, Transfer } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormAmountInput } from '@/components/form-amount-input';
import { FormMessage } from '@/components/form-message';
import { applyApiErrors } from '@/forms/api-errors';
import { type TransferFormValues, type TransferValues, transferSchema } from '@/schemas/finance';
import { toIsoDate } from '@/utils/dates';

import { amountToInput, formatAmount } from './format';
import { ACCOUNT_TYPE_ICONS } from './labels';
import { useAccounts } from './queries';

const FIELDS = ['from_account', 'to_account', 'amount', 'date', 'description'] as const;

type TransferFormProps = {
  initial?: Transfer;
  /** Comptes présélectionnés (ex. « Épargner » depuis un objectif). */
  defaultFrom?: string;
  defaultTo?: string;
  submitLabel: string;
  onSubmit: (values: TransferValues) => Promise<void>;
};

/** Charge les comptes, puis affiche le formulaire de transfert. */
export function TransferForm(props: TransferFormProps) {
  const accounts = useAccounts();

  if (accounts.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (accounts.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(accounts.error)}
        actionLabel="Réessayer"
        onAction={() => accounts.refetch()}
      />
    );
  }
  return <TransferFormFields {...props} accounts={accounts.data} />;
}

function TransferFormFields({
  initial,
  defaultFrom,
  defaultTo,
  submitLabel,
  onSubmit,
  accounts,
}: TransferFormProps & { accounts: Account[] }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  // Un compte archivé n'est proposé que s'il est déjà utilisé par ce transfert.
  const usable = accounts.filter(
    (a) => !a.is_archived || a.id === initial?.from_account || a.id === initial?.to_account,
  );

  const { control, handleSubmit, setError, formState } = useForm<
    TransferFormValues,
    unknown,
    TransferValues
  >({
    resolver: zodResolver(transferSchema),
    defaultValues: initial
      ? {
          from_account: initial.from_account,
          to_account: initial.to_account,
          amount: amountToInput(initial.amount),
          date: initial.date,
          description: initial.description,
        }
      : {
          from_account: defaultFrom ?? '',
          to_account: defaultTo ?? '',
          amount: '',
          date: toIsoDate(new Date()),
          description: '',
        },
  });

  const fromId = useWatch({ control, name: 'from_account' });
  const from = accounts.find((a) => a.id === fromId);

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, FIELDS));
    }
  });

  if (usable.length < 2) {
    return (
      <EmptyState
        icon="swap-horizontal"
        title="Il faut au moins deux comptes"
        message="Un transfert déplace de l’argent d’un compte vers un autre."
        actionLabel="Nouveau compte"
        onAction={() => router.push('/accounts/new')}
      />
    );
  }

  const options = (excludeId?: string) =>
    usable
      .filter((a) => a.id !== excludeId)
      .map((a) => ({
        value: a.id,
        label: `${a.name} · ${formatAmount(a.balance, a.currency)}`,
        icon: ACCOUNT_TYPE_ICONS[a.type],
      }));

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="from_account"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Depuis le compte"
            options={options()}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="to_account"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Vers le compte"
            options={options(fromId)}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormAmountInput
        control={control}
        name="amount"
        label="Montant"
        currency={from?.currency}
        large
      />
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <DateField
            label="Date"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              mode="outlined"
              label="Description (facultatif)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={255}
              error={Boolean(fieldState.error)}
              accessibilityLabel="Description"
              outlineStyle={styles.outline}
              style={{ backgroundColor: colors.surface }}
            />
            {fieldState.error ? (
              <HelperText type="error" visible>
                {fieldState.error.message}
              </HelperText>
            ) : null}
          </View>
        )}
      />
      <HelperText type="info" visible>
        Un transfert n’est ni une dépense ni un revenu : il modifie seulement les soldes des deux
        comptes, qui doivent avoir la même devise.
      </HelperText>
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

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  form: { gap: 20 },
  outline: { borderRadius: 16 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
