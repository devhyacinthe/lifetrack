/**
 * Client HTTP unique de l'application : toutes les URL de l'API passent par ici.
 *
 * Renouvellement des jetons : sur une réponse 401, un seul renouvellement est lancé
 * (promesse partagée entre les requêtes simultanées), puis chaque requête est rejouée
 * une seule fois. Un nouvel échec déconnecte l'utilisateur : aucune boucle possible.
 */
import { API_URL, REQUEST_TIMEOUT_MS } from '@/config';

import { ApiError, NetworkError, toApiError } from './errors';
import { tokenStore } from './token-store';
import type { TokenPair } from './types';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** false pour les endpoints publics (connexion, inscription, renouvellement). */
  auth?: boolean;
};

const API_PREFIX = '/api/v1';

let refreshInFlight: Promise<boolean> | null = null;
let sessionExpiredListener: (() => void) | null = null;

/** Appelé quand la session ne peut plus être renouvelée (déconnexion forcée). */
export function onSessionExpired(listener: (() => void) | null) {
  sessionExpiredListener = listener;
}

async function send(path: string, { method = 'GET', body, auth = true }: RequestOptions) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const access = tokenStore.getAccess();
  if (auth && access) headers.Authorization = `Bearer ${access}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined; // page d'erreur HTML (500 du serveur, proxy…)
    }
  }
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

/** Enregistre une nouvelle paire de jetons (connexion ou renouvellement). */
export async function storeTokens(tokens: TokenPair) {
  tokenStore.setAccess(tokens.access);
  await tokenStore.setRefresh(tokens.refresh);
}

async function doRefresh(): Promise<boolean> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) return false;
  try {
    const response = await send('/auth/token/refresh/', {
      method: 'POST',
      body: { refresh },
      auth: false,
    });
    if (!response.ok) {
      // Jeton expiré ou révoqué : la session est terminée.
      if (response.status === 401) await tokenStore.clear();
      return false;
    }
    // Rotation : l'ancien jeton de renouvellement est révoqué, on garde le nouveau.
    await storeTokens(await parse<TokenPair>(response));
    return true;
  } catch (error) {
    if (error instanceof NetworkError) throw error; // hors ligne : on garde la session
    return false;
  }
}

/** Renouvelle le jeton d'accès ; les appels simultanés partagent la même requête. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Requête vers l'API ; lève ApiError (réponse en échec) ou NetworkError. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;
  let response = await send(path, options);

  if (response.status === 401 && auth) {
    const renewed = await refreshSession();
    if (renewed) {
      response = await send(path, options); // une seule nouvelle tentative
    }
    if (!renewed || response.status === 401) {
      await tokenStore.clear();
      sessionExpiredListener?.();
      throw new ApiError(401, 'Votre session a expiré. Reconnectez-vous.');
    }
  }
  return parse<T>(response);
}
