import { describe, it, expect } from "vitest";
import {
  BASE_BACKOFF_MS,
  DEFAULT_MAX_ATTEMPTS,
  MANUAL_RETRY_COOLDOWN_MS,
  MAX_BACKOFF_MS,
  MAX_RETRY_CHAIN,
  backoffDelayMs,
  canRetryRun,
  classifyFailure,
  planAutoRetry,
} from "./retry";

const fixedRandom = () => 0.5; // no jitter

describe("classifyFailure", () => {
  it("treats rate limits, timeouts and 5xx as retryable", () => {
    expect(classifyFailure({ status: 429 })).toBe("retryable");
    expect(classifyFailure({ status: 408 })).toBe("retryable");
    expect(classifyFailure({ status: 500 })).toBe("retryable");
    expect(classifyFailure({ status: 503 })).toBe("retryable");
  });

  it("treats other 4xx as permanent", () => {
    expect(classifyFailure({ status: 400 })).toBe("permanent");
    expect(classifyFailure({ status: 401 })).toBe("permanent");
    expect(classifyFailure({ status: 404 })).toBe("permanent");
  });

  it("uses the error code when there is no status", () => {
    expect(classifyFailure({ code: "ECONNRESET" })).toBe("retryable");
    expect(classifyFailure({ code: "econnrefused" })).toBe("retryable");
  });

  it("reads the status out of the message when there is no structured status", () => {
    expect(classifyFailure({ message: "HTTP 503 from provider" })).toBe("retryable");
    expect(classifyFailure({ message: "Request timed out" })).toBe("retryable");
  });

  it("does not retry validation or template errors", () => {
    expect(classifyFailure({ message: "Invalid template {{foo}}" })).toBe("permanent");
    expect(classifyFailure({ message: "Missing API key" })).toBe("permanent");
    expect(classifyFailure({ message: "Unauthorized" })).toBe("permanent");
  });

  it("defaults unknown failures to permanent", () => {
    expect(classifyFailure({ message: "something odd happened" })).toBe("permanent");
    expect(classifyFailure({})).toBe("permanent");
  });
});

describe("backoffDelayMs", () => {
  it("grows exponentially from the second attempt", () => {
    expect(backoffDelayMs(2, { random: fixedRandom })).toBe(BASE_BACKOFF_MS);
    expect(backoffDelayMs(3, { random: fixedRandom })).toBe(BASE_BACKOFF_MS * 4);
    expect(backoffDelayMs(4, { random: fixedRandom })).toBe(BASE_BACKOFF_MS * 16);
  });

  it("caps the delay at five minutes", () => {
    expect(backoffDelayMs(20, { random: fixedRandom })).toBe(MAX_BACKOFF_MS);
  });

  it("applies jitter within 20 percent", () => {
    expect(backoffDelayMs(2, { random: () => 0 })).toBe(Math.round(BASE_BACKOFF_MS * 0.8));
    expect(backoffDelayMs(2, { random: () => 1 })).toBe(Math.round(BASE_BACKOFF_MS * 1.2));
  });
});

describe("planAutoRetry", () => {
  it("schedules the next attempt for a retryable failure", () => {
    const plan = planAutoRetry({
      attempt: 1,
      failure: { status: 503 },
      random: fixedRandom,
    });
    expect(plan).toEqual({
      retry: true,
      reason: "retryable failure",
      nextAttempt: 2,
      delayMs: BASE_BACKOFF_MS,
    });
  });

  it("stops when the attempt budget is exhausted", () => {
    const plan = planAutoRetry({
      attempt: DEFAULT_MAX_ATTEMPTS,
      failure: { status: 503 },
    });
    expect(plan.retry).toBe(false);
    expect(plan.reason).toContain("max attempts");
    expect(plan.nextAttempt).toBeNull();
  });

  it("stops for a permanent failure", () => {
    const plan = planAutoRetry({ attempt: 1, failure: { status: 400 } });
    expect(plan.retry).toBe(false);
    expect(plan.reason).toBe("failure is not retryable");
  });

  it("stops when automatic retries are disabled", () => {
    const plan = planAutoRetry({ attempt: 1, failure: { status: 503 }, enabled: false });
    expect(plan.retry).toBe(false);
    expect(plan.reason).toBe("automatic retries are disabled");
  });

  it("rejects an invalid attempt number", () => {
    expect(planAutoRetry({ attempt: 0, failure: { status: 503 } }).retry).toBe(false);
  });
});

describe("canRetryRun", () => {
  const now = 1_000_000;

  it("allows a failed run", () => {
    expect(canRetryRun({ status: "error", chainLength: 1 }, now)).toEqual({
      allowed: true,
      reason: "ok",
    });
  });

  it("rejects runs that are not failed", () => {
    expect(canRetryRun({ status: "success", chainLength: 1 }, now).allowed).toBe(false);
    expect(canRetryRun({ status: "running", chainLength: 1 }, now).allowed).toBe(false);
  });

  it("rejects a chain that reached the limit", () => {
    const decision = canRetryRun({ status: "error", chainLength: MAX_RETRY_CHAIN }, now);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("chain limit");
  });

  it("enforces the cooldown", () => {
    const decision = canRetryRun(
      { status: "error", chainLength: 1, lastRetryAt: now - 1_000 },
      now,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("cooldown");
  });

  it("allows retrying after the cooldown", () => {
    const decision = canRetryRun(
      { status: "error", chainLength: 1, lastRetryAt: now - MANUAL_RETRY_COOLDOWN_MS - 1 },
      now,
    );
    expect(decision.allowed).toBe(true);
  });

  it("honors a custom chain limit and cooldown", () => {
    expect(canRetryRun({ status: "error", chainLength: 3 }, now, { maxChain: 3 }).allowed).toBe(
      false,
    );
    expect(
      canRetryRun(
        { status: "error", chainLength: 1, lastRetryAt: now - 5_000 },
        now,
        { cooldownMs: 1_000 },
      ).allowed,
    ).toBe(true);
  });
});
