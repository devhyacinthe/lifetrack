import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as authApi from '@/api/auth';
import { onSessionExpired, refreshSession } from '@/api/client';
import type { RegisterPayload } from '@/api/types';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  /** Après une suppression de compte : la session est déjà terminée côté serveur. */
  endSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');

  const endSession = useCallback(() => {
    queryClient.clear(); // aucune donnée d'un utilisateur ne doit rester en cache
    setStatus('signedOut');
  }, [queryClient]);

  // Au démarrage : restaure la session à partir du jeton de renouvellement chiffré.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((ok) => !cancelled && setStatus(ok ? 'signedIn' : 'signedOut'))
      .catch(() => {
        // Hors ligne : la session ne peut pas être vérifiée. Le jeton est conservé ;
        // l'écran de connexion s'affiche et l'utilisateur pourra réessayer.
        if (!cancelled) setStatus('signedOut');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onSessionExpired(endSession);
    return () => onSessionExpired(null);
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      async signIn(email, password) {
        await authApi.login(email, password);
        setStatus('signedIn');
      },
      async signUp(payload) {
        await authApi.register(payload);
        await authApi.login(payload.email, payload.password);
        setStatus('signedIn');
      },
      async signOut() {
        try {
          await authApi.logout();
        } catch {
          // Serveur injoignable : les jetons locaux sont déjà effacés (voir logout),
          // l'utilisateur est donc bien déconnecté de cet appareil.
        } finally {
          endSession();
        }
      },
      endSession,
    }),
    [status, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return context;
}
