import { afterEach, describe, expect, it } from "vitest";
import { resolveOAuthClient } from "./client";

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
});

describe("resolveOAuthClient", () => {
  it("reads instance credentials from env and builds the callback URL", () => {
    process.env.GOOGLE_CLIENT_ID = "env-id";
    process.env.GOOGLE_CLIENT_SECRET = "env-secret";

    expect(
      resolveOAuthClient({ providerId: "google", origin: "http://localhost:3000" }),
    ).toEqual({
      clientId: "env-id",
      clientSecret: "env-secret",
      redirectUri: "http://localhost:3000/api/oauth/google/callback",
    });
  });

  it("prefers a per-connection override", () => {
    process.env.GOOGLE_CLIENT_ID = "env-id";
    process.env.GOOGLE_CLIENT_SECRET = "env-secret";

    const client = resolveOAuthClient({
      providerId: "google",
      origin: "http://localhost:3000",
      configured: { clientId: "own-id", clientSecret: "own-secret" },
    });

    expect(client.clientId).toBe("own-id");
    expect(client.clientSecret).toBe("own-secret");
  });

  it("honours a redirect URI override", () => {
    process.env.GOOGLE_CLIENT_ID = "env-id";
    process.env.GOOGLE_CLIENT_SECRET = "env-secret";
    process.env.GOOGLE_REDIRECT_URI = "https://devcadence.example/api/oauth/google/callback";

    expect(
      resolveOAuthClient({ providerId: "google", origin: "http://localhost:3000" }).redirectUri,
    ).toBe("https://devcadence.example/api/oauth/google/callback");
  });

  it("throws not_configured when the instance has no client", () => {
    expect(() =>
      resolveOAuthClient({ providerId: "google", origin: "http://localhost:3000" }),
    ).toThrowError(expect.objectContaining({ code: "not_configured" }));
  });
});
