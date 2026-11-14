import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOAuthState } from "@/lib/oauth/state";
import { createConnection, getConnection, updateConnection } from "@/lib/db/connections";
import { GET } from "./route";

vi.mock("@/lib/db/connections", () => ({
  createConnection: vi.fn(),
  getConnection: vi.fn(),
  updateConnection: vi.fn(),
}));

const createConnectionMock = vi.mocked(createConnection);
const getConnectionMock = vi.mocked(getConnection);
const updateConnectionMock = vi.mocked(updateConnection);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stateFor(overrides: Partial<Parameters<typeof createOAuthState>[0]> = {}): string {
  return createOAuthState({
    provider: "google",
    connectionId: "",
    returnTo: "/connections",
    name: "Work Google",
    services: ["gmail"],
    ...overrides,
  });
}

function callbackRequest(state: string, extra = "code=abc"): Request {
  return new Request(
    `http://localhost:3000/api/oauth/google/callback?state=${encodeURIComponent(state)}&${extra}`,
  );
}

const params = { params: Promise.resolve({ provider: "google" }) };

beforeEach(() => {
  vi.unstubAllGlobals();
  createConnectionMock.mockReset();
  getConnectionMock.mockReset();
  updateConnectionMock.mockReset();
  process.env.DEVDOCK_MASTER_KEY = Buffer.alloc(32, 5).toString("base64");
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

describe("GET /api/oauth/[provider]/callback", () => {
  it("exchanges the code and creates the Google connection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("token")
            ? jsonResponse({
                access_token: "access",
                refresh_token: "refresh",
                expires_in: 3600,
                scope: "openid https://www.googleapis.com/auth/gmail.modify",
              })
            : jsonResponse({ email: "dev@example.com", sub: "42" }),
        ),
      ),
    );
    createConnectionMock.mockResolvedValue({} as never);

    const response = await GET(callbackRequest(stateFor()), params);
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.pathname).toBe("/connections");
    expect(location.searchParams.get("oauth")).toBe("connected");
    expect(createConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Google",
        name: "Work Google",
        config: expect.objectContaining({
          accessToken: "access",
          refreshToken: "refresh",
          email: "dev@example.com",
          provider: "google",
          services: "gmail",
        }),
      }),
    );
  });

  it("rejects a tampered state", async () => {
    const response = await GET(callbackRequest("not-a-real-state"), params);
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.searchParams.get("oauth_error")).toBe("invalid_state");
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it("reports a cancelled consent", async () => {
    const response = await GET(callbackRequest(stateFor(), "error=access_denied"), params);
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.searchParams.get("oauth_error")).toBe("consent_denied");
  });

  it("merges tokens into an existing connection on reconnect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("token")
            ? jsonResponse({ access_token: "new-access", expires_in: 3600 })
            : jsonResponse({ email: "dev@example.com", sub: "42" }),
        ),
      ),
    );
    getConnectionMock.mockResolvedValue({
      id: "conn-1",
      type: "Google",
      name: "Work Google",
      description: "",
      config: { provider: "google", host: "kept", refreshToken: "old-refresh" },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await GET(callbackRequest(stateFor({ connectionId: "conn-1" })), params);

    expect(updateConnectionMock).toHaveBeenCalledWith("conn-1", {
      config: expect.objectContaining({
        host: "kept",
        accessToken: "new-access",
        refreshToken: "old-refresh",
        email: "dev@example.com",
      }),
    });
    expect(createConnectionMock).not.toHaveBeenCalled();
  });
});
