/** Adresse de l'API, définie par environnement (fichiers .env / .env.local). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL est manquante : voir mobile/.env');
}

/** Délai maximal d'une requête (la connexion peut être lente). */
export const REQUEST_TIMEOUT_MS = 20_000;
