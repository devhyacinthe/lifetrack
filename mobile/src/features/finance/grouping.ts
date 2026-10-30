import type { Transaction } from '@/api/types';

export type TransactionSection = { date: string; data: Transaction[] };

/**
 * Regroupe des transactions déjà triées par date en sections consécutives par jour,
 * sans changer l'ordre renvoyé par l'API.
 */
export function groupByDay(transactions: Transaction[]): TransactionSection[] {
  const sections: TransactionSection[] = [];
  for (const tx of transactions) {
    const last = sections[sections.length - 1];
    if (last && last.date === tx.date) last.data.push(tx);
    else sections.push({ date: tx.date, data: [tx] });
  }
  return sections;
}
