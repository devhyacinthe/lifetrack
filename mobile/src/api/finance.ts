/** Endpoints financiers (/api/v1/finance/…). */
import { apiRequest } from './client';
import { listAll, toQueryString } from './query';
import type {
  Account,
  AccountPayload,
  AccountUpdatePayload,
  Budget,
  BudgetPayload,
  Category,
  CategoryCreatePayload,
  CategoryStats,
  CategoryUpdatePayload,
  MonthlyStats,
  Paginated,
  SavingsGoal,
  SavingsGoalPayload,
  Transaction,
  TransactionFilters,
  TransactionPayload,
  TransactionType,
  Transfer,
  TransferPayload,
} from './types';

export { toQueryString };

// Comptes

/** Tous les comptes, archivés compris, avec leur solde calculé par le backend. */
export function listAccounts(): Promise<Account[]> {
  return listAll<Account>('/finance/accounts/');
}

export function getAccount(id: string): Promise<Account> {
  return apiRequest<Account>(`/finance/accounts/${id}/`);
}

export function createAccount(payload: AccountPayload): Promise<Account> {
  return apiRequest<Account>('/finance/accounts/', { method: 'POST', body: payload });
}

export function updateAccount(id: string, payload: AccountUpdatePayload): Promise<Account> {
  return apiRequest<Account>(`/finance/accounts/${id}/`, { method: 'PATCH', body: payload });
}

/** Lève une ApiError 409 si le compte a des opérations ou un objectif : il faut l'archiver. */
export function deleteAccount(id: string): Promise<void> {
  return apiRequest<void>(`/finance/accounts/${id}/`, { method: 'DELETE' });
}

// Catégories

/** Toutes les catégories, actives ou non (les inactives restent utiles pour l'historique). */
export function listCategories(): Promise<Category[]> {
  return listAll<Category>('/finance/categories/');
}

export function createCategory(payload: CategoryCreatePayload): Promise<Category> {
  return apiRequest<Category>('/finance/categories/', { method: 'POST', body: payload });
}

export function updateCategory(id: string, payload: CategoryUpdatePayload): Promise<Category> {
  return apiRequest<Category>(`/finance/categories/${id}/`, { method: 'PATCH', body: payload });
}

/** Lève une ApiError 409 si la catégorie est utilisée : il faut alors la désactiver. */
export function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/finance/categories/${id}/`, { method: 'DELETE' });
}

// Transactions

export const TRANSACTIONS_PAGE_SIZE = 20;

export function listTransactions(
  filters: TransactionFilters,
  page: number,
): Promise<Paginated<Transaction>> {
  return apiRequest<Paginated<Transaction>>(
    `/finance/transactions/${toQueryString({ ...filters, page, page_size: TRANSACTIONS_PAGE_SIZE })}`,
  );
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/finance/transactions/${id}/`);
}

export function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  return apiRequest<Transaction>('/finance/transactions/', { method: 'POST', body: payload });
}

export function updateTransaction(
  id: string,
  payload: Partial<TransactionPayload>,
): Promise<Transaction> {
  return apiRequest<Transaction>(`/finance/transactions/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/finance/transactions/${id}/`, { method: 'DELETE' });
}

// Transferts

export const TRANSFERS_PAGE_SIZE = 20;

export function listTransfers(page: number): Promise<Paginated<Transfer>> {
  return apiRequest<Paginated<Transfer>>(
    `/finance/transfers/${toQueryString({ page, page_size: TRANSFERS_PAGE_SIZE })}`,
  );
}

export function getTransfer(id: string): Promise<Transfer> {
  return apiRequest<Transfer>(`/finance/transfers/${id}/`);
}

export function createTransfer(payload: TransferPayload): Promise<Transfer> {
  return apiRequest<Transfer>('/finance/transfers/', { method: 'POST', body: payload });
}

export function updateTransfer(id: string, payload: Partial<TransferPayload>): Promise<Transfer> {
  return apiRequest<Transfer>(`/finance/transfers/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteTransfer(id: string): Promise<void> {
  return apiRequest<void>(`/finance/transfers/${id}/`, { method: 'DELETE' });
}

// Budgets (consommation calculée pour la période en cours, dans le fuseau de l'utilisateur)

export function listBudgets(): Promise<Budget[]> {
  return listAll<Budget>('/finance/budgets/');
}

export function getBudget(id: string): Promise<Budget> {
  return apiRequest<Budget>(`/finance/budgets/${id}/`);
}

export function createBudget(payload: BudgetPayload): Promise<Budget> {
  return apiRequest<Budget>('/finance/budgets/', { method: 'POST', body: payload });
}

export function updateBudget(id: string, payload: Partial<BudgetPayload>): Promise<Budget> {
  return apiRequest<Budget>(`/finance/budgets/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteBudget(id: string): Promise<void> {
  return apiRequest<void>(`/finance/budgets/${id}/`, { method: 'DELETE' });
}

// Objectifs d'épargne (progression = solde du compte rattaché)

export function listGoals(): Promise<SavingsGoal[]> {
  return listAll<SavingsGoal>('/finance/goals/');
}

export function getGoal(id: string): Promise<SavingsGoal> {
  return apiRequest<SavingsGoal>(`/finance/goals/${id}/`);
}

export function createGoal(payload: SavingsGoalPayload): Promise<SavingsGoal> {
  return apiRequest<SavingsGoal>('/finance/goals/', { method: 'POST', body: payload });
}

export function updateGoal(id: string, payload: Partial<SavingsGoalPayload>): Promise<SavingsGoal> {
  return apiRequest<SavingsGoal>(`/finance/goals/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteGoal(id: string): Promise<void> {
  return apiRequest<void>(`/finance/goals/${id}/`, { method: 'DELETE' });
}

// Statistiques (calculées par le backend, dans la devise préférée par défaut)

/** Revenus, dépenses et solde des `months` derniers mois, du plus ancien au plus récent. */
export function getMonthlyStats(months: number): Promise<MonthlyStats> {
  return apiRequest<MonthlyStats>(`/finance/stats/monthly/${toQueryString({ months })}`);
}

/** Répartition par catégorie du mois en cours. */
export function getCategoryStats(type: TransactionType): Promise<CategoryStats> {
  return apiRequest<CategoryStats>(
    `/finance/stats/categories/${toQueryString({ type, period: 'monthly' })}`,
  );
}
