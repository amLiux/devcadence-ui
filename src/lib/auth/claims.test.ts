import { describe, expect, it } from "vitest";
import type { AuthConfig } from "./config";
import { extractProfile, hasRole, resolveRole } from "./claims";
import type { IdTokenClaims } from "./oidc";

const config: AuthConfig = {
  issuer: "https://iam.test",
  clientId: "client",
  clientSecret: "secret",
  sessionSecret: "secret",
  redirectUri: "http://localhost:3000/api/auth/callback",
  appUrl: "http://localhost:3000",
  scopes: "openid",
  sessionTtlSeconds: 3600,
  transactionTtlSeconds: 600,
  adminEmails: ["boss@test.com"],
  adminGroups: ["platform-admins"],
  trustEmail: false,
  bootstrapFirstUser: true,
  upstreamLogout: false,
};

const baseClaims: IdTokenClaims = {
  iss: "https://iam.test",
  sub: "abc",
  aud: "client",
  exp: 9999999999,
  iat: 1,
  email: "User@Test.com",
  email_verified: true,
  given_name: "Ada",
  family_name: "Lovelace",
};

describe("extractProfile", () => {
  it("normalizes email and builds a display name", () => {
    const profile = extractProfile(baseClaims, null);
    expect(profile.email).toBe("user@test.com");
    expect(profile.name).toBe("Ada Lovelace");
    expect(profile.emailVerified).toBe(true);
  });

  it("reads HC permissions and groups from userinfo", () => {
    const profile = extractProfile(baseClaims, {
      "hc.permissions": ["run_workflows"],
      groups: ["Platform-Admins"],
    });
    expect(profile.permissions).toEqual(["run_workflows"]);
    expect(profile.groups).toEqual(["platform-admins"]);
  });

  it("falls back to the email local part for the name", () => {
    const profile = extractProfile({ ...baseClaims, given_name: undefined, family_name: undefined }, null);
    expect(profile.name).toBe("user");
  });

  it("rejects identities without an email", () => {
    expect(() => extractProfile({ ...baseClaims, email: undefined }, null)).toThrow(/email/);
  });
});

describe("resolveRole", () => {
  const profile = (overrides: Partial<ReturnType<typeof extractProfile>> = {}) => ({
    email: "user@test.com",
    emailVerified: true,
    name: "User",
    groups: [],
    permissions: [],
    ...overrides,
  });

  it("grants admin to configured emails", () => {
    expect(resolveRole(profile({ email: "boss@test.com" }), config)).toBe("admin");
  });

  it("grants admin to configured groups", () => {
    expect(resolveRole(profile({ groups: ["platform-admins"] }), config)).toBe("admin");
  });

  it("maps HC manage permissions to admin", () => {
    expect(resolveRole(profile({ permissions: ["manage_workflows"] }), config)).toBe("admin");
  });

  it("maps run permissions to author", () => {
    expect(resolveRole(profile({ permissions: ["run_workflows"] }), config)).toBe("author");
  });

  it("defaults to viewer", () => {
    expect(resolveRole(profile(), config)).toBe("viewer");
  });

  it("checks allowed roles", () => {
    expect(hasRole("author", ["admin", "author"])).toBe(true);
    expect(hasRole("viewer", ["admin"])).toBe(false);
  });
});
