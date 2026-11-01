/**
 * Préparation des données des graphiques, sans React (testable).
 *
 * Les valeurs viennent toujours du backend : ces fonctions ne font que les convertir en
 * nombres pour l'affichage et choisir les libellés. Aucune valeur n'est inventée.
 */
import type {
  CategoryTotal,
  Decimal,
  MetricSeries,
  MonthTotals,
  PeriodTotals,
  WorkoutHistory,
} from '@/api/types';
import { fromIsoDate } from '@/utils/dates';

/** Nombre de catégories affichées ; les suivantes sont regroupées dans « Autres ». */
export const MAX_SLICES = 4;

/** 950 → « 950 », 12 500 → « 12,5 k », 1 200 000 → « 1,2 M » (axes des graphiques). */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const [divisor, suffix] = abs >= 1e6 ? [1e6, ' M'] : abs >= 1e3 ? [1e3, ' k'] : [1, ''];
  const scaled = value / divisor;
  const rounded =
    Math.abs(scaled) >= 100 || divisor === 1 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  return `${String(rounded).replace('.', ',')}${suffix}`;
}

/** « 2026-10-01 » → « oct. » (initiale en majuscule). */
export function monthLabel(isoDate: string): string {
  const label = fromIsoDate(isoDate).toLocaleDateString('fr-FR', { month: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** « 2026-10-12 » → « 12/10 » (début de semaine). */
export function shortDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

// --- Finances ---------------------------------------------------------------------------

export type MonthBars = { label: string; income: number; expense: number; net: number };

export function monthBars(months: MonthTotals[]): MonthBars[] {
  return months.map((m) => ({
    label: monthLabel(m.period_start),
    income: Number(m.income),
    expense: Number(m.expense),
    net: Number(m.net),
  }));
}

export const hasMoneyMovements = (months: MonthTotals[]) =>
  months.some((m) => Number(m.income) > 0 || Number(m.expense) > 0);

export type Slice = {
  key: string;
  label: string;
  /** Montant exact du backend, pour l'affichage formaté. */
  total: Decimal;
  value: number;
  percent: string;
  /** Indice de couleur ; null pour « Autres » (gris neutre). */
  colorIndex: number | null;
};

/**
 * Catégories du plus gros montant au plus petit (ordre du backend). Au-delà de MAX_SLICES,
 * les suivantes sont additionnées dans « Autres » : la somme reste exacte (centimes).
 */
export function categorySlices(categories: CategoryTotal[], grandTotal: Decimal): Slice[] {
  const shown = categories.length > MAX_SLICES + 1 ? categories.slice(0, MAX_SLICES) : categories;
  const slices: Slice[] = shown.map((c, index) => ({
    key: c.category,
    label: c.category_name,
    total: c.total,
    value: Number(c.total),
    percent: c.percent,
    colorIndex: index,
  }));
  const rest = categories.slice(shown.length);
  if (rest.length > 0) {
    const cents = rest.reduce((sum, c) => sum + Math.round(Number(c.total) * 100), 0);
    const total = (cents / 100).toFixed(2);
    const all = Number(grandTotal);
    slices.push({
      key: 'others',
      label: `Autres (${rest.length})`,
      total,
      value: cents / 100,
      percent: all > 0 ? ((cents / 100 / all) * 100).toFixed(1) : '0.0',
      colorIndex: null,
    });
  }
  return slices;
}

// --- Sport ------------------------------------------------------------------------------

export type HistoryMetric = 'duration' | 'sessions';

export type HistoryBar = { label: string; value: number; isCurrent: boolean };

/**
 * Une barre par période (semaine : date du lundi ; mois : nom du mois). La durée est
 * affichée en minutes ; la dernière barre est la période en cours.
 */
export function historyBars(history: WorkoutHistory, metric: HistoryMetric): HistoryBar[] {
  return history.periods.map((p: PeriodTotals, index) => ({
    label:
      history.period === 'monthly' ? monthLabel(p.period_start) : shortDayLabel(p.period_start),
    value: metric === 'sessions' ? p.sessions_count : Math.round(p.total_duration_seconds / 60),
    isCurrent: index === history.periods.length - 1,
  }));
}

// --- Mesures corporelles ----------------------------------------------------------------

export type LinePoint = { value: number; label: string };

/** Libellés de l'axe des dates : au plus `maxLabels`, répartis sur la série. */
export function linePoints(series: MetricSeries, maxLabels = 4): LinePoint[] {
  const count = series.points.length;
  const step = Math.max(1, Math.ceil(count / maxLabels));
  return series.points.map((p, index) => ({
    value: Number(p.value),
    label: index % step === 0 || index === count - 1 ? shortDayLabel(p.date) : '',
  }));
}

/**
 * Bornes de l'axe vertical d'une courbe : un poids de 72 kg ne doit pas être dessiné
 * depuis 0. Renvoie le décalage (bas de l'axe) et l'étendue au-dessus de ce décalage.
 */
export function lineAxis(values: number[]): { offset: number; range: number } {
  if (values.length === 0) return { offset: 0, range: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.25, Math.abs(max) * 0.02, 0.5);
  const offset = Math.max(0, Math.floor(min - pad));
  const top = Math.ceil(max + pad);
  return { offset, range: Math.max(top - offset, 1) };
}
