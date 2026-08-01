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

export function useWeeklyNote() {
  return useQuery({
    queryKey: ['coaching-note-weekly'],
    queryFn: () => api.get<CoachingNote | null>('/api/coaching-note/weekly'),
  });
}

export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount_ml, date }: { amount_ml: number; date: string }) =>
      api.post('/api/hydration', { amount_ml, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'hydration',
      });
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

