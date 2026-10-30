import * as SecureStore from 'expo-secure-store';

/**
 * Stockage des jetons :
 * - le jeton d'accès (15 min) reste en mémoire, jamais sur le disque ;
 * - le jeton de renouvellement (7 jours) est chiffré par le système (SecureStore).
 */
const REFRESH_KEY = 'lifetracker.refresh_token';

let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (token: string | null) => {
    accessToken = token;
  },
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefresh: (token: string) => SecureStore.setItemAsync(REFRESH_KEY, token),
  async clear() {
    accessToken = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
