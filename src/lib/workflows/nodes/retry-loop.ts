import { resolveTemplates, evaluateExpression, type ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult, LogEntry } from "./types";

interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  condition: string;
  onFailure: string;
}

interface AttemptRecord {
  attempt: number;
  status: number | null;
  body: unknown;
  error: string | null;
  delayMs: number;
}

interface AttemptResponse {
  status: number;
  body: unknown;
  elapsedMs: number;
}

function parseConfig(meta: Record<string, string>): RetryConfig {
  return {
    maxRetries: Math.min(Math.max(parseInt(meta.maxRetries || "3", 10), 1), 10),
    delayMs: Math.min(Math.max(parseInt(meta.delay || "2", 10), 1), 30) * 1000,
    condition: meta.condition || "",
    onFailure: meta.onFailure || "error",
  };
}

function parseHeaders(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Record<string, string> | null {
  if (!meta.headers) return {};
  try {
    return JSON.parse(resolveTemplates(meta.headers, ancestorChain));
  } catch {
    return null;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response.text();

  try {
    return await response.json();
  } catch {
    return response.text();
  }
}

async function performAttempt({
  url,
  method,
  headers,
  body,
}: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}): Promise<AttemptResponse> {
  const options: RequestInit = { method, headers };
  if (body && method !== "GET") options.body = body;

  const startedAt = Date.now();
  const response = await fetch(url, options);
  return {
    status: response.status,
    body: await readResponseBody(response),
    elapsedMs: Date.now() - startedAt,
  };
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function finalResult({
  lastResponse,
  lastError,
  config,
  attempts,
  logs,
  log,
}: {
  lastResponse: { status: number; body: unknown } | null;
  lastError: string | null;
  config: RetryConfig;
  attempts: AttemptRecord[];
  logs: LogEntry[];
  log: (type: LogEntry["type"], message: string) => void;
}): NodeHandlerResult {
  if (lastResponse) {
    const message = `Condition not met after ${config.maxRetries} attempts — last response: ${lastResponse.status}`;
    log("error", message);
    if (config.onFailure === "skip") {
      log("success", "onFailure=skip — returning last response");
      return {
        success: true,
        message,
        data: { response: lastResponse, attempts },
        logs,
      };
    }
    return {
      success: false,
      message,
      data: { response: lastResponse, attempts },
      logs,
    };
  }

  const message = `All ${config.maxRetries} attempts failed — ${lastError}`;
  log("error", message);
  if (config.onFailure === "skip") {
    log("success", "onFailure=skip — returning last error");
    return { success: true, message, data: { error: lastError, attempts }, logs };
  }
  return { success: false, message, data: { error: lastError, attempts }, logs };
}

function attemptResult({
  response,
  attempt,
  config,
  method,
  url,
  ancestorChain,
  attempts,
  logs,
  log,
}: {
  response: AttemptResponse;
  attempt: number;
  config: RetryConfig;
  method: string;
  url: string;
  ancestorChain?: ContextStep;
  attempts: AttemptRecord[];
  logs: LogEntry[];
  log: (type: LogEntry["type"], message: string) => void;
}): NodeHandlerResult | null {
  const lastResponse = { status: response.status, body: response.body };

  log(
    response.status < 400 ? "success" : "error",
    `Attempt ${attempt}/${config.maxRetries} — ${method} ${url} → ${response.status} (${response.elapsedMs}ms)`,
  );
  attempts.push({
    attempt,
    status: response.status,
    body: response.body,
    error: null,
    delayMs: 0,
  });

  if (!config.condition) {
    log("success", `No condition set — request succeeded on attempt ${attempt}`);
    return {
      success: true,
      message: `${method} ${url} → ${response.status} (attempt ${attempt}/${config.maxRetries})`,
      data: { response: lastResponse, attempts },
      logs,
    };
  }

  const conditionMet = Boolean(
    evaluateExpression(config.condition, {
      response: lastResponse,
      previousStep: ancestorChain?.output,
    }),
  );
  if (conditionMet) {
    log("success", `Condition met on attempt ${attempt}/${config.maxRetries}`);
    return {
      success: true,
      message: `Condition met on attempt ${attempt}/${config.maxRetries}`,
      data: { response: lastResponse, attempts },
      logs,
    };
  }

  log("warning", "Condition not met — will retry");
  return null;
}

function parseRequest(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): { method: string; headers: Record<string, string>; body?: string } | null {
  const headers = parseHeaders(meta, ancestorChain);
  if (!headers) return null;

  return {
    method: (meta.method || "GET").toUpperCase(),
    headers,
    body: meta.body ? resolveTemplates(meta.body, ancestorChain) : undefined,
  };
}

function logStart(
  log: (type: LogEntry["type"], message: string) => void,
  config: RetryConfig,
  method: string,
  url: string,
): void {
  log("info", `Starting Retry Loop — ${method} ${url} (max ${config.maxRetries} retries)`);
  if (config.condition) log("info", `Condition: ${config.condition}`);
}

/** Handles Retry Loop nodes — makes an HTTP request, retries until condition is met or max attempts exhausted. */
export async function handleRetryLoop(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
  onLog?: (entry: LogEntry) => void,
): Promise<NodeHandlerResult> {
  const config = parseConfig(meta);
  const url = resolveTemplates(meta.url || "", ancestorChain);
  if (!url) {
    return { success: false, message: "URL is required" };
  }

  const request = parseRequest(meta, ancestorChain);
  if (!request) {
    return { success: false, message: "Invalid headers JSON" };
  }
  const { method, headers, body } = request;

  const logs: LogEntry[] = [];
  const attempts: AttemptRecord[] = [];
  const log = (type: LogEntry["type"], message: string) => {
    const entry: LogEntry = { type, message, timestamp: new Date().toISOString() };
    logs.push(entry);
    onLog?.(entry);
  };

  logStart(log, config, method, url);

  let lastResponse: { status: number; body: unknown } | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await performAttempt({ url, method, headers, body });
      lastResponse = { status: response.status, body: response.body };
      lastError = null;

      const result = attemptResult({
        response,
        attempt,
        config,
        method,
        url,
        ancestorChain,
        attempts,
        logs,
        log,
      });
      if (result) return result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";
      lastResponse = null;
      log("error", `Attempt ${attempt}/${config.maxRetries} — network error: ${lastError}`);
      attempts.push({ attempt, status: null, body: null, error: lastError, delayMs: 0 });
    }

    if (attempt < config.maxRetries) {
      log(
        "info",
        `Waiting ${config.delayMs / 1000}s before retry ${attempt + 1}/${config.maxRetries}...`,
      );
      attempts[attempts.length - 1].delayMs = config.delayMs;
      await wait(config.delayMs);
    }
  }

  return finalResult({ lastResponse, lastError, config, attempts, logs, log });
}
