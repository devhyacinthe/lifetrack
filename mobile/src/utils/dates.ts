/** Dates calendaires (YYYY-MM-DD) manipulées dans le fuseau du téléphone. */

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale du téléphone au format YYYY-MM-DD (sans passer par UTC). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM-DD en date locale (minuit), sans décalage de fuseau. */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** « Aujourd'hui », « Hier » ou « mardi 28 octobre » (avec l'année si elle diffère). */
export function dayLabel(value: string, today: Date = new Date()): string {
  const todayIso = toIsoDate(today);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (value === todayIso) return 'Aujourd’hui';
  if (value === toIsoDate(yesterday)) return 'Hier';
  const date = fromIsoDate(value);
  const label = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Intervalle d'une période (budget, statistiques) : « 1 nov. – 30 nov. 2026 » ou « 26 oct. – 1 nov. 2026 ». */
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
