import { describe, expect, it } from "vitest";
import { tokensFromConfig, tokensToConfig, OAUTH_SECRET_KEYS } from "./storage";

const tokens = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: 1_700_000_000_000,
  scopes: ["openid", "https://www.googleapis.com/auth/gmail.modify"],
  tokenType: "Bearer",
};

describe("tokensToConfig / tokensFromConfig", () => {
  it("round trips the tokens through the flat config", () => {
    expect(tokensFromConfig(tokensToConfig(tokens))).toEqual(tokens);
  });

  it("omits an absent refresh token so a reconnect merge keeps the stored one", () => {
    const config = tokensToConfig({ ...tokens, refreshToken: undefined });

    expect(config).not.toHaveProperty("refreshToken");
    expect(tokensFromConfig(config)?.refreshToken).toBeUndefined();
  });

  it("returns null when the config has no access token", () => {
    expect(tokensFromConfig({})).toBeNull();
  });

  it("marks every OAuth secret key for redaction", () => {
    expect(OAUTH_SECRET_KEYS).toContain("accessToken");
    expect(OAUTH_SECRET_KEYS).toContain("refreshToken");
    expect(OAUTH_SECRET_KEYS).toContain("clientSecret");
  });
});
