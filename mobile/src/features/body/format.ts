/** Affichage des mesures corporelles (les valeurs restent des chaînes décimales exactes). */
import type { Decimal } from '@/api/types';

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** « 72.50 », « kg » → « 72,5 kg ». */
export function formatMeasure(value: Decimal, unit: string): string {
  return `${numberFormat.format(Number(value))} ${unit}`;
}

/** Variation sur la période : « +1,2 cm », « −3 kg » ou « Stable ». */
export function formatChange(change: Decimal, unit: string): string {
  const value = Number(change);
  if (value === 0) return 'Stable';
  return `${value > 0 ? '+' : '−'}${numberFormat.format(Math.abs(value))} ${unit}`;
}

/** « 72.50 » → « 72,5 » (texte modifiable dans le formulaire). */
export function valueToInput(value: Decimal): string {
  return value
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
    .replace('.', ',');
}

/** Icône d'un type de mesure, d'après son unité ou son nom. */
export function metricIcon(name: string, unit: string): string {
  const text = `${name} ${unit}`.toLowerCase();
  if (/poids|kg|lb/.test(text)) return 'scale-bathroom';
  if (/%|graisse|grasse|muscle/.test(text)) return 'percent-outline';
  if (/cm|tour|taille|hanche|poitrine|bras|cuisse/.test(text)) return 'tape-measure';
  return 'ruler';
}
