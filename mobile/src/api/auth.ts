/** Endpoints d'authentification et de compte (/api/v1/auth/…). */
import { apiRequest, storeTokens } from './client';
import { tokenStore } from './token-store';
import type {
  ChangePasswordPayload,
  ProfileUpdatePayload,
  RegisterPayload,
  TokenPair,
  User,
} from './types';

export async function login(email: string, password: string): Promise<void> {
  const tokens = await apiRequest<TokenPair>('/auth/login/', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await storeTokens(tokens);
}

export function register(payload: RegisterPayload): Promise<User> {
  return apiRequest<User>('/auth/register/', { method: 'POST', body: payload, auth: false });
}

/** Révoque le jeton de renouvellement côté serveur, puis efface les jetons locaux. */
export async function logout(): Promise<void> {
  const refresh = await tokenStore.getRefresh();
  try {
    if (refresh) await apiRequest<void>('/auth/logout/', { method: 'POST', body: { refresh } });
  } finally {
    // Même hors ligne, l'utilisateur doit être déconnecté localement.
    await tokenStore.clear();
  }
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me/');
}

export function updateMe(payload: ProfileUpdatePayload): Promise<User> {
  return apiRequest<User>('/auth/me/', { method: 'PATCH', body: payload });
}

/** Le backend révoque alors toutes les sessions : on se reconnecte avec le nouveau mot de passe. */
export async function changePassword(email: string, payload: ChangePasswordPayload) {
  await apiRequest<void>('/auth/me/password/', { method: 'POST', body: payload });
  await login(email, payload.new_password);
}

export async function deleteAccount(password: string): Promise<void> {
  await apiRequest<void>('/auth/me/delete/', { method: 'POST', body: { password } });
  await tokenStore.clear();
}
