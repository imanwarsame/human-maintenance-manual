import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { MealPlan, MealType } from '../types/index.ts';

export interface AddMealInput {
  date: string;
  meal_type: MealType;
  meal_name: string;
  description?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  prep_notes?: string;
}

export function useMealsForDate(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: () => api.get<MealPlan[]>(`/api/meals?date=${date}`),
  });
}

export function useMealsForDateRange(from: string, to: string) {
  return useQuery({
    queryKey: ['meals', from, to],
    queryFn: () => api.get<MealPlan[]>(`/api/meals?from=${from}&to=${to}`),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: string }>(`/api/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useAddMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMealInput) => api.post<MealPlan>('/api/meals', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
