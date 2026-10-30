/** Endpoints financiers (/api/v1/finance/…). */
import { apiRequest } from './client';
import type {
  Account,
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  Paginated,
  Transaction,
  TransactionFilters,
  TransactionPayload,
} from './types';

type QueryValue = string | number | boolean | undefined | null;

/** Construit la chaîne de requête en ignorant les valeurs vides. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Taille maximale d'une page côté backend. */
const MAX_PAGE_SIZE = 100;

/** Parcourt toutes les pages d'une liste (listes courtes : comptes, catégories). */
async function listAll<T>(path: string, params: Record<string, QueryValue> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const data = await apiRequest<Paginated<T>>(
      `${path}${toQueryString({ ...params, page, page_size: MAX_PAGE_SIZE })}`,
    );
    items.push(...data.results);
    if (!data.next) return items;
  }
}

// Comptes (lecture seule en phase 7 ; gestion complète en phase 8)

export function listAccounts(): Promise<Account[]> {
  return listAll<Account>('/finance/accounts/');
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
