import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export type ReadinessBand = 'low' | 'moderate' | 'good' | 'prime';

export interface ReadinessComponent {
  metric: string;
  label: string;
  value: number;
  baseline_mean: number | null;
  baseline_n: number | null;
  z: number | null;
  sub_score: number;
  weight: number;
}

export interface ReadinessSummary {
  date: string;
  score: number | null;
  band: ReadinessBand | null;
  confidence: 'low' | 'high';
  incident_modifier: number;
  incident_reason: string | null;
  components: ReadinessComponent[];
  drivers: string[];
}

export function useReadiness() {
  return useQuery({
    queryKey: ['readiness'],
    queryFn: () => api.get<ReadinessSummary>('/api/readiness'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReadinessSeries(from: string, to: string) {
  return useQuery({
    queryKey: ['readiness-series', from, to],
    queryFn: () => api.get<ReadinessSummary[]>(`/api/readiness/series?from=${from}&to=${to}`),
    staleTime: 5 * 60 * 1000,
  });
}
