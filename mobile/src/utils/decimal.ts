/** Saisie de nombres décimaux exacts (montants, distances), sans passer par les flottants. */

/**
 * Convertit une saisie (« 12 500 », « 12,5 ») en chaîne décimale d'au plus 2 décimales,
 * ou null si elle est invalide. maxIntegerDigits : chiffres autorisés avant la virgule.
 */
export function normalizeDecimalInput(input: string, maxIntegerDigits: number): string | null {
  const cleaned = input.replace(/[\s  ]/g, '').replace(',', '.');
  const pattern = new RegExp(`^\d{1,${maxIntegerDigits}}(\.\d{1,2})?$`);
  return pattern.test(cleaned) ? cleaned : null;
}
