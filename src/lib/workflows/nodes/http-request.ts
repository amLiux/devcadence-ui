import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

/** Handles HTTP Request nodes — fetches a URL with caching for GET requests. */
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

  // Cache GET requests for 5 minutes
  if (method === "GET") {
    const cacheKeyStr = cacheKey(["http", url, JSON.stringify(headers)]);
    const cached = cacheGet(cacheKeyStr);
    if (cached) {
      return {
        success: true,
        message: `${method} ${url} → 200 (cached)`,
        data: cached.data,
      };
    }

    const res = await fetch(url, { method, headers });
    let responseBody: unknown;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseBody = await res.json();
      } catch {
        responseBody = await res.text();
      }
    } else {
      responseBody = await res.text();
    }

    const wrappedResponse = { status: res.status, body: responseBody };
    if (res.ok) {
      cacheSet(cacheKeyStr, wrappedResponse);
    }
    return {
      success: res.ok,
      message: `${method} ${url} → ${res.status}`,
      data: wrappedResponse,
    };
  }

  // Non-GET: no caching
  const res = await fetch(url, { method, headers });
  let responseBody: unknown;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      responseBody = await res.json();
    } catch {
      responseBody = await res.text();
    }
  } else {
    responseBody = await res.text();
  }
  return {
    success: res.ok,
    message: `${method} ${url} → ${res.status}`,
    data: { status: res.status, body: responseBody },
  };
}
