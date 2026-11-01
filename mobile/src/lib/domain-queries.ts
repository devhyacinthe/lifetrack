/**
 * Clés de cache et invalidation communes aux domaines (finance, workouts…).
 *
 * Clés : [domaine, objet, 'list' | 'detail', …]. Une écriture dans un domaine a souvent des
 * effets en chaîne (une transaction change soldes, budgets et objectifs ; une séance change
 * statistiques et objectifs) : tout le domaine est donc invalidé. Les listes affichées sont
 * rechargées tout de suite ; les détails sont seulement marqués périmés et rechargés à leur
 * prochaine ouverture : l'écran d'un objet qui vient d'être supprimé ne le redemande pas au
 * backend (pas de 404).
 */
import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type DomainKeys<Entity extends string> = {
  all: readonly [string];
  list: (entity: Entity, ...params: unknown[]) => readonly unknown[];
  detail: (entity: Entity, id: string) => readonly unknown[];
};

export function createDomainKeys<Entity extends string>(domain: string): DomainKeys<Entity> {
  return {
    all: [domain] as const,
    list: (entity, ...params) => [domain, entity, 'list', ...params] as const,
    detail: (entity, id) => [domain, entity, 'detail', id] as const,
  };
}

const isDetailKey = (key: QueryKey) => key[2] === 'detail';

/**
 * Tableau de bord de l'accueil : il agrège plusieurs domaines (finances, sport), il est
 * donc invalidé après toute écriture, quel que soit le domaine.
 */
export const DASHBOARD_KEY = ['dashboard'] as const;

/** Mutation qui, une fois confirmée par le backend, invalide tout le domaine et l'accueil. */
export function useDomainMutation<Entity extends string, TVariables, TData>(
  keys: DomainKeys<Entity>,
  entity: Entity,
  mutationFn: (variables: TVariables) => Promise<TData>,
  /** Objet modifié : son détail est remplacé par la réponse du backend. */
  detailId?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (detailId && data !== undefined) {
        queryClient.setQueryData(keys.detail(entity, detailId), data);
      }
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: keys.all,
          predicate: (query) => !isDetailKey(query.queryKey),
        }),
        queryClient.invalidateQueries({
          queryKey: keys.all,
          predicate: (query) => isDetailKey(query.queryKey),
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
      ]);
    },
  });
}

/** Détail d'un objet, chargé seulement quand son identifiant est connu. */
export function useDetailQuery<Entity extends string, T>(
  keys: DomainKeys<Entity>,
  entity: Entity,
  id: string | undefined,
  fetcher: (id: string) => Promise<T>,
) {
  return useQuery({
    queryKey: keys.detail(entity, id ?? ''),
    queryFn: () => fetcher(id as string),
    enabled: Boolean(id),
  });
}
