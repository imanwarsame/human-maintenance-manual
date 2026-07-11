import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export interface VolumeByMuscle {
  muscle_group: string;
  volume: number;
  sets: number;
}

export interface ExerciseHistoryEntry {
  date: string;
  weight_kg: number;
}

export interface ExerciseHistory {
  name: string;
  pr_kg: number;
  history: ExerciseHistoryEntry[];
}

export interface RunTimeEntry {
  date: string;
  elapsed_secs: number;
  distance_km: number;
}

export interface BodyWeightEntry {
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
}

export interface WellnessEntry {
  date: string;
  sleep_duration_mins: number | null;
  sleep_score: number | null;
  resting_hr: number | null;
  hrv: number | null;
  vo2_max: number | null;
  steps: number | null;
}

export interface ProgressData {
  weeklyVolume: VolumeByMuscle[];
  exerciseHistory: ExerciseHistory[];
  runTimes: RunTimeEntry[];
  bodyWeight: BodyWeightEntry[];
  wellness: WellnessEntry[];
}

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get<ProgressData>('/api/progress'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      date: string;
      weight_kg: number;
      body_fat_pct?: number | null;
      muscle_mass_kg?: number | null;
    }) => api.post<unknown>('/api/body-weight', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
