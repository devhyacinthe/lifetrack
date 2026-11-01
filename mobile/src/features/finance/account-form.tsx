import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import type { Account } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { FormAmountInput } from '@/components/form-amount-input';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type AccountFormValues, type AccountValues, accountSchema } from '@/schemas/finance';

import { amountToInput } from './format';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from './labels';

const FIELDS = ['name', 'type', 'currency', 'initial_balance'] as const;

type AccountFormProps = {
  initial?: Account;
  /** Devise proposée pour un nouveau compte (devise préférée de l'utilisateur). */
  defaultCurrency: string;
  submitLabel: string;
  onSubmit: (values: AccountValues) => Promise<void>;
};

export function AccountForm({ initial, defaultCurrency, submitLabel, onSubmit }: AccountFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<
    AccountFormValues,
    unknown,
    AccountValues
  >({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'bank',
      currency: initial?.currency ?? defaultCurrency,
      initial_balance: initial ? amountToInput(initial.initial_balance) : '',
    },
  });
  const currency = useWatch({ control, name: 'currency' });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setMessage(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <FormTextInput
        control={control}
        name="name"
        label="Nom du compte"
        icon="wallet-outline"
        maxLength={100}
        autoFocus={!initial}
      />
      <Controller
        control={control}
        name="type"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Type"
            options={ACCOUNT_TYPES.map((type) => ({
              value: type,
              label: ACCOUNT_TYPE_LABELS[type],
              icon: ACCOUNT_TYPE_ICONS[type],
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextInput
        control={control}
        name="currency"
        label="Devise (ex. XOF)"
        icon="cash-multiple"
        autoCapitalize="characters"
        maxLength={3}
      />
      <FormAmountInput
        control={control}
        name="initial_balance"
        label="Solde initial (facultatif, peut être négatif)"
        currency={currency?.toUpperCase()}
        allowNegative
      />
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
  form: { gap: 20 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
