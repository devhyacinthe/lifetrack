import { createMeasurement, getMetricSeries, listMeasurements } from '@/api/body';
import { storeTokens } from '@/api/client';
import { ApiError } from '@/api/errors';
import { getCategoryStats, getMonthlyStats } from '@/api/finance';
import type { CategoryTotal, MetricSeries } from '@/api/types';
import { getWorkoutHistory } from '@/api/workouts';
import { formatChange, formatMeasure, metricIcon, valueToInput } from '@/features/body/format';
import {
  categorySlices,
  compactNumber,
  hasMoneyMovements,
  historyBars,
  lineAxis,
  linePoints,
  MAX_SLICES,
  monthBars,
  shortDayLabel,
} from '@/features/stats/chart-data';
import { applyApiErrors } from '@/forms/api-errors';
import { measurementSchema, metricTypeSchema } from '@/schemas/body';
import { toIsoDate } from '@/utils/dates';

function respond(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(async () => {
  fetchMock.mockReset();
  await storeTokens({ access: 'access-1', refresh: 'refresh-1' });
});

const lastUrl = () => String(fetchMock.mock.calls.at(-1)?.[0]);

// --- Préparation des graphiques ------------------------------------------------------------

describe('compactNumber', () => {
  it.each([
    [0, '0'],
    [950, '950'],
    [12500, '12,5 k'],
    [300000, '300 k'],
    [1250000, '1,3 M'],
    [-50000, '-50 k'],
  ])('%d → %s', (value, text) => {
    expect(compactNumber(value)).toBe(text);
  });
});

describe('finances', () => {
  const months = [
    {
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      income: '0.00',
      expense: '0.00',
      net: '0.00',
    },
    {
      period_start: '2026-10-01',
      period_end: '2026-10-31',
      income: '300000.00',
      expense: '120000.50',
      net: '179999.50',
    },
  ];

  it('convertit les mois en barres sans inventer de valeur', () => {
    const bars = monthBars(months);

    expect(bars.map((b) => [b.income, b.expense, b.net])).toEqual([
      [0, 0, 0],
      [300000, 120000.5, 179999.5],
    ]);
    expect(bars[1].label.toLowerCase()).toMatch(/^oct/);
    expect(hasMoneyMovements(months)).toBe(true);
    expect(hasMoneyMovements([months[0]])).toBe(false);
  });

  const category = (n: number, total: string, percent: string): CategoryTotal => ({
    category: `c${n}`,
    category_name: `Catégorie ${n}`,
    total,
    transactions_count: 1,
    percent,
  });

  it('garde toutes les catégories quand elles tiennent dans le graphique', () => {
    const slices = categorySlices(
      [category(1, '600.00', '60.0'), category(2, '400.00', '40.0')],
      '1000.00',
    );

    expect(slices.map((s) => [s.label, s.colorIndex])).toEqual([
      ['Catégorie 1', 0],
      ['Catégorie 2', 1],
    ]);
  });

  it('regroupe les plus petites dans « Autres » avec un total exact', () => {
    const categories = [
      category(1, '500.00', '50.0'),
      category(2, '200.00', '20.0'),
      category(3, '100.00', '10.0'),
      category(4, '100.00', '10.0'),
      category(5, '50.10', '5.0'),
      category(6, '49.90', '5.0'),
    ];

    const slices = categorySlices(categories, '1000.00');

    expect(slices).toHaveLength(MAX_SLICES + 1);
    expect(slices.at(-1)).toMatchObject({
      key: 'others',
      label: 'Autres (2)',
      total: '100.00',
      percent: '10.0',
      colorIndex: null,
    });
  });
});

describe('sport', () => {
  const history = {
    period: 'weekly' as const,
    periods: [
      {
        period_start: '2026-10-05',
        period_end: '2026-10-11',
        sessions_count: 0,
        total_duration_seconds: 0,
        total_distance_km: '0.00',
      },
      {
        period_start: '2026-10-12',
        period_end: '2026-10-18',
        sessions_count: 2,
        total_duration_seconds: 5430,
        total_distance_km: '5.00',
      },
    ],
  };

  it('affiche la durée en minutes ou le nombre de séances, période en cours en dernier', () => {
    expect(historyBars(history, 'duration')).toEqual([
      { label: '05/10', value: 0, isCurrent: false },
      { label: '12/10', value: 91, isCurrent: true },
    ]);
    expect(historyBars(history, 'sessions').map((b) => b.value)).toEqual([0, 2]);
  });

  it('nomme les mois pour l’historique mensuel', () => {
    const monthly = {
      period: 'monthly' as const,
      periods: [{ ...history.periods[0], period_start: '2026-10-01', period_end: '2026-10-31' }],
    };

    expect(historyBars(monthly, 'sessions')[0].label.toLowerCase()).toMatch(/^oct/);
  });
});

describe('mesures corporelles', () => {
  const series = (values: string[]): MetricSeries => ({
    metric_type: 't1',
    name: 'Poids',
    unit: 'kg',
    start_date: '2026-05-01',
    end_date: '2026-10-15',
    points: values.map((value, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      value,
    })),
    minimum: null,
    maximum: null,
    first: null,
    last: null,
    change: null,
  });

  it('ne garde que quelques libellés de dates', () => {
    const points = linePoints(
      series(['72', '71.5', '71', '70.8', '70.5', '70', '69.9', '69.5']),
      4,
    );

    expect(points.map((p) => p.value)).toEqual([72, 71.5, 71, 70.8, 70.5, 70, 69.9, 69.5]);
    expect(points.filter((p) => p.label).map((p) => p.label)).toEqual([
      '01/10',
      '03/10',
      '05/10',
      '07/10',
      '08/10',
    ]);
    expect(shortDayLabel('2026-10-15')).toBe('15/10');
  });

  it('ne dessine pas un poids depuis zéro', () => {
    const { offset, range } = lineAxis([72.4, 74.1]);

    expect(offset).toBeGreaterThan(60);
    expect(offset).toBeLessThan(72.4);
    expect(offset + range).toBeGreaterThan(74.1);
    expect(lineAxis([])).toEqual({ offset: 0, range: 1 });
    expect(lineAxis([0.4]).offset).toBe(0); // jamais d'axe négatif
  });

  it('formate les valeurs et les variations', () => {
    expect(formatMeasure('72.50', 'kg')).toMatch(/^72,5\skg$/);
    expect(formatChange('-3.00', 'kg')).toMatch(/^−3\skg$/);
    expect(formatChange('1.20', 'cm')).toMatch(/^\+1,2\scm$/);
    expect(formatChange('0.00', 'cm')).toBe('Stable');
    expect(valueToInput('72.50')).toBe('72,5');
    expect(metricIcon('Poids', 'kg')).toBe('scale-bathroom');
    expect(metricIcon('Masse grasse', '%')).toBe('percent-outline');
  });
});

// --- Formulaires ----------------------------------------------------------------------------

describe('measurementSchema', () => {
  const base = { metric_type: 't1', date: '2026-10-15', value: '72,5', notes: '' };

  it('convertit la valeur en décimal pour l’API', () => {
    expect(measurementSchema.parse(base)).toEqual({ ...base, value: '72.5' });
  });

  it.each([
    [{ value: '' }, 'value'],
    [{ value: '0' }, 'value'],
    [{ value: '72,555' }, 'value'],
    [{ value: '123456' }, 'value'],
    [{ metric_type: '' }, 'metric_type'],
    [{ date: '2999-01-01' }, 'date'],
  ])('refuse %o', (override, field) => {
    const result = measurementSchema.safeParse({ ...base, ...override });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it('accepte la date du jour', () => {
    expect(measurementSchema.safeParse({ ...base, date: toIsoDate(new Date()) }).success).toBe(
      true,
    );
  });
});

describe('metricTypeSchema', () => {
  it('exige un nom et une unité', () => {
    expect(metricTypeSchema.safeParse({ name: 'Tour de bras', unit: 'cm' }).success).toBe(true);
    expect(metricTypeSchema.safeParse({ name: '', unit: 'cm' }).success).toBe(false);
    expect(metricTypeSchema.safeParse({ name: 'Bras', unit: '' }).success).toBe(false);
  });
});

// --- Services API ---------------------------------------------------------------------------

describe('API des statistiques et des mesures', () => {
  it('appelle les endpoints avec leurs paramètres', async () => {
    fetchMock.mockResolvedValue(respond(200, {}));

    await getMonthlyStats(6);
    expect(lastUrl()).toMatch(/\/finance\/stats\/monthly\/\?months=6$/);
    await getCategoryStats('income');
    expect(lastUrl()).toMatch(/\/finance\/stats\/categories\/\?type=income&period=monthly$/);
    await getWorkoutHistory('weekly');
    expect(lastUrl()).toMatch(/\/workouts\/stats\/history\/\?period=weekly$/);
    await getMetricSeries('t1', 6);
    expect(lastUrl()).toMatch(/\/body\/metric-types\/t1\/series\/\?months=6$/);
    await listMeasurements('t1', 2);
    expect(lastUrl()).toMatch(/\/body\/measurements\/\?metric_type=t1&page=2&page_size=20$/);
  });

  it('affiche le refus d’une deuxième mesure le même jour sur le champ date', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(400, { date: ['Une mesure de ce type existe déjà à cette date : modifiez-la.'] }),
    );
    const setError = jest.fn();

    const error = await createMeasurement({
      metric_type: 't1',
      date: '2026-10-15',
      value: '72.5',
      notes: '',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(applyApiErrors(error, setError, ['metric_type', 'date', 'value', 'notes'])).toBeNull();
    expect(setError).toHaveBeenCalledWith('date', {
      type: 'server',
      message: 'Une mesure de ce type existe déjà à cette date : modifiez-la.',
    });
  });
});
