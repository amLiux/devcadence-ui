import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import { resolveTemplates } from "@/lib/workflow-context";
import { isCacheEnabled, resolveCacheTtl } from "./http-cache";
import type { NodeHandlerResult } from "./types";

async function parseResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return await res.text();
    }
  }
  return await res.text();
}

/**
 * Handles HTTP Request nodes.
 *
 * Responses are cached only when the node opts in via `cacheEnabled` and the
 * method is GET. The TTL comes from `cacheTtl` (seconds) and is part of the
 * cache key, so two nodes with different TTLs never share an entry.
 */
export async function handleHttpRequest(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const url = resolveTemplates(meta.url || "", ancestorChain);
  if (!url) {
    return { success: false, message: "URL is required" };
  }

  const method = (meta.method || "GET").toUpperCase();
  let headers: Record<string, string> = {};
  if (meta.headers) {
    try {
      const resolved = resolveTemplates(meta.headers, ancestorChain);
      headers = JSON.parse(resolved);
    } catch {
      return { success: false, message: "Invalid headers JSON" };
    }
  }

  const shouldCache = method === "GET" && isCacheEnabled(meta);
  const ttlSeconds = resolveCacheTtl(meta.cacheTtl);
  let cacheKeyStr: string | null = null;

  if (shouldCache) {
    cacheKeyStr = cacheKey(["http", url, JSON.stringify(headers), String(ttlSeconds)]);
    const cached = cacheGet(cacheKeyStr);
    if (cached) {
      return {
        success: true,
        message: `${method} ${url} → 200 (cached)`,
        data: cached.data,
      };
    }
  }

  const res = await fetch(url, { method, headers });
  const wrappedResponse = { status: res.status, body: await parseResponseBody(res) };

  if (shouldCache && cacheKeyStr && res.ok) {
    cacheSet(cacheKeyStr, wrappedResponse, ttlSeconds * 1000);
  }

  return {
    success: res.ok,
    message: `${method} ${url} → ${res.status}`,
    data: wrappedResponse,
  };
}
