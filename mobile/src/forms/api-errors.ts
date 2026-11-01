import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError, errorMessage } from '@/api/errors';

/**
 * Affiche les erreurs de validation du backend sous les champs correspondants et
 * renvoie le message général à afficher (ou null si tout est rattaché à un champ).
 * Une erreur sur un champ absent du formulaire (ex. `status`) devient le message général,
 * avec son texte d'origine.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return errorMessage(error);

  const unmatched: string[] = [];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message: messages.join(' ') });
    } else {
      unmatched.push(...messages);
    }
  }
  if (unmatched.length > 0) return unmatched.join(' ');
  return Object.keys(error.fieldErrors).length > 0 ? null : error.message;
}

/**
 * Renomme les champs des erreurs du backend vers ceux du formulaire, quand ils diffèrent
 * (ex. `duration_seconds` → `minutes`). Les autres erreurs sont renvoyées telles quelles.
 */
export function renameFieldErrors(error: unknown, mapping: Record<string, string>): unknown {
  if (!(error instanceof ApiError)) return error;
  const fieldErrors = Object.fromEntries(
    Object.entries(error.fieldErrors).map(([field, messages]) => [
      mapping[field] ?? field,
      messages,
    ]),
  );
  return new ApiError(error.status, error.message, fieldErrors);
}
