import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl } from "./authorize";
import { GOOGLE_AUTHORIZE_PARAMS, GOOGLE_PROVIDER } from "./google";

describe("buildAuthorizeUrl", () => {
  it("builds the consent URL with state and scopes", () => {
    const url = new URL(
      buildAuthorizeUrl({
        provider: GOOGLE_PROVIDER,
        clientId: "client-id",
        redirectUri: "http://localhost:3000/api/oauth/google/callback",
        scopes: ["openid", "email", "openid"],
        state: "signed-state",
        extraParams: GOOGLE_AUTHORIZE_PARAMS,
      }),
    );

    expect(url.origin + url.pathname).toBe(GOOGLE_PROVIDER.authorizeUrl);
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/oauth/google/callback",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });
});
