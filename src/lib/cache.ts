// Simple in-memory cache with TTL for API responses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheEntry = { data: any; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheGet<T = any>(key: string): { data: T; cached: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { data: entry.data as T, cached: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheSet(key: string, data: any, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheKey(parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}

export function cacheClear(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}
