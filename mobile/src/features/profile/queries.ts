import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as authApi from '@/api/auth';
import type { ChangePasswordPayload, ProfileUpdatePayload } from '@/api/types';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: authApi.getMe });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => authApi.updateMe(payload),
    onSuccess: (user) => {
      // Le profil renvoyé par le backend fait foi : il remplace le cache.
      queryClient.setQueryData(meQueryKey, user);
      // La devise préférée et le fuseau horaire changent statistiques et tableau de bord.
      return queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
    },
  });
}

export function useChangePassword(email: string) {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authApi.changePassword(email, payload),
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: (password: string) => authApi.deleteAccount(password) });
}
