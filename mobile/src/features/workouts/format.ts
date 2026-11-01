/**
 * Formatage du suivi sportif : durées, distances, dates et heures locales.
 *
 * Les séances sont enregistrées en UTC par le backend et affichées dans le fuseau du
 * téléphone ; les valeurs numériques ne sont converties en nombre que pour l'affichage.
 */
import type { Decimal, WorkoutGoalMetric } from '@/api/types';
import { toIsoDate } from '@/utils/dates';

/** 2700 → « 45 min » ; 5400 → « 1 h 30 » ; 3600 → « 1 h ». */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return seconds > 0 && totalMinutes === 0 ? `${seconds} s` : `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`;
}

/** Durée en secondes → champs du formulaire (heures et minutes). */
export function splitDuration(seconds: number): { hours: string; minutes: string } {
  const totalMinutes = Math.round(seconds / 60);
  return { hours: String(Math.floor(totalMinutes / 60)), minutes: String(totalMinutes % 60) };
}

/** « 8.50 » → « 8,5 km ». */
export function formatDistance(km: Decimal): string {
  const value = Number(km);
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`;
}

/** Instant ISO → date locale YYYY-MM-DD (regroupement des séances par jour). */
export function localDateOf(iso: string): string {
  return toIsoDate(new Date(iso));
}

/** Instant ISO → heure locale « 07:05 ». */
export function localTimeOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Date (YYYY-MM-DD) et heure (HH:MM) locales → instant ISO 8601 en UTC pour l'API. */
export function toStartedAt(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

/** Valeur d'un objectif (cible ou atteinte) dans l'unité de sa mesure. */
export function formatMetricValue(metric: WorkoutGoalMetric, value: Decimal): string {
  const number = Number(value);
  if (metric === 'sessions') return `${number} séance${number > 1 ? 's' : ''}`;
  if (metric === 'duration') return formatDuration(number);
  return formatDistance(value);
}

/** Secondes écoulées depuis le début d'une séance (jamais négatives). */
export function elapsedSeconds(startedAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000));
}

/** Chronomètre : « 12:05 » ou « 1:02:05 ». */
export function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const mmss = `${String(minutes).padStart(hours ? 2 : 1, '0')}:${String(secs).padStart(2, '0')}`;
  return hours ? `${hours}:${mmss}` : mmss;
}
