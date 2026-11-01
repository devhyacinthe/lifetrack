import { z } from 'zod';

import type { FinishWorkoutPayload, WorkoutGoalPayload, WorkoutPayload } from '@/api/types';
import { toStartedAt } from '@/features/workouts/format';
import { normalizeDecimalInput } from '@/utils/decimal';

/** Limites identiques à celles du backend. */
export const MAX_DURATION_SECONDS = 24 * 60 * 60;
export const MAX_ESTIMATED_CALORIES = 20000;
/** Distance : Decimal(7,2), soit 5 chiffres avant la virgule. */
const DISTANCE_INTEGER_DIGITS = 5;

const digits = (value: string) => /^\d+$/.test(value);

/** Champs saisis à la fin d'une séance : durée, intensité, distance, calories, notes. */
const endFields = {
  hours: z.string().trim(),
  minutes: z.string().trim(),
  intensity: z.number().int().min(1, 'Entre 1 et 10.').max(10, 'Entre 1 et 10.'),
  distance: z.string().trim(),
  calories: z.string().trim(),
  notes: z.string().trim().max(1000, '1000 caractères au maximum.'),
};

type EndValues = {
  hours: string;
  minutes: string;
  distance: string;
  calories: string;
};

function checkEndValues(values: EndValues, ctx: z.RefinementCtx) {
  const hours = values.hours || '0';
  const minutes = values.minutes || '0';
  if (!digits(hours) || !digits(minutes) || Number(minutes) > 59) {
    ctx.addIssue({
      code: 'custom',
      path: ['minutes'],
      message: 'Durée invalide : heures et minutes (0 à 59) en nombres entiers.',
    });
  } else {
    const seconds = Number(hours) * 3600 + Number(minutes) * 60;
    if (seconds < 60 || seconds > MAX_DURATION_SECONDS) {
      ctx.addIssue({
        code: 'custom',
        path: ['minutes'],
        message: 'La durée doit être comprise entre 1 minute et 24 heures.',
      });
    }
  }
  const distance = values.distance
    ? normalizeDecimalInput(values.distance, DISTANCE_INTEGER_DIGITS)
    : '';
  if (distance === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['distance'],
      message: 'Distance invalide : 2 décimales au maximum (ex. 5,25).',
    });
  } else if (distance && Number(distance) <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['distance'],
      message: 'La distance doit être positive.',
    });
  }
  if (
    values.calories &&
    (!digits(values.calories) || Number(values.calories) > MAX_ESTIMATED_CALORIES)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['calories'],
      message: `Nombre entier entre 0 et ${MAX_ESTIMATED_CALORIES}.`,
    });
  }
}

function endPayload(values: EndValues & { intensity: number; notes: string }) {
  return {
    duration_seconds: Number(values.hours || '0') * 3600 + Number(values.minutes || '0') * 60,
    intensity: values.intensity,
    distance_km: values.distance
      ? normalizeDecimalInput(values.distance, DISTANCE_INTEGER_DIGITS)
      : null,
    estimated_calories: values.calories ? Number(values.calories) : null,
    notes: values.notes,
  };
}

/** Séance passée saisie directement terminée (ou modification d'une séance terminée). */
export const sessionSchema = z
  .object({
    activity: z.string().min(1, 'Choisissez une activité.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Heure invalide.'),
    ...endFields,
  })
  .superRefine(checkEndValues)
  .transform((values): WorkoutPayload => ({
    activity: values.activity,
    status: 'completed',
    started_at: toStartedAt(values.date, values.time),
    ...endPayload(values),
  }));

/** Fin d'une séance en cours : la durée proposée (temps écoulé) reste modifiable. */
export const finishSessionSchema = z
  .object(endFields)
  .superRefine(checkEndValues)
  .transform((values): FinishWorkoutPayload => endPayload(values));

export type FinishSessionFormValues = z.input<typeof finishSessionSchema>;

/** Démarrage d'une séance, ou modification d'une séance en cours. */
export const startSessionSchema = z.object({
  activity: z.string().min(1, 'Choisissez une activité.'),
  notes: z.string().trim().max(1000, '1000 caractères au maximum.'),
});

export type StartSessionValues = z.infer<typeof startSessionSchema>;

export type SessionFormValues = z.input<typeof sessionSchema>;

export const workoutGoalSchema = z
  .object({
    metric: z.enum(['sessions', 'duration', 'distance']),
    period: z.enum(['weekly', 'monthly']),
    /** Chaîne vide : toutes les activités. */
    activity: z.string(),
    /** Séances : nombre ; durée : minutes ; distance : km (convertis pour l'API). */
    target: z.string().trim().min(1, 'Saisissez une valeur.'),
  })
  .superRefine((values, ctx) => {
    if (values.metric === 'distance') {
      const km = normalizeDecimalInput(values.target, 8);
      if (km === null || Number(km) <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Distance positive, 2 décimales au maximum.',
        });
      }
    } else if (!digits(values.target) || Number(values.target) < 1) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: 'Nombre entier supérieur à 0.' });
    }
  })
  .transform((values): WorkoutGoalPayload => ({
    metric: values.metric,
    period: values.period,
    activity: values.activity || null,
    target_value:
      values.metric === 'distance'
        ? (normalizeDecimalInput(values.target, 8) as string)
        : values.metric === 'duration'
          ? String(Number(values.target) * 60) // minutes → secondes
          : values.target,
  }));

export type WorkoutGoalFormValues = z.input<typeof workoutGoalSchema>;

export const activitySchema = z.object({
  name: z.string().trim().min(1, 'Saisissez un nom.').max(60, '60 caractères au maximum.'),
  tracks_distance: z.boolean(),
});

export type ActivityValues = z.infer<typeof activitySchema>;
