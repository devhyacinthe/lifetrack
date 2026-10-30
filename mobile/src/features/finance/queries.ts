import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as financeApi from '@/api/finance';
import type {
  CategoryCreatePayload,
  CategoryUpdatePayload,
  TransactionFilters,
  TransactionPayload,
} from '@/api/types';

/** Clés de cache : invalider `transactionLists` rafraîchit toutes les listes filtrées. */
export const financeKeys = {
  accounts: ['finance', 'accounts'] as const,
  categories: ['finance', 'categories'] as const,
  transactions: ['finance', 'transactions'] as const,
  transactionLists: ['finance', 'transactions', 'list'] as const,
  transactionList: (filters: TransactionFilters) =>
    ['finance', 'transactions', 'list', filters] as const,
  transaction: (id: string) => ['finance', 'transactions', 'detail', id] as const,
};

export function useAccounts() {
  return useQuery({ queryKey: financeKeys.accounts, queryFn: financeApi.listAccounts });
}

export function useCategories() {
  return useQuery({ queryKey: financeKeys.categories, queryFn: financeApi.listCategories });
}

/** Liste paginée des transactions, chargée page par page au défilement. */
export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: financeKeys.transactionList(filters),
    queryFn: ({ pageParam }) => financeApi.listTransactions(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    placeholderData: keepPreviousData, // garde la liste affichée pendant un changement de filtre
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: financeKeys.transaction(id ?? ''),
    queryFn: () => financeApi.getTransaction(id as string),
    enabled: Boolean(id),
  });
}

/**
 * Une transaction modifie les listes et le solde des comptes. Le détail n'est pas invalidé :
 * il est mis à jour directement (modification) ou abandonné avec l'écran (suppression).
 */
function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.transactionLists }),
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts }),
    ]);
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => financeApi.createTransaction(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (payload: Partial<TransactionPayload>) => financeApi.updateTransaction(id, payload),
    onSuccess: (transaction) => {
      queryClient.setQueryData(financeKeys.transaction(id), transaction);
      return invalidate();
    },
  });
}

export function useDeleteTransaction(id: string) {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: () => financeApi.deleteTransaction(id),
    onSuccess: invalidate,
  });
}

/** Le nom d'une catégorie apparaît aussi dans les transactions : on rafraîchit les deux. */
function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions }),
    ]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) => financeApi.createCategory(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, ...payload }: CategoryUpdatePayload & { id: string }) =>
      financeApi.updateCategory(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteCategory(id),
    onSuccess: invalidate,
  });
}
