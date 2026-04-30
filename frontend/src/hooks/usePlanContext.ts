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
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['plan-context', vars.key] });
      const prev = qc.getQueryData(['plan-context', vars.key]);
      qc.setQueryData(['plan-context', vars.key], { key: vars.key, value: vars.value });
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      qc.setQueryData(['plan-context', vars.key], ctx?.prev);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['plan-context', vars.key] });
    },
  });
}
