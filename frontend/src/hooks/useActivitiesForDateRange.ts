import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { Activity } from '../types/index.ts';

export function useActivitiesForDateRange(from: string, to: string) {
  return useQuery({
    queryKey: ['activities', from, to],
    queryFn: () => api.get<Activity[]>(`/api/activities?from=${from}&to=${to}`),
  });
}
