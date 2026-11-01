/** Endpoints du suivi sportif (/api/v1/workouts/…). */
import { apiRequest } from './client';
import { listAll, toQueryString } from './query';
import type {
  ActivityType,
  ActivityTypePayload,
  ActivityTypeUpdatePayload,
  FinishWorkoutPayload,
  Paginated,
  StartWorkoutPayload,
  Workout,
  WorkoutFilters,
  WorkoutGoal,
  WorkoutGoalPayload,
  WorkoutGoalPeriod,
  WorkoutPayload,
  WorkoutStats,
} from './types';

// Activités

/** Toutes les activités, actives ou non (les inactives restent utiles pour l'historique). */
export function listActivities(): Promise<ActivityType[]> {
  return listAll<ActivityType>('/workouts/activities/');
}

export function createActivity(payload: ActivityTypePayload): Promise<ActivityType> {
  return apiRequest<ActivityType>('/workouts/activities/', { method: 'POST', body: payload });
}

export function updateActivity(
  id: string,
  payload: ActivityTypeUpdatePayload,
): Promise<ActivityType> {
  return apiRequest<ActivityType>(`/workouts/activities/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

/** Lève une ApiError 409 si l'activité est utilisée : il faut alors la désactiver. */
export function deleteActivity(id: string): Promise<void> {
  return apiRequest<void>(`/workouts/activities/${id}/`, { method: 'DELETE' });
}

// Séances

export const SESSIONS_PAGE_SIZE = 20;

export function listSessions(filters: WorkoutFilters, page: number): Promise<Paginated<Workout>> {
  return apiRequest<Paginated<Workout>>(
    `/workouts/sessions/${toQueryString({ ...filters, page, page_size: SESSIONS_PAGE_SIZE })}`,
  );
}

export function getSession(id: string): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/sessions/${id}/`);
}

export function createSession(payload: WorkoutPayload | StartWorkoutPayload): Promise<Workout> {
  return apiRequest<Workout>('/workouts/sessions/', { method: 'POST', body: payload });
}

export function updateSession(id: string, payload: Partial<WorkoutPayload>): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/sessions/${id}/`, { method: 'PATCH', body: payload });
}

/** Termine une séance en cours (refusé si elle est déjà terminée). */
export function finishSession(id: string, payload: FinishWorkoutPayload): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/sessions/${id}/finish/`, {
    method: 'POST',
    body: payload,
  });
}

/** Séance en cours (au plus une), ou null. */
export async function getOngoingSession(): Promise<Workout | null> {
  const page = await apiRequest<Paginated<Workout>>(
    `/workouts/sessions/${toQueryString({ status: 'in_progress', page_size: 1 })}`,
  );
  return page.results[0] ?? null;
}

export function deleteSession(id: string): Promise<void> {
  return apiRequest<void>(`/workouts/sessions/${id}/`, { method: 'DELETE' });
}

// Objectifs (progression calculée pour la période en cours)

export function listWorkoutGoals(): Promise<WorkoutGoal[]> {
  return listAll<WorkoutGoal>('/workouts/goals/');
}

export function getWorkoutGoal(id: string): Promise<WorkoutGoal> {
  return apiRequest<WorkoutGoal>(`/workouts/goals/${id}/`);
}

export function createWorkoutGoal(payload: WorkoutGoalPayload): Promise<WorkoutGoal> {
  return apiRequest<WorkoutGoal>('/workouts/goals/', { method: 'POST', body: payload });
}

export function updateWorkoutGoal(
  id: string,
  payload: Partial<WorkoutGoalPayload>,
): Promise<WorkoutGoal> {
  return apiRequest<WorkoutGoal>(`/workouts/goals/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteWorkoutGoal(id: string): Promise<void> {
  return apiRequest<void>(`/workouts/goals/${id}/`, { method: 'DELETE' });
}

// Statistiques (calculées par le backend, dans le fuseau de l'utilisateur)

export function getWorkoutStats(period: WorkoutGoalPeriod): Promise<WorkoutStats> {
  return apiRequest<WorkoutStats>(`/workouts/stats/${toQueryString({ period })}`);
}
