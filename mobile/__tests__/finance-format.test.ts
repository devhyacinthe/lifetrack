import type { Transaction } from '@/api/types';
import {
  amountToInput,
  formatAmount,
  normalizeAmountInput,
  periodRange,
} from '@/features/finance/format';
import { groupByDay } from '@/features/finance/grouping';
import { dayLabel, fromIsoDate, toIsoDate } from '@/utils/dates';

describe('normalizeAmountInput', () => {
  it.each([
    ['12500', '12500'],
    ['12 500', '12500'],
    ['12 500', '12500'], // espace fine insécable (format français)
    ['12,5', '12.5'],
    ['0,01', '0.01'],
    [' 42.75 ', '42.75'],
  ])('convertit « %s » en %s', (input, expected) => {
    expect(normalizeAmountInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '-5', '1e3', '12.5.3', '12345678901234'])(
    'refuse « %s »',
    (input) => {
      expect(normalizeAmountInput(input)).toBeNull();
    },
  );
});

describe('amountToInput', () => {
  it('retire les zéros inutiles et utilise la virgule', () => {
    expect(amountToInput('12500.00')).toBe('12500');
    expect(amountToInput('12.50')).toBe('12,5');
    expect(amountToInput('12.05')).toBe('12,05');
  });
});

describe('formatAmount', () => {
  it('affiche le XOF sans décimales et ajoute le signe selon le type', () => {
    const text = formatAmount('12500.00', 'XOF');
    expect(text).toMatch(/12\s?500/);
    expect(text).toContain('XOF');
    expect(text).not.toMatch(/,00/);
    expect(formatAmount('10.00', 'XOF', 'income').startsWith('+')).toBe(true);
    expect(formatAmount('10.00', 'XOF', 'expense').startsWith('−')).toBe(true);
  });
});

describe('dates', () => {
  it('convertit sans décalage de fuseau', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(fromIsoDate('2026-10-30'))).toBe('2026-10-30');
  });

  it('nomme aujourd’hui et hier', () => {
    const today = new Date(2026, 9, 30);
    expect(dayLabel('2026-10-30', today)).toBe('Aujourd’hui');
    expect(dayLabel('2026-10-29', today)).toBe('Hier');
    expect(dayLabel('2026-10-27', today)).toMatch(/27 octobre/);
    expect(dayLabel('2025-10-27', today)).toMatch(/2025/);
  });

  it('calcule les bornes incluses des périodes', () => {
    const today = new Date(2026, 2, 15); // 15 mars 2026
    expect(periodRange('all', today)).toEqual({});
    expect(periodRange('this_month', today)).toEqual({
      date_after: '2026-03-01',
      date_before: '2026-03-31',
    });
    expect(periodRange('last_month', today)).toEqual({
      date_after: '2026-02-01',
      date_before: '2026-02-28',
    });
    expect(periodRange('last_30_days', today)).toEqual({
      date_after: '2026-02-14',
      date_before: '2026-03-15',
    });
    expect(periodRange('this_year', today)).toEqual({
      date_after: '2026-01-01',
      date_before: '2026-12-31',
    });
  });

  it('passe correctement au mois précédent en janvier', () => {
    expect(periodRange('last_month', new Date(2026, 0, 10))).toEqual({
      date_after: '2025-12-01',
      date_before: '2025-12-31',
    });
  });
});

describe('groupByDay', () => {
  const tx = (id: string, date: string) => ({ id, date }) as Transaction;

  it("regroupe les jours consécutifs sans changer l'ordre", () => {
    const sections = groupByDay([
      tx('a', '2026-10-30'),
      tx('b', '2026-10-30'),
      tx('c', '2026-10-28'),
    ]);

    expect(sections.map((s) => [s.date, s.data.map((t) => t.id)])).toEqual([
      ['2026-10-30', ['a', 'b']],
      ['2026-10-28', ['c']],
    ]);
  });

  it('renvoie une liste vide sans transaction', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
