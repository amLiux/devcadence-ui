import { resolveTemplates, evaluateExpression, type ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

/** Handles Retry Loop nodes — makes an HTTP request, retries until condition is met or max attempts exhausted. */
export async function handleRetryLoop(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const maxRetries = Math.min(Math.max(parseInt(meta.maxRetries || "3", 10), 1), 10);
  const delayMs = Math.min(Math.max(parseInt(meta.delay || "2", 10), 1), 30) * 1000;
  const condition = meta.condition || "";
  const onFailure = meta.onFailure || "error"; // "error" | "skip" | "abort"

  // Resolve URL
  const url = resolveTemplates(meta.url || "", ancestorChain);
  if (!url) {
    return { success: false, message: "URL is required" };
  }

  const method = (meta.method || "GET").toUpperCase();

  // Resolve headers
  let headers: Record<string, string> = {};
  if (meta.headers) {
    try {
      const resolved = resolveTemplates(meta.headers, ancestorChain);
      headers = JSON.parse(resolved);
    } catch {
      return { success: false, message: "Invalid headers JSON" };
    }
  }

  // Resolve body
  let body: string | undefined;
  if (meta.body) {
    body = resolveTemplates(meta.body, ancestorChain);
  }

  let lastResponse: { status: number; body: unknown } | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fetchOptions: RequestInit = { method, headers };
      if (body && method !== "GET") {
        fetchOptions.body = body;
      }

      const res = await fetch(url, fetchOptions);
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

      lastResponse = { status: res.status, body: responseBody };
      lastError = null;

      // If no condition, succeed on first try
      if (!condition) {
        return {
          success: true,
          message: `${method} ${url} → ${res.status} (attempt ${attempt}/${maxRetries})`,
          data: lastResponse,
        };
      }

      // Evaluate condition against response
      const input = { response: lastResponse, previousStep: ancestorChain?.output };
      const conditionResult = Boolean(evaluateExpression(condition, input));

      if (conditionResult) {
        return {
          success: true,
          message: `Condition met on attempt ${attempt}/${maxRetries} — ${method} ${url} → ${res.status}`,
          data: lastResponse,
        };
      }

      // Condition not met — wait before retry (unless last attempt)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Request failed";
      lastResponse = null;

      // On network error, wait before retry (unless last attempt)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  if (lastResponse) {
    if (onFailure === "skip") {
      return {
        success: true,
        message: `Condition not met after ${maxRetries} attempts — returning last response (skip mode)`,
        data: lastResponse,
      };
    }
    return {
      success: false,
      message: `Condition not met after ${maxRetries} attempts — ${method} ${url} → ${lastResponse.status}`,
      data: lastResponse,
    };
  }

  // All attempts failed with network errors
  if (onFailure === "skip") {
    return {
      success: true,
      message: `All ${maxRetries} attempts failed — returning last error (skip mode)`,
      data: { error: lastError },
    };
  }
  return {
    success: false,
    message: `All ${maxRetries} attempts failed — ${lastError}`,
  };
}
