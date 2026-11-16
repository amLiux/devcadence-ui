import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthConfig } from "./config";
import {
  assertSafeEndpoint,
  buildAuthorizeUrl,
  type OidcDiscovery,
  verifyIdToken,
} from "./oidc";

const config: AuthConfig = {
  issuer: "https://iam.test",
  clientId: "devcadence",
  clientSecret: "secret",
  sessionSecret: "secret",
  redirectUri: "http://localhost:3000/api/auth/callback",
  appUrl: "http://localhost:3000",
  scopes: "openid profile email",
  sessionTtlSeconds: 3600,
  transactionTtlSeconds: 600,
  adminEmails: [],
  adminGroups: [],
  trustEmail: false,
  bootstrapFirstUser: true,
  upstreamLogout: false,
};

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey & { kid?: string; alg?: string };
jwk.kid = "key-1";
jwk.alg = "RS256";

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(claims: Record<string, unknown>, key = privateKey): string {
  const header = encode({ alg: "RS256", kid: "key-1", typ: "JWT" });
  const payload = encode(claims);
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), key).toString(
    "base64url",
  );
  return `${header}.${payload}.${signature}`;
}

function validClaims(overrides: Record<string, unknown> = {}) {
  return {
    iss: config.issuer,
    sub: "user-123",
    aud: config.clientId,
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    nonce: "nonce-123",
    email: "user@test.com",
    email_verified: true,
    ...overrides,
  };
}

function discoveryFor(suffix: string): OidcDiscovery {
  return {
    issuer: config.issuer,
    authorization_endpoint: `${config.issuer}/authorize`,
    token_endpoint: `${config.issuer}/token`,
    userinfo_endpoint: `${config.issuer}/userinfo`,
    jwks_uri: `${config.issuer}/jwks/${suffix}`,
  };
}

function mockJwks(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyIdToken", () => {
  it("accepts a valid RS256 token", async () => {
    mockJwks();
    const token = makeToken(validClaims());
    const claims = await verifyIdToken(config, discoveryFor("ok"), token, "nonce-123");
    expect(claims.sub).toBe("user-123");
    expect(claims.email).toBe("user@test.com");
  });

  it("rejects a wrong nonce", async () => {
    mockJwks();
    const token = makeToken(validClaims());
    await expect(verifyIdToken(config, discoveryFor("nonce"), token, "other")).rejects.toThrow(
      /nonce/,
    );
  });

  it("rejects a wrong audience", async () => {
    mockJwks();
    const token = makeToken(validClaims({ aud: "another-client" }));
    await expect(
      verifyIdToken(config, discoveryFor("aud"), token, "nonce-123"),
    ).rejects.toThrow(/audience/);
  });

  it("rejects an expired token", async () => {
    mockJwks();
    const token = makeToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 120 }));
    await expect(
      verifyIdToken(config, discoveryFor("exp"), token, "nonce-123"),
    ).rejects.toThrow(/expired/);
  });

  it("rejects a tampered signature", async () => {
    mockJwks();
    const token = makeToken(validClaims());
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}xx`;
    await expect(
      verifyIdToken(config, discoveryFor("sig"), tampered, "nonce-123"),
    ).rejects.toThrow(/signature/);
  });

  it("rejects a token signed by another key", async () => {
    mockJwks();
    const { privateKey: otherKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const token = makeToken(validClaims(), otherKey);
    await expect(
      verifyIdToken(config, discoveryFor("otherkey"), token, "nonce-123"),
    ).rejects.toThrow(/signature/);
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes PKCE, state and nonce", () => {
    const url = new URL(
      buildAuthorizeUrl(config, discoveryFor("authz"), {
        state: "state-1",
        nonce: "nonce-1",
        codeChallenge: "challenge-1",
      }),
    );
    expect(url.searchParams.get("client_id")).toBe(config.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("nonce")).toBe("nonce-1");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("assertSafeEndpoint", () => {
  it("accepts https and localhost http", () => {
    expect(assertSafeEndpoint("https://iam.test/jwks").hostname).toBe("iam.test");
    expect(assertSafeEndpoint("http://localhost:8000/jwks").hostname).toBe("localhost");
  });

  it("rejects plain http for remote hosts", () => {
    expect(() => assertSafeEndpoint("http://iam.test/jwks")).toThrow(/insecure/);
  });
});
