/**
 * Formatage et conversion des montants et des dates financières.
 *
 * Les montants restent des chaînes décimales exactes entre l'API et les formulaires :
 * la conversion en nombre ne sert qu'à l'affichage.
 */
import type { Decimal, TransactionType } from '@/api/types';
import { fromIsoDate, toIsoDate } from '@/utils/dates';

/** Montant au format de l'API : au plus 13 chiffres avant la virgule et 2 après. */
const AMOUNT_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

/** Convertit une saisie (« 12 500 », « 12,5 ») en chaîne décimale, ou null si invalide. */
export function normalizeAmountInput(input: string): Decimal | null {
  const cleaned = input.replace(/[\s  ]/g, '').replace(',', '.');
  if (!AMOUNT_PATTERN.test(cleaned)) return null;
  return cleaned;
}

/** Comme normalizeAmountInput, avec un signe moins facultatif (solde initial d'un compte). */
export function normalizeSignedAmountInput(input: string): Decimal | null {
  const trimmed = input.trim();
  const negative = /^[-−]/.test(trimmed);
  const normalized = normalizeAmountInput(negative ? trimmed.slice(1) : trimmed);
  if (normalized === null) return null;
  return negative && Number(normalized) !== 0 ? `-${normalized}` : normalized;
}

/** Montant décimal (« 12500.00 ») en texte éditable sans zéros inutiles (« 12500 »). */
export function amountToInput(amount: Decimal): string {
  return amount
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
    .replace('.', ',');
}

const formatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat | null {
  if (!formatters.has(currency)) {
    try {
      formatters.set(
        currency,
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency, currencyDisplay: 'code' }),
      );
    } catch {
      return null; // code devise inconnu du moteur JavaScript
    }
  }
  return formatters.get(currency) ?? null;
}

/** « 12 500 XOF », « 12,50 EUR » ; avec un signe selon le type si demandé. */
export function formatAmount(amount: Decimal, currency: string, type?: TransactionType): string {
  const value = Number(amount);
  const formatter = currencyFormatter(currency);
  const text = formatter ? formatter.format(value) : `${amount} ${currency}`;
  if (!type) return text;
  return `${type === 'income' ? '+' : '−'} ${text}`;
}

export type Period = 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year';

export const PERIOD_LABELS: Record<Period, string> = {
  all: 'Toutes les dates',
  this_month: 'Ce mois-ci',
  last_month: 'Mois dernier',
  last_30_days: '30 derniers jours',
  this_year: 'Cette année',
};

/** Bornes incluses (YYYY-MM-DD) d'une période, calculées dans le fuseau du téléphone. */
export function periodRange(
  period: Period,
  today: Date = new Date(),
): { date_after?: string; date_before?: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (period) {
    case 'this_month':
      return {
        date_after: toIsoDate(new Date(y, m, 1)),
        date_before: toIsoDate(new Date(y, m + 1, 0)),
      };
    case 'last_month':
      return {
        date_after: toIsoDate(new Date(y, m - 1, 1)),
        date_before: toIsoDate(new Date(y, m, 0)),
      };
    case 'last_30_days':
      return {
        date_after: toIsoDate(new Date(y, m, today.getDate() - 29)),
        date_before: toIsoDate(today),
      };
    case 'this_year':
      return { date_after: `${y}-01-01`, date_before: `${y}-12-31` };
    default:
      return {};
  }
}

/** Intervalle d'une période de budget : « 1 nov. – 30 nov. 2026 » ou « 26 oct. – 1 nov. 2026 ». */
export function formatPeriodRange(start: string, end: string): string {
  const startDate = fromIsoDate(start);
  const endDate = fromIsoDate(end);
  const startText = startDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(startDate.getFullYear() !== endDate.getFullYear() ? { year: 'numeric' } : {}),
  });
  const endText = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startText} – ${endText}`;
}
