import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/api/dashboard';
import { DASHBOARD_KEY } from '@/lib/domain-queries';

/**
 * Tableau de bord de l'accueil. Il dépend de plusieurs domaines (finances, sport) : toute
 * écriture confirmée l'invalide (voir lib/domain-queries).
 */
export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: getDashboard });
}
