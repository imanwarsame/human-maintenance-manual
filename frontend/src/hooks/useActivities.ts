import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { Activity } from '../types/index.ts';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => api.get<Activity[]>('/api/activities'),
  });
}

export function useDismissPlannedActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
