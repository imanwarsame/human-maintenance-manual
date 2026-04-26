import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { Activity } from '../types/index.ts';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => api.get<Activity[]>('/api/activities'),
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      date: string;
      type: string;
      duration_mins?: number;
      distance_km?: number;
      avg_hr?: number;
      notes?: string;
    }) => api.post<Activity>('/api/activities', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
