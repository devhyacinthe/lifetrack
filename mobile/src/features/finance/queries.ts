import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as financeApi from '@/api/finance';
import type {
  AccountPayload,
  AccountUpdatePayload,
  BudgetPayload,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  SavingsGoalPayload,
  TransactionFilters,
  TransactionPayload,
  TransferPayload,
} from '@/api/types';
import { createDomainKeys, useDetailQuery, useDomainMutation } from '@/lib/domain-queries';

type Entity = 'accounts' | 'categories' | 'transactions' | 'transfers' | 'budgets' | 'goals';

/** Clés de cache : ['finance', objet, 'list' | 'detail', …] (voir lib/domain-queries). */
export const financeKeys = createDomainKeys<Entity>('finance');

/** Toute écriture invalide les données financières (soldes, budgets, objectifs…). */
function useFinanceMutation<TVariables, TData>(
  entity: Entity,
  mutationFn: (variables: TVariables) => Promise<TData>,
  detailId?: string,
) {
  return useDomainMutation(financeKeys, entity, mutationFn, detailId);
}

function useDetail<T>(entity: Entity, id: string | undefined, fetcher: (id: string) => Promise<T>) {
  return useDetailQuery(financeKeys, entity, id, fetcher);
}

// --- Comptes ----------------------------------------------------------------------------

export function useAccounts() {
  return useQuery({ queryKey: financeKeys.list('accounts'), queryFn: financeApi.listAccounts });
}

export function useAccount(id: string | undefined) {
  return useDetail('accounts', id, financeApi.getAccount);
}

export function useCreateAccount() {
  return useFinanceMutation('accounts', (payload: AccountPayload) =>
    financeApi.createAccount(payload),
  );
}

export function useUpdateAccount(id: string) {
  return useFinanceMutation(
    'accounts',
    (payload: AccountUpdatePayload) => financeApi.updateAccount(id, payload),
    id,
  );
}

export function useDeleteAccount(id: string) {
  return useFinanceMutation<void, void>('accounts', () => financeApi.deleteAccount(id));
}

// --- Catégories ---------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: financeKeys.list('categories'),
    queryFn: financeApi.listCategories,
  });
}

export function useCreateCategory() {
  return useFinanceMutation('categories', (payload: CategoryCreatePayload) =>
    financeApi.createCategory(payload),
  );
}

export function useUpdateCategory() {
  return useFinanceMutation(
    'categories',
    ({ id, ...payload }: CategoryUpdatePayload & { id: string }) =>
      financeApi.updateCategory(id, payload),
  );
}

export function useDeleteCategory() {
  return useFinanceMutation('categories', (id: string) => financeApi.deleteCategory(id));
}

// --- Transactions -------------------------------------------------------------------------

/** Liste paginée des transactions, chargée page par page au défilement. */
export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: financeKeys.list('transactions', filters),
    queryFn: ({ pageParam }) => financeApi.listTransactions(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    placeholderData: keepPreviousData, // garde la liste affichée pendant un changement de filtre
  });
}

export function useTransaction(id: string | undefined) {
  return useDetail('transactions', id, financeApi.getTransaction);
}

export function useCreateTransaction() {
  return useFinanceMutation('transactions', (payload: TransactionPayload) =>
    financeApi.createTransaction(payload),
  );
}

export function useUpdateTransaction(id: string) {
  return useFinanceMutation(
    'transactions',
    (payload: Partial<TransactionPayload>) => financeApi.updateTransaction(id, payload),
    id,
  );
}

export function useDeleteTransaction(id: string) {
  return useFinanceMutation<void, void>('transactions', () => financeApi.deleteTransaction(id));
}

// --- Transferts ---------------------------------------------------------------------------

export function useTransfers() {
  return useInfiniteQuery({
    queryKey: financeKeys.list('transfers'),
    queryFn: ({ pageParam }) => financeApi.listTransfers(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
  });
}

export function useTransfer(id: string | undefined) {
  return useDetail('transfers', id, financeApi.getTransfer);
}

export function useCreateTransfer() {
  return useFinanceMutation('transfers', (payload: TransferPayload) =>
    financeApi.createTransfer(payload),
  );
}

export function useUpdateTransfer(id: string) {
  return useFinanceMutation(
    'transfers',
    (payload: Partial<TransferPayload>) => financeApi.updateTransfer(id, payload),
    id,
  );
}

export function useDeleteTransfer(id: string) {
  return useFinanceMutation<void, void>('transfers', () => financeApi.deleteTransfer(id));
}

// --- Budgets ------------------------------------------------------------------------------

export function useBudgets() {
  return useQuery({ queryKey: financeKeys.list('budgets'), queryFn: financeApi.listBudgets });
}

export function useBudget(id: string | undefined) {
  return useDetail('budgets', id, financeApi.getBudget);
}

export function useCreateBudget() {
  return useFinanceMutation('budgets', (payload: BudgetPayload) =>
    financeApi.createBudget(payload),
  );
}

export function useUpdateBudget(id: string) {
  return useFinanceMutation(
    'budgets',
    (payload: Partial<BudgetPayload>) => financeApi.updateBudget(id, payload),
    id,
  );
}

export function useDeleteBudget(id: string) {
  return useFinanceMutation<void, void>('budgets', () => financeApi.deleteBudget(id));
}

// --- Objectifs d'épargne ------------------------------------------------------------------

export function useGoals() {
  return useQuery({ queryKey: financeKeys.list('goals'), queryFn: financeApi.listGoals });
}

export function useGoal(id: string | undefined) {
  return useDetail('goals', id, financeApi.getGoal);
}

export function useCreateGoal() {
  return useFinanceMutation('goals', (payload: SavingsGoalPayload) =>
    financeApi.createGoal(payload),
  );
}

export function useUpdateGoal(id: string) {
  return useFinanceMutation(
    'goals',
    (payload: Partial<SavingsGoalPayload>) => financeApi.updateGoal(id, payload),
    id,
  );
}

export function useDeleteGoal(id: string) {
  return useFinanceMutation<void, void>('goals', () => financeApi.deleteGoal(id));
}
