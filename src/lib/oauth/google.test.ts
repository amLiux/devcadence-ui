import { describe, expect, it } from "vitest";
import { GOOGLE_AUTHORIZE_PARAMS, GOOGLE_PROVIDER, googleScopesForServices } from "./google";

describe("googleScopesForServices", () => {
  it("always includes the identity scopes", () => {
    expect(googleScopesForServices([])).toEqual(["openid", "email", "profile"]);
  });

  it("adds the scope for a single service", () => {
    const scopes = googleScopesForServices(["gmail"]);

    expect(scopes).toContain("https://www.googleapis.com/auth/gmail.modify");
    expect(scopes).toContain("openid");
  });

  it("merges several services without duplicates", () => {
    const scopes = googleScopesForServices(["gmail", "sheets", "gmail"]);

    expect(new Set(scopes).size).toBe(scopes.length);
    expect(scopes).toContain("https://www.googleapis.com/auth/spreadsheets");
  });

  it("asks for drive.file instead of the broad drive scope", () => {
    const scopes = googleScopesForServices(["drive"]);

    expect(scopes).toContain("https://www.googleapis.com/auth/drive.file");
    expect(scopes).not.toContain("https://www.googleapis.com/auth/drive");
  });
});

describe("GOOGLE_AUTHORIZE_PARAMS", () => {
  it("requests offline access so a refresh token is issued", () => {
    expect(GOOGLE_AUTHORIZE_PARAMS.access_type).toBe("offline");
    expect(GOOGLE_PROVIDER.revokeUrl).toBeTruthy();
  });
});
