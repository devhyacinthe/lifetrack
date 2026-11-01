import { z } from 'zod';

import type { MeasurementPayload } from '@/api/types';
import { toIsoDate } from '@/utils/dates';
import { normalizeDecimalInput } from '@/utils/decimal';

/** Valeur : Decimal(7,2) côté backend, soit 5 chiffres avant la virgule. */
const VALUE_INTEGER_DIGITS = 5;

export const measurementSchema = z
  .object({
    metric_type: z.string().min(1, 'Choisissez une mesure.'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
      // Comparaison de chaînes YYYY-MM-DD : équivalente à celle des dates.
      .refine((value) => value <= toIsoDate(new Date()), 'La date ne peut pas être dans le futur.'),
    value: z
      .string()
      .trim()
      .min(1, 'Saisissez une valeur.')
      .refine((value) => {
        const normalized = normalizeDecimalInput(value, VALUE_INTEGER_DIGITS);
        return normalized !== null && Number(normalized) > 0;
      }, 'Valeur positive, 2 décimales au maximum (ex. 72,5).'),
    notes: z.string().trim().max(255, '255 caractères au maximum.'),
  })
  .transform((values): MeasurementPayload => ({
    metric_type: values.metric_type,
    date: values.date,
    value: normalizeDecimalInput(values.value, VALUE_INTEGER_DIGITS) as string,
    notes: values.notes,
  }));

export type MeasurementFormValues = z.input<typeof measurementSchema>;

export const metricTypeSchema = z.object({
  name: z.string().trim().min(1, 'Saisissez un nom.').max(60, '60 caractères au maximum.'),
  unit: z
    .string()
    .trim()
    .min(1, 'Saisissez une unité (kg, cm, %…).')
    .max(15, '15 caractères au maximum.'),
});

export type MetricTypeValues = z.infer<typeof metricTypeSchema>;
