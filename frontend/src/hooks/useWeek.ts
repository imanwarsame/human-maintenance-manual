import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { WeekSummary } from '../types/index.ts';

export function useWeek() {
  return useQuery({
    queryKey: ['week'],
    queryFn: () => api.get<WeekSummary>('/api/week'),
  });
}
