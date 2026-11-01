import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  SegmentedButtons,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Account, Category, Transaction, TransactionType } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormAmountInput } from '@/components/form-amount-input';
import { FormMessage } from '@/components/form-message';
import { applyApiErrors } from '@/forms/api-errors';
import {
  type TransactionFormValues,
  type TransactionValues,
  transactionSchema,
} from '@/schemas/finance';
import { toIsoDate } from '@/utils/dates';

import { amountToInput } from './format';
import { categoryIcon, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from './labels';
import { useAccounts, useCategories } from './queries';

const FIELDS = [
  'type',
  'amount',
  'category',
  'account',
  'date',
  'description',
  'payment_method',
] as const;

type TransactionFormProps = {
  /** Transaction modifiée ; absente pour une création. */
  initial?: Transaction;
  defaultType?: TransactionType;
  submitLabel: string;
  /** Envoie les données au backend ; lève une erreur en cas d'échec. */
  onSubmit: (values: TransactionValues) => Promise<void>;
};

/** Charge les comptes et catégories, puis affiche le formulaire. */
export function TransactionForm(props: TransactionFormProps) {
  const accounts = useAccounts();
  const categories = useCategories();

  if (accounts.isPending || categories.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (accounts.isError || categories.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(accounts.error ?? categories.error)}
        actionLabel="Réessayer"
        onAction={() => {
          accounts.refetch();
          categories.refetch();
        }}
      />
    );
  }
  return <TransactionFormFields {...props} accounts={accounts.data} categories={categories.data} />;
}

function TransactionFormFields({
  initial,
  defaultType = 'expense',
  submitLabel,
  onSubmit,
  accounts,
  categories,
}: TransactionFormProps & { accounts: Account[]; categories: Category[] }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  // Un compte archivé ou une catégorie désactivée ne restent proposés que s'ils sont déjà utilisés.
  const usableAccounts = accounts.filter((a) => !a.is_archived || a.id === initial?.account);
  const defaultAccount = usableAccounts.find((a) => !a.is_archived);

  const { control, handleSubmit, setError, setValue, formState } = useForm<
    TransactionFormValues,
    unknown,
    TransactionValues
  >({
    resolver: zodResolver(transactionSchema),
    defaultValues: initial
      ? {
          type: initial.type,
          amount: amountToInput(initial.amount),
          category: initial.category,
          account: initial.account,
          date: initial.date,
          description: initial.description,
          payment_method: initial.payment_method,
        }
      : {
          type: defaultType,
          amount: '',
          category: '',
          account: defaultAccount?.id ?? '',
          date: toIsoDate(new Date()),
          description: '',
          payment_method: '',
        },
  });

  const type = useWatch({ control, name: 'type' });
  const accountId = useWatch({ control, name: 'account' });
  const currency = accounts.find((a) => a.id === accountId)?.currency;

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.type === type && (c.is_active || c.id === initial?.category))
        .map((c) => ({
          value: c.id,
          label: c.is_active ? c.name : `${c.name} (désactivée)`,
          icon: categoryIcon(c.name, c.type),
        })),
    [categories, type, initial?.category],
  );

  // Avec un seul compte, le choix est masqué : une erreur sur ce champ va dans le message général.
  const showAccount = usableAccounts.length > 1 || Boolean(initial);

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      const fields = showAccount ? FIELDS : FIELDS.filter((f) => f !== 'account');
      setMessage(applyApiErrors(error, setError, fields));
    }
  });

  if (usableAccounts.length === 0) {
    return (
      <EmptyState
        icon="wallet-outline"
        title="Aucun compte actif"
        message="Une transaction doit être rattachée à un compte. La gestion des comptes arrive en phase 8."
      />
    );
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <SegmentedButtons
            value={field.value}
            onValueChange={(next) => {
              field.onChange(next);
              setValue('category', ''); // la catégorie dépend du type
            }}
            buttons={[
              { value: 'expense', label: 'Dépense', icon: 'arrow-top-right' },
              { value: 'income', label: 'Revenu', icon: 'arrow-bottom-left' },
            ]}
          />
        )}
      />

      <FormAmountInput
        control={control}
        name="amount"
        label="Montant"
        currency={currency}
        autoFocus={!initial}
        large
      />

      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) =>
          categoryOptions.length === 0 ? (
            <EmptyState
              icon="shape-outline"
              title="Aucune catégorie active"
              message="Créez une catégorie de ce type pour continuer."
              actionLabel="Gérer les catégories"
              onAction={() => router.push('/categories')}
            />
          ) : (
            <ChoiceChips
              label="Catégorie"
              options={categoryOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )
        }
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

      {showAccount ? (
        <Controller
          control={control}
          name="account"
          render={({ field, fieldState }) => (
            <ChoiceChips
              label="Compte"
              options={usableAccounts.map((a) => ({
                value: a.id,
                label: a.is_archived ? `${a.name} (archivé)` : a.name,
                icon: 'wallet-outline',
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="payment_method"
        render={({ field }) => (
          <ChoiceChips
            label="Moyen de paiement (facultatif)"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
            value={field.value}
            onChange={field.onChange}
            allowEmpty
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
              multiline
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
