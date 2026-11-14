import { describe, expect, it } from "vitest";
import { SECRET_PLACEHOLDER, isSecretKey, redactConfig, resolveRedactedConfig } from "./redact";

describe("isSecretKey", () => {
  it.each([
    "password",
    "botToken",
    "patToken",
    "apiKey",
    "api_key",
    "privateKey",
    "clientSecret",
    "authorization",
  ])("treats %s as a secret", (key) => {
    expect(isSecretKey(key)).toBe(true);
  });

  it.each(["tokenType", "expiresAt", "scopes", "host", "port", "email", "model"])(
    "leaves %s readable",
    (key) => {
      expect(isSecretKey(key)).toBe(false);
    },
  );
});

describe("redactConfig", () => {
  it("replaces secret values with the placeholder and keeps the rest", () => {
    expect(
      redactConfig({ host: "db.internal", port: 5432, password: "hunter2" }),
    ).toEqual({
      host: "db.internal",
      port: "5432",
      password: SECRET_PLACEHOLDER,
    });
  });

  it("keeps an empty secret empty so the UI can show 'not configured'", () => {
    expect(redactConfig({ secret: "" })).toEqual({ secret: "" });
  });

  it("drops null and undefined values", () => {
    expect(redactConfig({ host: "db", password: null, secret: undefined })).toEqual({
      host: "db",
    });
  });
});

describe("resolveRedactedConfig", () => {
  it("restores the stored value behind a placeholder", () => {
    expect(
      resolveRedactedConfig(
        { host: "db.internal", password: SECRET_PLACEHOLDER },
        { host: "old", password: "hunter2" },
      ),
    ).toEqual({ host: "db.internal", password: "hunter2" });
  });

  it("accepts a new secret typed by the user", () => {
    expect(
      resolveRedactedConfig({ password: "new-secret" }, { password: "hunter2" }),
    ).toEqual({ password: "new-secret" });
  });

  it("never persists a placeholder without a stored value", () => {
    expect(resolveRedactedConfig({ password: SECRET_PLACEHOLDER }, {})).toEqual({});
  });
});
