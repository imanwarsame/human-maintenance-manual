// Tiny in-memory TTL cache for expensive, read-mostly computed endpoints (e.g. correlations,
// readiness series) on a single-user app where a few minutes of staleness is imperceptible.
// Not for data with a user-facing "log X" mutation that expects an immediate refetch —
// those invalidate their TanStack Query keys client-side and need a real network round-trip.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const cached = store.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await compute();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
