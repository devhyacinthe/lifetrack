import { z } from 'zod';

import { normalizeAmountInput, normalizeSignedAmountInput } from '@/features/finance/format';

const MAX_DESCRIPTION = 255;

/** Montant saisi (« 12 500 », « 12,50 ») converti en chaîne décimale exacte pour l'API. */
const amountInput = z
  .string()
  .trim()
  .min(1, 'Saisissez un montant.')
  .transform((value, ctx) => {
    const normalized = normalizeAmountInput(value);
    if (normalized === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Montant invalide : 2 décimales au maximum (ex. 12500 ou 12,50).',
      });
      return z.NEVER;
    }
    if (Number(normalized) < 0.01) {
      ctx.addIssue({ code: 'custom', message: 'Le montant doit être supérieur à zéro.' });
      return z.NEVER;
    }
    return normalized;
  });

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amountInput,
  category: z.string().min(1, 'Choisissez une catégorie.'),
  account: z.string().min(1, 'Choisissez un compte.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
  description: z.string().trim().max(MAX_DESCRIPTION, `${MAX_DESCRIPTION} caractères au maximum.`),
  payment_method: z.enum(['', 'cash', 'card', 'mobile_money', 'bank_transfer', 'check', 'other']),
});

/** Valeurs du formulaire (saisie) et valeurs validées (envoyées à l'API). */
export type TransactionFormValues = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Saisissez un nom.').max(60, '60 caractères au maximum.'),
  type: z.enum(['income', 'expense']),
});

export type CategoryValues = z.infer<typeof categorySchema>;

/** Solde initial d'un compte : peut être nul ou négatif (découvert). Vide = 0. */
const signedAmountInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return '0';
    const normalized = normalizeSignedAmountInput(value);
    if (normalized === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Montant invalide : 2 décimales au maximum (ex. 150000 ou -2500,50).',
      });
      return z.NEVER;
    }
    return normalized;
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.');

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Saisissez un nom.').max(100, '100 caractères au maximum.'),
  type: z.enum(['cash', 'bank', 'mobile_money', 'savings']),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code devise sur 3 lettres (ex. XOF, EUR).'),
  initial_balance: signedAmountInput,
});

export type AccountFormValues = z.input<typeof accountSchema>;
export type AccountValues = z.output<typeof accountSchema>;

export const transferSchema = z
  .object({
    from_account: z.string().min(1, 'Choisissez le compte à débiter.'),
    to_account: z.string().min(1, 'Choisissez le compte à créditer.'),
    amount: amountInput,
    date: isoDate,
    description: z
      .string()
      .trim()
      .max(MAX_DESCRIPTION, `${MAX_DESCRIPTION} caractères au maximum.`),
  })
  .refine((values) => values.from_account !== values.to_account, {
    path: ['to_account'],
    message: 'Choisissez deux comptes différents.',
  });

export type TransferFormValues = z.input<typeof transferSchema>;
export type TransferValues = z.output<typeof transferSchema>;

export const budgetSchema = z.object({
  /** Chaîne vide : budget global (toutes les dépenses). */
  category: z.string(),
  amount: amountInput,
  period: z.enum(['weekly', 'monthly', 'yearly']),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code devise sur 3 lettres (ex. XOF, EUR).'),
});

export type BudgetFormValues = z.input<typeof budgetSchema>;
export type BudgetValues = z.output<typeof budgetSchema>;

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Saisissez un nom.').max(100, '100 caractères au maximum.'),
  account: z.string().min(1, 'Choisissez le compte de cet objectif.'),
  target_amount: amountInput,
  /** Chaîne vide : pas d'échéance. */
  deadline: z.union([z.literal(''), isoDate]),
});

export type GoalFormValues = z.input<typeof goalSchema>;
export type GoalValues = z.output<typeof goalSchema>;
