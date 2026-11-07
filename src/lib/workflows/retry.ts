/**
 * Retry policy for workflow runs.
 *
 * Pure functions only: no database, no queue, no clock beyond the `now`
 * argument. The retry service and the API call these, so the policy can be
 * tested without Redis or Postgres.
 *
 * Two different decisions live here:
 * - `planAutoRetry` decides whether the system should schedule another attempt.
 * - `canRetryRun` decides whether a human may retry a failed run.
 *
 * Manual retries are not gated by the failure class: the operator may have
 * fixed the configuration. They are gated by the chain length and a cooldown.
 */

export const DEFAULT_MAX_ATTEMPTS = 3;
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 5 * 60_000;
export const BACKOFF_FACTOR = 4;
export const BACKOFF_JITTER = 0.2;
export const MANUAL_RETRY_COOLDOWN_MS = 30_000;
export const MAX_RETRY_CHAIN = 10;

export type FailureClass = "retryable" | "permanent";

export interface FailureInput {
  message?: string | null;
  status?: number | null;
  code?: string | null;
}

export interface AutoRetryPlan {
  retry: boolean;
  reason: string;
  nextAttempt: number | null;
  delayMs: number | null;
}

export interface ManualRetryState {
  status: string;
  chainLength: number;
  lastRetryAt?: number | null;
}

export interface ManualRetryDecision {
  allowed: boolean;
  reason: string;
}

const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const RETRYABLE_MESSAGE =
  /\b(408|425|429|5\d\d)\b|timeout|timed out|econnreset|econnrefused|etimedout|eai_again|socket hang up|network|temporar|rate limit|too many requests|service unavailable|bad gateway|gateway timeout/i;

// Checked before the retryable patterns: a malformed template is not fixed by
// running it again, even if the message also mentions a network call.
const PERMANENT_MESSAGE =
  /validation|invalid|unauthorized|forbidden|not found|missing (?:token|credential|config|connection)|credential|api key|schema|syntax|parse|template/i;

/**
 * Classifies a failure by HTTP status first, then error code, then message.
 * Unknown failures are permanent on purpose: retrying blindly is how a broken
 * workflow becomes an unbounded loop.
 */
export function classifyFailure(input: FailureInput): FailureClass {
  if (typeof input.status === "number") {
    if (input.status === 408 || input.status === 425 || input.status === 429) return "retryable";
    if (input.status >= 500) return "retryable";
    if (input.status >= 400) return "permanent";
  }

  if (input.code && RETRYABLE_CODES.has(input.code.toUpperCase())) return "retryable";

  const message = input.message ?? "";
  if (PERMANENT_MESSAGE.test(message)) return "permanent";
  if (RETRYABLE_MESSAGE.test(message)) return "retryable";

  return "permanent";
}

/**
 * Exponential backoff for the given attempt number (the attempt that will run
 * next). Attempt 2 waits 2s, attempt 3 waits 8s, attempt 4 waits 32s, capped at
 * 5 minutes. Jitter is +/-20% so retries from many runs do not sync up.
 */
export function backoffDelayMs(attempt: number, options: { random?: () => number } = {}): number {
  const exponent = Math.max(0, attempt - 2);
  const base = Math.min(BASE_BACKOFF_MS * BACKOFF_FACTOR ** exponent, MAX_BACKOFF_MS);
  const random = options.random ?? Math.random;
  const factor = 1 + (random() * 2 - 1) * BACKOFF_JITTER;
  return Math.min(Math.round(base * factor), MAX_BACKOFF_MS);
}

/** Decides whether the system should schedule another attempt. */
export function planAutoRetry({
  attempt,
  failure,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  random,
}: {
  attempt: number;
  failure: FailureInput;
  maxAttempts?: number;
  random?: () => number;
}): AutoRetryPlan {
  const stop = (reason: string): AutoRetryPlan => ({
    retry: false,
    reason,
    nextAttempt: null,
    delayMs: null,
  });

  if (!Number.isFinite(attempt) || attempt < 1) return stop("invalid attempt number");
  if (attempt >= maxAttempts) return stop(`max attempts reached (${maxAttempts})`);
  if (classifyFailure(failure) === "permanent") return stop("failure is not retryable");

  const nextAttempt = attempt + 1;
  return {
    retry: true,
    reason: "retryable failure",
    nextAttempt,
    delayMs: backoffDelayMs(nextAttempt, { random }),
  };
}

/** Decides whether a human may retry a failed run right now. */
export function canRetryRun(run: ManualRetryState, now = Date.now()): ManualRetryDecision {
  if (run.status !== "error") return { allowed: false, reason: "only failed runs can be retried" };
  if (run.chainLength >= MAX_RETRY_CHAIN) {
    return { allowed: false, reason: `retry chain limit reached (${MAX_RETRY_CHAIN})` };
  }

  if (run.lastRetryAt != null) {
    const elapsed = now - run.lastRetryAt;
    if (elapsed < MANUAL_RETRY_COOLDOWN_MS) {
      const seconds = Math.ceil((MANUAL_RETRY_COOLDOWN_MS - elapsed) / 1000);
      return { allowed: false, reason: `retry cooldown active (${seconds}s left)` };
    }
  }

  return { allowed: true, reason: "ok" };
}
