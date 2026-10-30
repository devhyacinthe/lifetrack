import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError, errorMessage } from '@/api/errors';

/**
 * Affiche les erreurs de validation du backend sous les champs correspondants et
 * renvoie le message général à afficher (ou null si tout est rattaché à un champ).
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return errorMessage(error);

  let unmatched = false;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message: messages.join(' ') });
    } else {
      unmatched = true;
    }
  }
  const hasFieldErrors = Object.keys(error.fieldErrors).length > 0;
  return hasFieldErrors && !unmatched ? null : error.message;
}
