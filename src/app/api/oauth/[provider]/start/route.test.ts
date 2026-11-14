import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

beforeEach(() => {
  process.env.DEVDOCK_MASTER_KEY = Buffer.alloc(32, 3).toString("base64");
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

function request(query: string): { request: Request; params: Promise<{ provider: string }> } {
  return {
    request: new Request(`http://localhost:3000/api/oauth/google/start?${query}`),
    params: Promise.resolve({ provider: "google" }),
  };
}

describe("GET /api/oauth/[provider]/start", () => {
  it("redirects to the Google consent screen with scopes and state", async () => {
    const { request: req, params } = request("services=gmail,calendar&name=Work&returnTo=/connections");

    const response = await GET(req, { params });
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("client_id")).toBe("client-id");
    expect(location.searchParams.get("access_type")).toBe("offline");
    expect(location.searchParams.get("scope")).toContain("gmail.modify");
    expect(location.searchParams.get("state")?.split(".")).toHaveLength(2);
  });

  it("redirects back with not_configured when the client is missing", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    const { request: req, params } = request("services=gmail");

    const response = await GET(req, { params });
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.pathname).toBe("/connections");
    expect(location.searchParams.get("oauth_error")).toBe("not_configured");
  });

  it("rejects an unknown provider", async () => {
    const response = await GET(new Request("http://localhost:3000/api/oauth/github/start"), {
      params: Promise.resolve({ provider: "github" }),
    });
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.searchParams.get("oauth_error")).toBe("unknown_provider");
  });
});
