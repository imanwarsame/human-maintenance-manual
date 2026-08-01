import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export interface CorrelationResult {
  x: string;
  y: string;
  label: string;
  lag_days: number;
  n: number;
  r: number | null;
  p_adjusted: number | null;
  significant: boolean;
  reason: string | null;
}

export function useCorrelations() {
  return useQuery({
    queryKey: ['correlations'],
    queryFn: () => api.get<CorrelationResult[]>('/api/correlations'),
    staleTime: 60 * 60 * 1000,
  });
}
