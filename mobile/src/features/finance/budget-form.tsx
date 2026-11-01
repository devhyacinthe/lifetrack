import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Budget, BudgetPayload, Category } from '@/api/types';
import { ChoiceChips } from '@/components/choice-chips';
import { EmptyState } from '@/components/empty-state';
import { FormAmountInput } from '@/components/form-amount-input';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type BudgetFormValues, type BudgetValues, budgetSchema } from '@/schemas/finance';

import { amountToInput } from './format';
import { BUDGET_PERIOD_LABELS, BUDGET_PERIODS, categoryIcon } from './labels';
import { useCategories } from './queries';

const FIELDS = ['category', 'amount', 'period', 'currency'] as const;

/** Valeurs du formulaire → données de l'API (catégorie vide = budget global). */
export function toBudgetPayload(values: BudgetValues): BudgetPayload {
  return { ...values, category: values.category || null };
}

type BudgetFormProps = {
  initial?: Budget;
  defaultCurrency: string;
  submitLabel: string;
  onSubmit: (payload: BudgetPayload) => Promise<void>;
};

export function BudgetForm(props: BudgetFormProps) {
  const categories = useCategories();

  if (categories.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (categories.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(categories.error)}
        actionLabel="Réessayer"
        onAction={() => categories.refetch()}
      />
    );
  }
  return <BudgetFormFields {...props} categories={categories.data} />;
}

function BudgetFormFields({
  initial,
  defaultCurrency,
  submitLabel,
  onSubmit,
  categories,
}: BudgetFormProps & { categories: Category[] }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<
    BudgetFormValues,
    unknown,
    BudgetValues
  >({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: initial?.category ?? '',
      amount: initial ? amountToInput(initial.amount) : '',
      period: initial?.period ?? 'monthly',
      currency: initial?.currency ?? defaultCurrency,
    },
  });
  const currency = useWatch({ control, name: 'currency' });

  // Seules les catégories de dépenses actives sont proposées (sauf celle déjà choisie).
  const categoryOptions = [
    { value: '', label: 'Toutes les dépenses', icon: 'all-inclusive' },
    ...categories
      .filter((c) => c.type === 'expense' && (c.is_active || c.id === initial?.category))
      .map((c) => ({ value: c.id, label: c.name, icon: categoryIcon(c.name, c.type) })),
  ];

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await onSubmit(toBudgetPayload(values));
    } catch (error) {
      setMessage(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="period"
        render={({ field }) => (
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
              Période (renouvelée automatiquement)
            </Text>
            <SegmentedButtons
              value={field.value}
              onValueChange={field.onChange}
              buttons={BUDGET_PERIODS.map((period) => ({
                value: period,
                label: BUDGET_PERIOD_LABELS[period].replace('Par ', ''),
              }))}
            />
          </View>
        )}
      />
      <FormAmountInput
        control={control}
        name="amount"
        label="Plafond de dépenses"
        currency={currency?.toUpperCase()}
        autoFocus={!initial}
        large
      />
      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <ChoiceChips
            label="Dépenses concernées"
            options={categoryOptions}
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
      <HelperText type="info" visible>
        Seules les dépenses des comptes dans cette devise sont comptées. Les transferts et les
        revenus ne le sont jamais.
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
      {categoryOptions.length === 1 ? (
        <Button mode="text" onPress={() => router.push('/categories')}>
          Gérer les catégories
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  form: { gap: 20 },
  field: { gap: 8 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
