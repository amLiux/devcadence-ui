export const DEFAULT_CACHE_TTL_SECONDS = 300;
export const MIN_CACHE_TTL_SECONDS = 1;
export const MAX_CACHE_TTL_SECONDS = 86400;

/** Reads the cache checkbox. Only the literal "true" enables caching. */
export function isCacheEnabled(meta: Record<string, string>): boolean {
  return meta.cacheEnabled === "true";
}

/** Parses the cache TTL (seconds) and clamps it to the supported range. */
export function resolveCacheTtl(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_CACHE_TTL_SECONDS;
  return Math.min(MAX_CACHE_TTL_SECONDS, Math.max(MIN_CACHE_TTL_SECONDS, parsed));
}
