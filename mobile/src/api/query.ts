/** Construction des requêtes de liste (filtres et pagination de DRF). */
import { apiRequest } from './client';
import type { Paginated } from './types';

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
export async function listAll<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const data = await apiRequest<Paginated<T>>(
      `${path}${toQueryString({ ...params, page, page_size: MAX_PAGE_SIZE })}`,
    );
    items.push(...data.results);
    if (!data.next) return items;
  }
}
