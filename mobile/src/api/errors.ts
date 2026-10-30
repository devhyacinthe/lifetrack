export type FieldErrors = Record<string, string[]>;

/** Erreur renvoyée par l'API (réponse HTTP reçue, mais en échec). */
export class ApiError extends Error {
  readonly status: number;
  /** Erreurs de validation par champ (réponses 400). */
  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Le serveur n'a pas pu être joint (pas de réseau, délai dépassé…). */
export class NetworkError extends Error {
  constructor(message = 'Impossible de joindre le serveur. Vérifiez votre connexion.') {
    super(message);
    this.name = 'NetworkError';
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Session expirée ou identifiants invalides.',
  403: 'Action non autorisée.',
  404: 'Élément introuvable.',
  409: 'Action impossible : cet élément est utilisé.',
  429: 'Trop de tentatives. Réessayez dans une minute.',
};

/** Construit une ApiError à partir du corps JSON renvoyé par Django REST Framework. */
export function toApiError(status: number, body: unknown): ApiError {
  const fieldErrors: FieldErrors = {};
  let message = STATUS_MESSAGES[status] ?? 'Une erreur est survenue. Réessayez plus tard.';

  if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const messages = Array.isArray(value) ? value.map(String) : [String(value)];
      if (key === 'detail' || key === 'non_field_errors') {
        message = messages.join(' ');
      } else if (key !== 'code' && key !== 'messages') {
        fieldErrors[key] = messages;
      }
    }
    if (status === 400 && Object.keys(fieldErrors).length > 0 && !('detail' in body)) {
      message = 'Certaines informations sont invalides.';
    }
  }
  return new ApiError(status, message, fieldErrors);
}

/** Message lisible pour n'importe quelle erreur. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  return 'Une erreur inattendue est survenue.';
}
