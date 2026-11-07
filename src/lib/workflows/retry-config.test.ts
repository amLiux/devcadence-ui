import { describe, it, expect } from "vitest";
import {
  DEFAULT_RETRY_POLICY,
  parseRetryPolicy,
  resolveRetryPolicy,
} from "./retry-config";

describe("resolveRetryPolicy", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(resolveRetryPolicy(null)).toEqual(DEFAULT_RETRY_POLICY);
    expect(resolveRetryPolicy(undefined)).toEqual(DEFAULT_RETRY_POLICY);
  });

  it("keeps valid stored values", () => {
    const policy = resolveRetryPolicy({
      enabled: false,
      maxAttempts: 5,
      baseDelayMs: 4_000,
      manualCooldownMs: 60_000,
      maxChain: 20,
    });

    expect(policy).toEqual({
      enabled: false,
      maxAttempts: 5,
      baseDelayMs: 4_000,
      manualCooldownMs: 60_000,
      maxChain: 20,
    });
  });

  it("clamps values that are out of range", () => {
    const policy = resolveRetryPolicy({
      enabled: true,
      maxAttempts: 99,
      baseDelayMs: -1,
      manualCooldownMs: 10 * 60_000,
      maxChain: 0,
    });

    expect(policy.maxAttempts).toBe(10);
    expect(policy.baseDelayMs).toBe(0);
    expect(policy.manualCooldownMs).toBe(5 * 60_000);
    expect(policy.maxChain).toBe(1);
  });

  it("falls back per field when a value is not a number", () => {
    const policy = resolveRetryPolicy({ maxAttempts: Number.NaN });

    expect(policy.maxAttempts).toBe(DEFAULT_RETRY_POLICY.maxAttempts);
  });
});

describe("parseRetryPolicy", () => {
  const valid = {
    enabled: true,
    maxAttempts: 3,
    baseDelayMs: 2_000,
    manualCooldownMs: 30_000,
    maxChain: 10,
  };

  it("accepts a valid payload", () => {
    expect(parseRetryPolicy(valid)).toEqual({ ok: true, value: valid });
  });

  it("coerces numeric strings", () => {
    const result = parseRetryPolicy({ ...valid, maxAttempts: "4", baseDelayMs: "1000" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.maxAttempts).toBe(4);
      expect(result.value.baseDelayMs).toBe(1_000);
    }
  });

  it("rejects an out-of-range attempt budget", () => {
    expect(parseRetryPolicy({ ...valid, maxAttempts: 0 }).ok).toBe(false);
    expect(parseRetryPolicy({ ...valid, maxAttempts: 11 }).ok).toBe(false);
  });

  it("rejects a negative delay", () => {
    const result = parseRetryPolicy({ ...valid, baseDelayMs: -1 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Base delay");
  });

  it("rejects a non-object body", () => {
    expect(parseRetryPolicy(null).ok).toBe(false);
    expect(parseRetryPolicy("nope").ok).toBe(false);
  });
});
