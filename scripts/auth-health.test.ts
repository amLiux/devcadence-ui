// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveAuthHealthTarget } from "./auth-health";

describe("resolveAuthHealthTarget", () => {
  it("skips when auth is disabled or unset", () => {
    expect(resolveAuthHealthTarget({})).toEqual({ kind: "disabled" });
    expect(resolveAuthHealthTarget({ AUTH_MODE: "disabled" })).toEqual({ kind: "disabled" });
  });

  it("checks the OIDC issuer health endpoint with a discovery fallback", () => {
    const target = resolveAuthHealthTarget({
      AUTH_MODE: "oidc",
      AUTH_OIDC_ISSUER: "https://iam.example.com/",
    });
    expect(target).toEqual({
      kind: "check",
      mode: "oidc",
      healthUrl: "https://iam.example.com/health",
      fallbackUrl: "https://iam.example.com/.well-known/openid-configuration",
    });
  });

  it("checks the Hortus API health endpoint", () => {
    const target = resolveAuthHealthTarget({
      AUTH_MODE: "hortus",
      AUTH_API_URL: "http://127.0.0.1:8099/",
    });
    expect(target).toEqual({
      kind: "check",
      mode: "hortus",
      healthUrl: "http://127.0.0.1:8099/health",
    });
  });

  it("returns a useful error when the mode is enabled without a URL", () => {
    expect(resolveAuthHealthTarget({ AUTH_MODE: "oidc" })).toEqual({
      kind: "error",
      message: "AUTH_OIDC_ISSUER is not set but AUTH_MODE=oidc.",
    });
    expect(resolveAuthHealthTarget({ AUTH_MODE: "hortus" })).toEqual({
      kind: "error",
      message: "AUTH_API_URL is not set but AUTH_MODE=hortus.",
    });
  });

  it("rejects unknown modes", () => {
    expect(resolveAuthHealthTarget({ AUTH_MODE: "saml" })).toEqual({
      kind: "error",
      message: 'Unknown AUTH_MODE "saml". Use disabled, oidc or hortus.',
    });
  });
});
