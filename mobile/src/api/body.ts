/** Endpoints des mesures corporelles (/api/v1/body/…). */
import { apiRequest } from './client';
import { listAll, toQueryString } from './query';
import type {
  Measurement,
  MeasurementPayload,
  MetricSeries,
  MetricType,
  MetricTypePayload,
  MetricTypeUpdatePayload,
  Paginated,
} from './types';

// Types de mesure

/** Tous les types, actifs ou non, avec leur dernière valeur (calculée par le backend). */
export function listMetricTypes(): Promise<MetricType[]> {
  return listAll<MetricType>('/body/metric-types/');
}

export function getMetricType(id: string): Promise<MetricType> {
  return apiRequest<MetricType>(`/body/metric-types/${id}/`);
}

export function createMetricType(payload: MetricTypePayload): Promise<MetricType> {
  return apiRequest<MetricType>('/body/metric-types/', { method: 'POST', body: payload });
}

/** L'unité est refusée (400) si des mesures existent déjà. */
export function updateMetricType(
  id: string,
  payload: MetricTypeUpdatePayload,
): Promise<MetricType> {
  return apiRequest<MetricType>(`/body/metric-types/${id}/`, { method: 'PATCH', body: payload });
}

/** Lève une ApiError 409 si le type est utilisé : il faut alors le désactiver. */
export function deleteMetricType(id: string): Promise<void> {
  return apiRequest<void>(`/body/metric-types/${id}/`, { method: 'DELETE' });
}

/** Valeurs des `months` derniers mois calendaires (mois en cours compris). */
export function getMetricSeries(id: string, months: number): Promise<MetricSeries> {
  return apiRequest<MetricSeries>(`/body/metric-types/${id}/series/${toQueryString({ months })}`);
}

// Mesures

export const MEASUREMENTS_PAGE_SIZE = 20;

export function listMeasurements(
  metricType: string,
  page: number,
): Promise<Paginated<Measurement>> {
  return apiRequest<Paginated<Measurement>>(
    `/body/measurements/${toQueryString({ metric_type: metricType, page, page_size: MEASUREMENTS_PAGE_SIZE })}`,
  );
}

export function getMeasurement(id: string): Promise<Measurement> {
  return apiRequest<Measurement>(`/body/measurements/${id}/`);
}

/** Refusé (400 sur `date`) si une mesure de ce type existe déjà ce jour-là. */
export function createMeasurement(payload: MeasurementPayload): Promise<Measurement> {
  return apiRequest<Measurement>('/body/measurements/', { method: 'POST', body: payload });
}

export function updateMeasurement(
  id: string,
  payload: Partial<MeasurementPayload>,
): Promise<Measurement> {
  return apiRequest<Measurement>(`/body/measurements/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteMeasurement(id: string): Promise<void> {
  return apiRequest<void>(`/body/measurements/${id}/`, { method: 'DELETE' });
}
