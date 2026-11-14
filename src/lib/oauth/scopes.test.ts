import { describe, expect, it } from "vitest";
import { GOOGLE_PROVIDER } from "./google";
import { scopesForServices } from "./scopes";
import { OAuthProvider } from "./types";

const otherProvider: OAuthProvider = {
  id: "microsoft",
  connectionType: "Microsoft",
  authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userInfoUrl: "https://graph.microsoft.com/v1.0/me",
  baseScopes: ["openid", "email"],
};

describe("scopesForServices", () => {
  it("maps selected Google services to their scopes", () => {
    const scopes = scopesForServices(GOOGLE_PROVIDER, ["gmail", "sheets"]);

    expect(scopes).toContain("https://www.googleapis.com/auth/gmail.modify");
    expect(scopes).toContain("https://www.googleapis.com/auth/spreadsheets");
    expect(scopes).toContain("openid");
  });

  it("ignores unknown services instead of failing", () => {
    const scopes = scopesForServices(GOOGLE_PROVIDER, ["gmail", "maps"]);

    expect(scopes).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.modify",
    ]);
  });

  it("returns only base scopes for a provider with no service map", () => {
    expect(scopesForServices(otherProvider, ["gmail"])).toEqual(["openid", "email"]);
  });
});
