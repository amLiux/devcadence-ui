import { describe, expect, it } from "vitest";
import { isPublicPath, requiresLogin } from "./route-access";

describe("isPublicPath", () => {
  it("allows the login page and auth callbacks", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/auth/callback")).toBe(true);
    expect(isPublicPath("/api/oauth/google/callback")).toBe(true);
    expect(isPublicPath("/api/webhooks/github")).toBe(true);
  });

  it("does not allow lookalike prefixes", () => {
    expect(isPublicPath("/loginfoo")).toBe(false);
    expect(isPublicPath("/api/authentication")).toBe(false);
    expect(isPublicPath("/api/webhooks-evil")).toBe(false);
  });
});

describe("requiresLogin", () => {
  it.each([
    "/",
    "/workflows",
    "/workflows/editor/123",
    "/connections",
    "/settings",
    "/settings/notifications",
    "/api/workflows",
    "/api/connections",
    "/api/settings",
    "/api/projects",
    "/api/dev",
  ])("protects %s", (pathname) => {
    expect(requiresLogin(pathname)).toBe(true);
  });

  it.each(["/login", "/api/auth/me", "/api/oauth/google/callback", "/api/webhooks/github"])(
    "leaves %s public",
    (pathname) => {
      expect(requiresLogin(pathname)).toBe(false);
    },
  );
});
