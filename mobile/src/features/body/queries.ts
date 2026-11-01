import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as bodyApi from '@/api/body';
import type { MeasurementPayload, MetricTypePayload, MetricTypeUpdatePayload } from '@/api/types';
import { createDomainKeys, useDetailQuery, useDomainMutation } from '@/lib/domain-queries';

type Entity = 'types' | 'measurements' | 'series';

/** Clés de cache : ['body', objet, 'list' | 'detail', …] (voir lib/domain-queries). */
export const bodyKeys = createDomainKeys<Entity>('body');

/** Mois couverts par la courbe d'une mesure (choix de l'utilisateur en phase 11). */
export const SERIES_MONTHS = 6;

/** Toute écriture invalide les mesures (dernière valeur, séries, historique). */
function useBodyMutation<TVariables, TData>(
  entity: Entity,
  mutationFn: (variables: TVariables) => Promise<TData>,
  detailId?: string,
) {
  return useDomainMutation(bodyKeys, entity, mutationFn, detailId);
}

// --- Types de mesure ---------------------------------------------------------------------

export function useMetricTypes() {
  return useQuery({ queryKey: bodyKeys.list('types'), queryFn: bodyApi.listMetricTypes });
}

export function useMetricType(id: string | undefined) {
  return useDetailQuery(bodyKeys, 'types', id, bodyApi.getMetricType);
}

export function useCreateMetricType() {
  return useBodyMutation('types', (payload: MetricTypePayload) =>
    bodyApi.createMetricType(payload),
  );
}

export function useUpdateMetricType() {
  return useBodyMutation('types', ({ id, ...payload }: MetricTypeUpdatePayload & { id: string }) =>
    bodyApi.updateMetricType(id, payload),
  );
}

export function useDeleteMetricType() {
  return useBodyMutation('types', (id: string) => bodyApi.deleteMetricType(id));
}

/** Valeurs des 6 derniers mois, pour la courbe. */
export function useMetricSeries(id: string | undefined) {
  return useQuery({
    queryKey: bodyKeys.list('series', id, SERIES_MONTHS),
    queryFn: () => bodyApi.getMetricSeries(id as string, SERIES_MONTHS),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

// --- Mesures -------------------------------------------------------------------------------

/** Historique paginé d'un type, de la plus récente à la plus ancienne. */
export function useMeasurements(metricType: string | undefined) {
  return useInfiniteQuery({
    queryKey: bodyKeys.list('measurements', metricType),
    queryFn: ({ pageParam }) => bodyApi.listMeasurements(metricType as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    enabled: Boolean(metricType),
  });
}

export function useMeasurement(id: string | undefined) {
  return useDetailQuery(bodyKeys, 'measurements', id, bodyApi.getMeasurement);
}

export function useCreateMeasurement() {
  return useBodyMutation('measurements', (payload: MeasurementPayload) =>
    bodyApi.createMeasurement(payload),
  );
}

export function useUpdateMeasurement(id: string) {
  return useBodyMutation(
    'measurements',
    (payload: Partial<MeasurementPayload>) => bodyApi.updateMeasurement(id, payload),
    id,
  );
}

export function useDeleteMeasurement(id: string) {
  return useBodyMutation<void, void>('measurements', () => bodyApi.deleteMeasurement(id));
}
