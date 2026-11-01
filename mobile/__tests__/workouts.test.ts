import { ApiError } from '@/api/errors';
import { applyApiErrors, renameFieldErrors } from '@/forms/api-errors';
import {
  elapsedSeconds,
  formatDuration,
  formatElapsed,
  formatMetricValue,
  splitDuration,
  toStartedAt,
} from '@/features/workouts/format';
import { intensityLabel } from '@/features/workouts/labels';
import {
  finishSessionSchema,
  sessionSchema,
  startSessionSchema,
  workoutGoalSchema,
} from '@/schemas/workouts';
import { normalizeDecimalInput } from '@/utils/decimal';

describe('durées', () => {
  it.each([
    [2700, '45 min'],
    [5400, '1 h 30'],
    [3600, '1 h'],
    [30, '30 s'],
  ])('formatDuration(%i) = %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });

  it('découpe une durée en heures et minutes pour le formulaire', () => {
    expect(splitDuration(5400)).toEqual({ hours: '1', minutes: '30' });
  });

  it('affiche un chronomètre et calcule le temps écoulé', () => {
    expect(formatElapsed(65)).toBe('1:05');
    expect(formatElapsed(3725)).toBe('1:02:05');
    const start = '2026-11-02T18:00:00.000Z';
    expect(elapsedSeconds(start, new Date('2026-11-02T18:45:00.000Z'))).toBe(2700);
    expect(elapsedSeconds(start, new Date('2026-11-02T17:00:00.000Z'))).toBe(0);
  });
});

describe('valeurs des objectifs et intensité', () => {
  it('formate selon la mesure', () => {
    expect(formatMetricValue('sessions', '3.00')).toBe('3 séances');
    expect(formatMetricValue('duration', '5400.00')).toBe('1 h 30');
    expect(formatMetricValue('distance', '12.50')).toMatch(/^12,5\s?km$/);
  });

  it('décrit l’intensité', () => {
    expect([1, 5, 8, 10].map(intensityLabel)).toEqual([
      'Légère',
      'Modérée',
      'Soutenue',
      'Maximale',
    ]);
  });
});

describe('normalizeDecimalInput', () => {
  it('respecte le nombre de chiffres avant la virgule', () => {
    expect(normalizeDecimalInput('12345,5', 5)).toBe('12345.5');
    expect(normalizeDecimalInput('123456', 5)).toBeNull();
  });
});

const end = { hours: '0', minutes: '45', intensity: 7, distance: '', calories: '', notes: '' };

describe('sessionSchema (séance passée)', () => {
  it('produit une séance terminée avec un début en UTC', () => {
    const payload = sessionSchema.parse({
      activity: 'a1',
      date: '2026-11-02',
      time: '07:30',
      ...end,
      distance: '6,4',
      calories: '480',
    });

    expect(payload).toMatchObject({
      status: 'completed',
      duration_seconds: 2700,
      intensity: 7,
      distance_km: '6.4',
      estimated_calories: 480,
    });
    expect(payload.started_at).toBe(toStartedAt('2026-11-02', '07:30'));
  });
});

describe('finishSessionSchema (fin d’une séance en cours)', () => {
  it('convertit la durée et laisse distance et calories facultatives', () => {
    expect(finishSessionSchema.parse({ ...end, hours: '1', minutes: '5' })).toEqual({
      duration_seconds: 3900,
      intensity: 7,
      distance_km: null,
      estimated_calories: null,
      notes: '',
    });
  });

  it.each([
    [{ minutes: '0' }, 'minutes'], // moins d'une minute
    [{ hours: '25', minutes: '0' }, 'minutes'],
    [{ minutes: '75' }, 'minutes'],
    [{ distance: '0' }, 'distance'],
    [{ distance: '1,234' }, 'distance'],
    [{ calories: '-5' }, 'calories'],
    [{ calories: '30000' }, 'calories'],
  ])('refuse %o', (override, field) => {
    const result = finishSessionSchema.safeParse({ ...end, ...override });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });
});

describe('startSessionSchema', () => {
  it('exige une activité', () => {
    expect(startSessionSchema.safeParse({ activity: '', notes: '' }).success).toBe(false);
    expect(startSessionSchema.safeParse({ activity: 'a1', notes: '' }).success).toBe(true);
  });
});

describe('workoutGoalSchema', () => {
  const base = {
    metric: 'sessions' as const,
    period: 'weekly' as const,
    activity: '',
    target: '3',
  };

  it('convertit la durée saisie en minutes en secondes', () => {
    expect(workoutGoalSchema.parse({ ...base, metric: 'duration', target: '90' })).toMatchObject({
      target_value: '5400',
      activity: null,
    });
  });

  it('exige un entier pour les séances et accepte des décimales pour la distance', () => {
    expect(workoutGoalSchema.safeParse({ ...base, target: '2,5' }).success).toBe(false);
    expect(
      workoutGoalSchema.parse({ ...base, metric: 'distance', target: '21,1' }).target_value,
    ).toBe('21.1');
  });
});

describe('erreurs du backend', () => {
  it('renomme les champs de l’API vers ceux du formulaire', () => {
    const renamed = renameFieldErrors(
      new ApiError(400, 'Invalide', { duration_seconds: ['Trop long.'] }),
      { duration_seconds: 'minutes' },
    ) as ApiError;

    expect(renamed.fieldErrors).toEqual({ minutes: ['Trop long.'] });
  });

  it('affiche le texte d’une erreur portant sur un champ absent du formulaire', () => {
    const setError = jest.fn();
    const error = new ApiError(400, 'Certaines informations sont invalides.', {
      status: ['Une séance est déjà en cours : terminez-la ou supprimez-la.'],
    });

    expect(applyApiErrors(error, setError, ['activity'])).toBe(
      'Une séance est déjà en cours : terminez-la ou supprimez-la.',
    );
    expect(setError).not.toHaveBeenCalled();
  });
});
