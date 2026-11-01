import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type {
  ActivityTypePayload,
  ActivityTypeUpdatePayload,
  FinishWorkoutPayload,
  StartWorkoutPayload,
  WorkoutFilters,
  WorkoutGoalPayload,
  WorkoutGoalPeriod,
  WorkoutPayload,
} from '@/api/types';
import * as workoutsApi from '@/api/workouts';
import { createDomainKeys, useDetailQuery, useDomainMutation } from '@/lib/domain-queries';

type Entity = 'activities' | 'sessions' | 'goals' | 'stats';

/** Clés de cache : ['workouts', objet, 'list' | 'detail', …] (voir lib/domain-queries). */
export const workoutKeys = createDomainKeys<Entity>('workouts');

/** Toute écriture invalide les données sportives (une séance change stats et objectifs). */
function useWorkoutMutation<TVariables, TData>(
  entity: Entity,
  mutationFn: (variables: TVariables) => Promise<TData>,
  detailId?: string,
) {
  return useDomainMutation(workoutKeys, entity, mutationFn, detailId);
}

// --- Activités -----------------------------------------------------------------------------

export function useActivities() {
  return useQuery({
    queryKey: workoutKeys.list('activities'),
    queryFn: workoutsApi.listActivities,
  });
}

export function useCreateActivity() {
  return useWorkoutMutation('activities', (payload: ActivityTypePayload) =>
    workoutsApi.createActivity(payload),
  );
}

export function useUpdateActivity() {
  return useWorkoutMutation(
    'activities',
    ({ id, ...payload }: ActivityTypeUpdatePayload & { id: string }) =>
      workoutsApi.updateActivity(id, payload),
  );
}

export function useDeleteActivity() {
  return useWorkoutMutation('activities', (id: string) => workoutsApi.deleteActivity(id));
}

// --- Séances -------------------------------------------------------------------------------

/** Historique paginé des séances, chargé page par page au défilement. */
export function useSessions(filters: WorkoutFilters) {
  return useInfiniteQuery({
    queryKey: workoutKeys.list('sessions', filters),
    queryFn: ({ pageParam }) => workoutsApi.listSessions(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useSession(id: string | undefined) {
  return useDetailQuery(workoutKeys, 'sessions', id, workoutsApi.getSession);
}

/** Séance passée, saisie directement terminée. */
export function useCreateSession() {
  return useWorkoutMutation('sessions', (payload: WorkoutPayload) =>
    workoutsApi.createSession(payload),
  );
}

/** Séance en cours (au plus une), mise en avant sur l'onglet Sport. */
export function useOngoingSession() {
  return useQuery({
    queryKey: workoutKeys.list('sessions', 'ongoing'),
    queryFn: workoutsApi.getOngoingSession,
  });
}

/** Démarre une séance « en cours » (refusé par le backend si une autre est en cours). */
export function useStartSession() {
  return useWorkoutMutation('sessions', (payload: StartWorkoutPayload) =>
    workoutsApi.createSession(payload),
  );
}

export function useFinishSession(id: string) {
  return useWorkoutMutation(
    'sessions',
    (payload: FinishWorkoutPayload) => workoutsApi.finishSession(id, payload),
    id,
  );
}

export function useUpdateSession(id: string) {
  return useWorkoutMutation(
    'sessions',
    (payload: Partial<WorkoutPayload>) => workoutsApi.updateSession(id, payload),
    id,
  );
}

export function useDeleteSession(id: string) {
  return useWorkoutMutation<void, void>('sessions', () => workoutsApi.deleteSession(id));
}

// --- Objectifs -------------------------------------------------------------------------------

export function useWorkoutGoals() {
  return useQuery({
    queryKey: workoutKeys.list('goals'),
    queryFn: workoutsApi.listWorkoutGoals,
  });
}

export function useWorkoutGoal(id: string | undefined) {
  return useDetailQuery(workoutKeys, 'goals', id, workoutsApi.getWorkoutGoal);
}

export function useCreateWorkoutGoal() {
  return useWorkoutMutation('goals', (payload: WorkoutGoalPayload) =>
    workoutsApi.createWorkoutGoal(payload),
  );
}

export function useUpdateWorkoutGoal(id: string) {
  return useWorkoutMutation(
    'goals',
    (payload: Partial<WorkoutGoalPayload>) => workoutsApi.updateWorkoutGoal(id, payload),
    id,
  );
}

export function useDeleteWorkoutGoal(id: string) {
  return useWorkoutMutation<void, void>('goals', () => workoutsApi.deleteWorkoutGoal(id));
}

// --- Statistiques ----------------------------------------------------------------------------

export function useWorkoutStats(period: WorkoutGoalPeriod) {
  return useQuery({
    queryKey: workoutKeys.list('stats', period),
    queryFn: () => workoutsApi.getWorkoutStats(period),
    placeholderData: keepPreviousData,
  });
}
