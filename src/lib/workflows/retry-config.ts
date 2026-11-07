import { z } from "zod";
import {
  BASE_BACKOFF_MS,
  DEFAULT_MAX_ATTEMPTS,
  MANUAL_RETRY_COOLDOWN_MS,
  MAX_RETRY_CHAIN,
} from "./retry";

/** Effective retry policy. Stored globally; workflows may override it later. */
export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
  manualCooldownMs: number;
  maxChain: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  enabled: true,
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  baseDelayMs: BASE_BACKOFF_MS,
  manualCooldownMs: MANUAL_RETRY_COOLDOWN_MS,
  maxChain: MAX_RETRY_CHAIN,
};

export const RETRY_POLICY_LIMITS = {
  maxAttempts: { min: 1, max: 10 },
  baseDelayMs: { min: 0, max: 5 * 60_000 },
  manualCooldownMs: { min: 0, max: 5 * 60_000 },
  maxChain: { min: 1, max: 50 },
} as const;

const policySchema = z.object({
  enabled: z.boolean(),
  maxAttempts: z.coerce
    .number()
    .int()
    .min(RETRY_POLICY_LIMITS.maxAttempts.min, "Max attempts must be between 1 and 10")
    .max(RETRY_POLICY_LIMITS.maxAttempts.max, "Max attempts must be between 1 and 10"),
  baseDelayMs: z.coerce
    .number()
    .int()
    .min(RETRY_POLICY_LIMITS.baseDelayMs.min, "Base delay must be between 0 and 300 seconds")
    .max(RETRY_POLICY_LIMITS.baseDelayMs.max, "Base delay must be between 0 and 300 seconds"),
  manualCooldownMs: z.coerce
    .number()
    .int()
    .min(RETRY_POLICY_LIMITS.manualCooldownMs.min, "Cooldown must be between 0 and 300 seconds")
    .max(RETRY_POLICY_LIMITS.manualCooldownMs.max, "Cooldown must be between 0 and 300 seconds"),
  maxChain: z.coerce
    .number()
    .int()
    .min(RETRY_POLICY_LIMITS.maxChain.min, "Max chain must be between 1 and 50")
    .max(RETRY_POLICY_LIMITS.maxChain.max, "Max chain must be between 1 and 50"),
});

export type ParseRetryPolicyResult =
  | { ok: true; value: RetryPolicy }
  | { ok: false; error: string };

/** Validates a settings payload without touching the database. */
export function parseRetryPolicy(body: unknown): ParseRetryPolicyResult {
  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid retry settings" };
  }
  return { ok: true, value: parsed.data };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

/** Merges a stored row with the code defaults, clamping anything out of range. */
export function resolveRetryPolicy(stored?: Partial<RetryPolicy> | null): RetryPolicy {
  if (!stored) return DEFAULT_RETRY_POLICY;

  return {
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : DEFAULT_RETRY_POLICY.enabled,
    maxAttempts: clampInt(
      stored.maxAttempts,
      RETRY_POLICY_LIMITS.maxAttempts.min,
      RETRY_POLICY_LIMITS.maxAttempts.max,
      DEFAULT_RETRY_POLICY.maxAttempts,
    ),
    baseDelayMs: clampInt(
      stored.baseDelayMs,
      RETRY_POLICY_LIMITS.baseDelayMs.min,
      RETRY_POLICY_LIMITS.baseDelayMs.max,
      DEFAULT_RETRY_POLICY.baseDelayMs,
    ),
    manualCooldownMs: clampInt(
      stored.manualCooldownMs,
      RETRY_POLICY_LIMITS.manualCooldownMs.min,
      RETRY_POLICY_LIMITS.manualCooldownMs.max,
      DEFAULT_RETRY_POLICY.manualCooldownMs,
    ),
    maxChain: clampInt(
      stored.maxChain,
      RETRY_POLICY_LIMITS.maxChain.min,
      RETRY_POLICY_LIMITS.maxChain.max,
      DEFAULT_RETRY_POLICY.maxChain,
    ),
  };
}
