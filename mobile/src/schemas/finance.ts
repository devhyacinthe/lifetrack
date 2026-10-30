import { z } from 'zod';

import { normalizeAmountInput } from '@/features/finance/format';

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
