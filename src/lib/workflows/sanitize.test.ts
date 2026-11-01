import { describe, it, expect } from "vitest";
import { sanitize } from "./sanitize";

describe("sanitize", () => {
  it("redacts secret-looking keys at the top level", () => {
    const result = sanitize({ user: "ana", password: "hunter2", apiKey: "abc" });

    expect(result.sanitized).toEqual({ user: "ana", password: "[REDACTED]", apiKey: "[REDACTED]" });
    expect(result.redactedCount).toBe(2);
    expect(result.redactedPaths).toEqual(["password", "apiKey"]);
  });

  it("redacts secret keys nested inside objects and arrays", () => {
    const result = sanitize({
      connections: [
        { name: "a", config: { token: "t1" } },
        { name: "b", config: { secret: "s1" } },
      ],
    });

    expect(result.sanitized).toEqual({
      connections: [
        { name: "a", config: { token: "[REDACTED]" } },
        { name: "b", config: { secret: "[REDACTED]" } },
      ],
    });
    expect(result.redactedPaths).toEqual(["connections[0].config.token", "connections[1].config.secret"]);
  });

  it("normalizes key casing and dashes when matching secrets", () => {
    const result = sanitize({ "X-Api-Key": "k", Authorization: "Bearer x", ACCESS_KEY: "a" });

    expect(result.sanitized).toEqual({
      "X-Api-Key": "[REDACTED]",
      Authorization: "[REDACTED]",
      ACCESS_KEY: "[REDACTED]",
    });
  });

  it("leaves non-secret data untouched by default", () => {
    const payload = { email: "ana@example.com", phone: "555-123-4567" };

    expect(sanitize(payload).sanitized).toEqual(payload);
  });

  it("redacts PII in strict mode", () => {
    const result = sanitize({ email: "ana@example.com", phone: "555-123-4567" }, true);

    expect(result.sanitized).toEqual({ email: "[REDACTED]", phone: "[REDACTED]" });
    expect(result.redactedCount).toBe(2);
  });

  it("returns primitives and null as-is", () => {
    expect(sanitize("plain").sanitized).toBe("plain");
    expect(sanitize(42).sanitized).toBe(42);
    expect(sanitize(null).sanitized).toBeNull();
    expect(sanitize(undefined).sanitized).toBeUndefined();
  });
});
