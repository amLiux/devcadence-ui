import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_PROVIDER } from "./google";
import {
  exchangeAuthorizationCode,
  fetchOAuthProfile,
  isExpiring,
  refreshAccessToken,
  revokeOAuthToken,
} from "./tokens";
import { OAuthError, type OAuthClient, type OAuthTokens } from "./types";

const client: OAuthClient = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:3000/api/oauth/google/callback",
};

function tokens(expiresAt: number): OAuthTokens {
  return {
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt,
    scopes: ["openid"],
    tokenType: "Bearer",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isExpiring", () => {
  it("is true inside the skew window", () => {
    expect(isExpiring(tokens(Date.now() + 30_000), Date.now(), 60_000)).toBe(true);
  });

  it("is false for a comfortable token", () => {
    expect(isExpiring(tokens(Date.now() + 600_000), Date.now(), 60_000)).toBe(false);
  });

  it("is true for an already expired token", () => {
    expect(isExpiring(tokens(Date.now() - 1), Date.now(), 60_000)).toBe(true);
  });
});

describe("exchangeAuthorizationCode", () => {
  it("posts the code grant and maps the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3599,
        scope: "openid email",
        token_type: "Bearer",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeAuthorizationCode({
      provider: GOOGLE_PROVIDER,
      client,
      code: "auth-code",
      scopes: ["openid", "email"],
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as string);

    expect(url).toBe(GOOGLE_PROVIDER.tokenUrl);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("redirect_uri")).toBe(client.redirectUri);
    expect(result.accessToken).toBe("new-access");
    expect(result.refreshToken).toBe("new-refresh");
    expect(result.scopes).toEqual(["openid", "email"]);
    expect(result.expiresAt).toBeGreaterThan(Date.now() + 3_000_000);
  });

  it("falls back to the requested scopes when the response omits them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ access_token: "a", expires_in: 60 })),
    );

    const result = await exchangeAuthorizationCode({
      provider: GOOGLE_PROVIDER,
      client,
      code: "c",
      scopes: ["openid", "https://www.googleapis.com/auth/gmail.modify"],
    });

    expect(result.scopes).toEqual(["openid", "https://www.googleapis.com/auth/gmail.modify"]);
  });

  it("throws exchange_failed with the provider detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_client" }, 401)),
    );

    await expect(
      exchangeAuthorizationCode({ provider: GOOGLE_PROVIDER, client, code: "c", scopes: [] }),
    ).rejects.toMatchObject({ code: "exchange_failed", message: "invalid_client" });
  });
});

describe("refreshAccessToken", () => {
  it("keeps the previous refresh token when Google omits a new one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ access_token: "fresh", expires_in: 3599 })),
    );

    const result = await refreshAccessToken({
      provider: GOOGLE_PROVIDER,
      client,
      refreshToken: "old-refresh",
      scopes: ["openid"],
    });

    expect(result.accessToken).toBe("fresh");
    expect(result.refreshToken).toBe("old-refresh");
  });

  it("maps invalid_grant to reconnect_required", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ error: "invalid_grant" }, 400))),
    );

    await expect(
      refreshAccessToken({
        provider: GOOGLE_PROVIDER,
        client,
        refreshToken: "revoked",
        scopes: [],
      }),
    ).rejects.toBeInstanceOf(OAuthError);
    await expect(
      refreshAccessToken({
        provider: GOOGLE_PROVIDER,
        client,
        refreshToken: "revoked",
        scopes: [],
      }),
    ).rejects.toMatchObject({ code: "reconnect_required" });
  });
});

describe("fetchOAuthProfile", () => {
  it("returns the email and subject", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ email: "dev@example.com", sub: "123" })),
    );

    await expect(
      fetchOAuthProfile({ provider: GOOGLE_PROVIDER, accessToken: "token" }),
    ).resolves.toEqual({ email: "dev@example.com", subject: "123" });
  });

  it("throws profile_failed without an email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ sub: "123" })));

    await expect(
      fetchOAuthProfile({ provider: GOOGLE_PROVIDER, accessToken: "token" }),
    ).rejects.toMatchObject({ code: "profile_failed" });
  });
});

describe("revokeOAuthToken", () => {
  it("posts the token to the revoke endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await revokeOAuthToken({ provider: GOOGLE_PROVIDER, client, token: "access" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(GOOGLE_PROVIDER.revokeUrl);
    expect(new URLSearchParams(init.body as string).get("token")).toBe("access");
  });

  it("is a no-op when the provider has no revoke endpoint", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await revokeOAuthToken({
      provider: { ...GOOGLE_PROVIDER, revokeUrl: undefined },
      client,
      token: "access",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
