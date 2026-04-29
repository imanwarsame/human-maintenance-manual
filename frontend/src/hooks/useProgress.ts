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
}

export interface ProgressData {
  weeklyVolume: VolumeByMuscle[];
  exerciseHistory: ExerciseHistory[];
  runTimes: RunTimeEntry[];
  bodyWeight: BodyWeightEntry[];
}

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get<ProgressData>('/progress'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, weight_kg }: { date: string; weight_kg: number }) =>
      api.post<unknown>('/body-weight', { date, weight_kg }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
