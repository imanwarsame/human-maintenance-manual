import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export function usePlanContext<T = unknown>(key: string) {
  return useQuery({
    queryKey: ['plan-context', key],
    queryFn: () => api.get<{ key: string; value: T }>(`/api/plan-context?key=${key}`),
  });
}

export function useUpdatePlanContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { key: string; value: unknown }) =>
      api.put<unknown>('/api/plan-context', body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['plan-context', vars.key] });
    },
  });
}
