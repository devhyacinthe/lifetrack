/** Endpoint du tableau de bord (/api/v1/dashboard/). */
import { apiRequest } from './client';
import type { Dashboard } from './types';

/** Indicateurs du mois en cours, calculés par le backend dans le fuseau de l'utilisateur. */
export function getDashboard(): Promise<Dashboard> {
  return apiRequest<Dashboard>('/dashboard/');
}
