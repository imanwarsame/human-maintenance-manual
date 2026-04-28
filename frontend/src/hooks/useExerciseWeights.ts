import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export interface ExerciseWeight {
  exercise_name: string;
  weight_kg: number;
  updated_at: string;
}

export function useExerciseWeights() {
  return useQuery({
    queryKey: ['exercise-weights'],
    queryFn: () => api.get<ExerciseWeight[]>('/api/exercise-weights'),
  });
}

export function useUpdateExerciseWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weights: { exercise_name: string; weight_kg: number }[]) =>
      api.patch('/api/exercise-weights', { weights }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise-weights'] }),
  });
}
