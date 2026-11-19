import { afterEach, describe, expect, it, vi } from "vitest";
import type { HortusConfig } from "./config";
import {
  AuthBackendError,
  authenticateWithHortus,
  InvalidCredentialsError,
  profileFromHortus,
} from "./hortus";

const config: HortusConfig = {
  apiUrl: "http://iam.test",
  service: "devcadence",
  sessionSecret: "secret",
  appUrl: "http://localhost:3000",
  sessionTtlSeconds: 3600,
  transactionTtlSeconds: 600,
  adminEmails: [],
  adminGroups: [],
  trustEmail: false,
  bootstrapFirstUser: true,
  loginMaxAttempts: 5,
  loginWindowSeconds: 300,
};

const user = { id: "u1", email: "User@Test.com", name: "Ada", last_name: "Lovelace" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(handler: (url: string) => Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => handler(String(input))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authenticateWithHortus", () => {
  it("logs in and verifies the token", async () => {
    mockFetch((url) =>
      url.endsWith("/auth/login")
        ? json({ access_token: "token" })
        : json({
            authenticated: true,
            user,
            permissions: { devcadence: ["run_workflows"] },
          }),
    );

    const identity = await authenticateWithHortus(config, "User@Test.com", "pass");
    expect(identity.user.id).toBe("u1");
    expect(identity.permissions.devcadence).toEqual(["run_workflows"]);
  });

  it("rejects invalid credentials", async () => {
    mockFetch(() => json({ detail: "Invalid email or password" }, 401));
    await expect(authenticateWithHortus(config, "a@test.com", "bad")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("surfaces backend failures", async () => {
    mockFetch(() => json({ detail: "boom" }, 500));
    await expect(authenticateWithHortus(config, "a@test.com", "pass")).rejects.toBeInstanceOf(
      AuthBackendError,
    );
  });

  it("rejects unauthenticated verify responses", async () => {
    mockFetch((url) =>
      url.endsWith("/auth/login")
        ? json({ access_token: "token" })
        : json({ authenticated: false, user }),
    );
    await expect(authenticateWithHortus(config, "a@test.com", "pass")).rejects.toBeInstanceOf(
      AuthBackendError,
    );
  });
});

describe("profileFromHortus", () => {
  it("normalizes the profile and merges IAM and service permissions", () => {
    const profile = profileFromHortus(
      {
        user,
        permissions: { iam: ["manage_users"], devcadence: ["run_workflows"] },
      },
      "devcadence",
    );
    expect(profile.email).toBe("user@test.com");
    expect(profile.name).toBe("Ada Lovelace");
    expect(profile.emailVerified).toBe(true);
    expect(profile.permissions).toEqual(["manage_users", "run_workflows"]);
  });
});
