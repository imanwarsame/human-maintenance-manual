import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { TodaySummary, CoachingNote } from '../types/index.ts';

export function useToday() {
  return useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<TodaySummary>('/api/today'),
  });
}

export function useCoachingNote() {
  return useQuery({
    queryKey: ['coaching-note-today'],
    queryFn: () => api.get<CoachingNote | null>('/api/coaching-note/today'),
  });
}

export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount_ml: number) => api.post('/api/hydration', { amount_ml }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['hydration'] });
    },
  });
}

export function useMarkMealEaten() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealId: string) => api.post(`/api/meals/${mealId}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useLogDeviation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      body,
    }: {
      mealId: string;
      body: {
        description: string;
        deviation_type: string;
        kcal?: number;
        protein_g?: number;
      };
    }) => api.post(`/api/meals/${mealId}/deviation`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });
}
