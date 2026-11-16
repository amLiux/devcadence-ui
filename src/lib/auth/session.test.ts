import { describe, expect, it } from "vitest";
import type { AuthConfig } from "./config";
import {
  createSessionToken,
  createTransactionToken,
  readSessionToken,
  readTransactionToken,
} from "./session";

const config: AuthConfig = {
  issuer: "https://iam.test",
  clientId: "client",
  clientSecret: "secret",
  sessionSecret: "test-session-secret-with-enough-entropy",
  redirectUri: "http://localhost:3000/api/auth/callback",
  appUrl: "http://localhost:3000",
  scopes: "openid",
  sessionTtlSeconds: 3600,
  transactionTtlSeconds: 600,
  adminEmails: [],
  adminGroups: [],
  trustEmail: false,
  bootstrapFirstUser: true,
  upstreamLogout: false,
};

const user = { userId: "user-1", email: "a@test.com", role: "admin" as const, version: 3 };

describe("session tokens", () => {
  it("round-trips a session payload", async () => {
    const token = await createSessionToken(user, config);
    const payload = await readSessionToken(token, config);
    expect(payload?.sub).toBe("user-1");
    expect(payload?.role).toBe("admin");
    expect(payload?.ver).toBe(3);
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken(user, config);
    const [body, signature] = token.split(".");
    expect(await readSessionToken(`${body}.${signature}x`, config)).toBeNull();
    expect(await readSessionToken(`${body}x.${signature}`, config)).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await createSessionToken(user, config);
    const other = { ...config, sessionSecret: "another-secret" };
    expect(await readSessionToken(token, other)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await createSessionToken(user, { ...config, sessionTtlSeconds: -1 });
    expect(await readSessionToken(token, config)).toBeNull();
  });

  it("does not accept a transaction token as a session", async () => {
    const tx = await createTransactionToken(
      { state: "s", nonce: "n", verifier: "v", returnTo: "/" },
      config,
    );
    expect(await readSessionToken(tx, config)).toBeNull();
  });
});

describe("transaction tokens", () => {
  it("round-trips state, nonce, verifier and returnTo", async () => {
    const token = await createTransactionToken(
      { state: "state-1", nonce: "nonce-1", verifier: "verifier-1", returnTo: "/workflows" },
      config,
    );
    const payload = await readTransactionToken(token, config);
    expect(payload?.state).toBe("state-1");
    expect(payload?.nonce).toBe("nonce-1");
    expect(payload?.verifier).toBe("verifier-1");
    expect(payload?.returnTo).toBe("/workflows");
  });

  it("rejects expired transactions", async () => {
    const token = await createTransactionToken(
      { state: "s", nonce: "n", verifier: "v", returnTo: "/" },
      { ...config, transactionTtlSeconds: -1 },
    );
    expect(await readTransactionToken(token, config)).toBeNull();
  });
});
