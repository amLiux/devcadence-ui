import { resolveTemplates, evaluateExpression, type ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult, LogEntry } from "./types";

/** Handles Retry Loop nodes — makes an HTTP request, retries until condition is met or max attempts exhausted. */
export async function handleRetryLoop(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
  onLog?: (entry: LogEntry) => void,
): Promise<NodeHandlerResult> {
  const maxRetries = Math.min(Math.max(parseInt(meta.maxRetries || "3", 10), 1), 10);
  const delayMs = Math.min(Math.max(parseInt(meta.delay || "2", 10), 1), 30) * 1000;
  const condition = meta.condition || "";
  const onFailure = meta.onFailure || "error";

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

  let body: string | undefined;
  if (meta.body) {
    body = resolveTemplates(meta.body, ancestorChain);
  }

  const now = () => new Date().toISOString();
  const logs: LogEntry[] = [];
  const attempts: { attempt: number; status: number | null; body: unknown; error: string | null; delayMs: number }[] = [];

  const log = (type: LogEntry["type"], message: string) => {
    const entry: LogEntry = { type, message, timestamp: now() };
    logs.push(entry);
    onLog?.(entry);
  };

  log("info", `Starting Retry Loop — ${method} ${url} (max ${maxRetries} retries)`);
  if (condition) {
    log("info", `Condition: ${condition}`);
  }

  let lastResponse: { status: number; body: unknown } | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fetchOptions: RequestInit = { method, headers };
      if (body && method !== "GET") {
        fetchOptions.body = body;
      }

      const t0 = Date.now();
      const res = await fetch(url, fetchOptions);
      const elapsed = Date.now() - t0;

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

      const statusColor = res.status < 400 ? "success" : "error";
      log(statusColor, `Attempt ${attempt}/${maxRetries} — ${method} ${url} → ${res.status} (${elapsed}ms)`);

      attempts.push({ attempt, status: res.status, body: responseBody, error: null, delayMs: 0 });

      if (!condition) {
        log("success", `No condition set — request succeeded on attempt ${attempt}`);
        return {
          success: true,
          message: `${method} ${url} → ${res.status} (attempt ${attempt}/${maxRetries})`,
          data: { response: lastResponse, attempts },
          logs,
        };
      }

      const input = { response: lastResponse, previousStep: ancestorChain?.output };
      const conditionResult = Boolean(evaluateExpression(condition, input));

      if (conditionResult) {
        log("success", `Condition met on attempt ${attempt}/${maxRetries}`);
        return {
          success: true,
          message: `Condition met on attempt ${attempt}/${maxRetries}`,
          data: { response: lastResponse, attempts },
          logs,
        };
      }

      log("warning", `Condition not met — will retry`);

      if (attempt < maxRetries) {
        log("info", `Waiting ${delayMs / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
        attempts[attempts.length - 1].delayMs = delayMs;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Request failed";
      lastResponse = null;

      log("error", `Attempt ${attempt}/${maxRetries} — network error: ${lastError}`);

      attempts.push({ attempt, status: null, body: null, error: lastError, delayMs: 0 });

      if (attempt < maxRetries) {
        log("info", `Waiting ${delayMs / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
        attempts[attempts.length - 1].delayMs = delayMs;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  if (lastResponse) {
    const msg = `Condition not met after ${maxRetries} attempts — last response: ${lastResponse.status}`;
    log("error", msg);
    if (onFailure === "skip") {
      log("success", `onFailure=skip — returning last response`);
      return {
        success: true,
        message: msg,
        data: { response: lastResponse, attempts },
        logs,
      };
    }
    return {
      success: false,
      message: msg,
      data: { response: lastResponse, attempts },
      logs,
    };
  }

  const msg = `All ${maxRetries} attempts failed — ${lastError}`;
  log("error", msg);
  if (onFailure === "skip") {
    log("success", `onFailure=skip — returning last error`);
    return {
      success: true,
      message: msg,
      data: { error: lastError, attempts },
      logs,
    };
  }
  return {
    success: false,
    message: msg,
    data: { error: lastError, attempts },
    logs,
  };
}
