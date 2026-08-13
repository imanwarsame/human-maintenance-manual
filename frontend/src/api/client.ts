import { supabase } from '../supabaseClient.ts';
import { isDemoMode } from '../demo/mode.ts';
import { handleDemoRequest } from '../demo/router.ts';

const BASE = import.meta.env.VITE_API_URL as string ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (isDemoMode()) {
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    return handleDemoRequest<T>(path, init.method ?? 'GET', body);
  }

  const authHeader = await getAuthHeader();
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${resp.status}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
