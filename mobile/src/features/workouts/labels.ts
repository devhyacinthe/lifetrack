/** Libellés français et icônes du suivi sportif (présentation uniquement). */
import type { WorkoutGoalMetric, WorkoutGoalPeriod } from '@/api/types';

/** Icônes des activités créées par défaut ; les autres reçoivent une icône générique. */
const ACTIVITY_ICONS: Record<string, string> = {
  'Course à pied': 'run',
  Marche: 'walk',
  Vélo: 'bike',
  Natation: 'swim',
  Musculation: 'dumbbell',
  Football: 'soccer',
  Basketball: 'basketball',
  Yoga: 'yoga',
  Danse: 'dance-ballroom',
};

export function activityIcon(name: string): string {
  return ACTIVITY_ICONS[name] ?? 'arm-flex-outline';
}

/** Intensité perçue (échelle de 1 à 10). */
export function intensityLabel(intensity: number): string {
  if (intensity <= 3) return 'Légère';
  if (intensity <= 6) return 'Modérée';
  if (intensity <= 8) return 'Soutenue';
  return 'Maximale';
}

export const METRIC_LABELS: Record<WorkoutGoalMetric, string> = {
  sessions: 'Séances',
  duration: 'Durée',
  distance: 'Distance',
};

export const METRIC_ICONS: Record<WorkoutGoalMetric, string> = {
  sessions: 'calendar-check-outline',
  duration: 'timer-outline',
  distance: 'map-marker-distance',
};

export const METRICS = Object.keys(METRIC_LABELS) as WorkoutGoalMetric[];

export const GOAL_PERIOD_LABELS: Record<WorkoutGoalPeriod, string> = {
  weekly: 'Par semaine',
  monthly: 'Par mois',
};

export const GOAL_PERIODS = Object.keys(GOAL_PERIOD_LABELS) as WorkoutGoalPeriod[];
