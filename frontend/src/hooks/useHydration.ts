import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';
import type { HydrationLog, HydrationSummary } from '../types/index.ts';

export function useHydrationForDate(date: string) {
  return useQuery({
    queryKey: ['hydration', date],
    queryFn: () => api.get<HydrationSummary>(`/api/hydration?date=${date}`),
  });
}

export function useHydrationForDateRange(from: string, to: string) {
  return useQuery({
    queryKey: ['hydration', from, to],
    queryFn: () => api.get<HydrationLog[]>(`/api/hydration?from=${from}&to=${to}`),
  });
}
