import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, emailFingerprint, normalizeEmail } from "./rate-limit";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("emailFingerprint", () => {
  it("is deterministic and case-insensitive", () => {
    expect(emailFingerprint("User@Example.com")).toBe(emailFingerprint(" user@example.COM "));
    expect(emailFingerprint("user@example.com")).toHaveLength(64);
  });

  it("differs for different addresses", () => {
    expect(emailFingerprint("a@example.com")).not.toBe(emailFingerprint("b@example.com"));
  });
});

describe("clientIp", () => {
  it("uses the first X-Forwarded-For hop", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.4");
  });

  it("falls back to X-Real-IP and then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("fail-closed Redis behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("REDIS_URL", "redis://127.0.0.1:1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns unavailable instead of falling back to memory", async () => {
    const { checkLoginRateLimit } = await import("./rate-limit");
    const result = await checkLoginRateLimit(
      { ip: "203.0.113.4", email: "user@example.com" },
      { loginMaxAttempts: 5, loginWindowSeconds: 300 },
    );
    expect(result).toEqual({ status: "unavailable" });
  });
});
