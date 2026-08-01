import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export type AcwrBand = 'undertrained' | 'optimal' | 'caution' | 'high_risk';

export interface DailyLoad {
  date: string;
  load: number;
  sessions: number;
}

export interface TrainingLoadSummary {
  date: string;
  acute_7d: number;
  chronic_28d_weekly: number;
  acwr: number | null;
  acwr_ewma: number | null;
  band: AcwrBand | null;
  monotony: number | null;
  strain: number | null;
  daily_loads: DailyLoad[];
  chronic_days_available: number;
  confidence: 'low' | 'high';
  projected: { acwr_next_7d: number | null; planned_load: number };
}

export function useTrainingLoad() {
  return useQuery({
    queryKey: ['training-load'],
    queryFn: () => api.get<TrainingLoadSummary>('/api/training-load'),
    staleTime: 5 * 60 * 1000,
  });
}
