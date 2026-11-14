import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnection, updateConnection } from "@/lib/db/connections";
import { refreshAccessToken, revokeOAuthToken } from "@/lib/oauth/tokens";
import { POST } from "./route";

vi.mock("@/lib/db/connections", () => ({
  getConnection: vi.fn(),
  updateConnection: vi.fn(),
}));

vi.mock("@/lib/oauth/tokens", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/oauth/tokens")>();
  return { ...actual, refreshAccessToken: vi.fn(), revokeOAuthToken: vi.fn() };
});

const getConnectionMock = vi.mocked(getConnection);
const updateConnectionMock = vi.mocked(updateConnection);
const refreshMock = vi.mocked(refreshAccessToken);
const revokeMock = vi.mocked(revokeOAuthToken);

const params = { params: Promise.resolve({ id: "conn-1" }) };

function connection(config: Record<string, unknown>) {
  return {
    id: "conn-1",
    type: "Google",
    name: "Work Google",
    description: "",
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function actionRequest(action: string): Request {
  return new Request("http://localhost:3000/api/connections/conn-1/oauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

const authorizedConfig = {
  provider: "google",
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: "1700000000000",
  scopes: "openid https://www.googleapis.com/auth/gmail.modify",
  tokenType: "Bearer",
  email: "dev@example.com",
  authorizedAt: "2026-11-14T00:00:00.000Z",
};

beforeEach(() => {
  getConnectionMock.mockReset();
  updateConnectionMock.mockReset();
  refreshMock.mockReset();
  revokeMock.mockReset();
  process.env.DEVDOCK_MASTER_KEY = Buffer.alloc(32, 9).toString("base64");
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

describe("POST /api/connections/[id]/oauth", () => {
  it("refreshes the access token and keeps the connection authorized", async () => {
    getConnectionMock.mockResolvedValue(connection(authorizedConfig) as never);
    refreshMock.mockResolvedValue({
      accessToken: "fresh",
      refreshToken: "refresh",
      expiresAt: 1_700_000_100_000,
      scopes: ["openid"],
      tokenType: "Bearer",
    });

    const response = await POST(actionRequest("refresh"), params);
    const body = await response.json();

    expect(body).toEqual({ ok: true, expiresAt: 1_700_000_100_000 });
    expect(updateConnectionMock).toHaveBeenCalledWith("conn-1", {
      config: expect.objectContaining({ accessToken: "fresh", refreshToken: "refresh" }),
    });
  });

  it("returns 409 when the connection has no tokens", async () => {
    getConnectionMock.mockResolvedValue(connection({ provider: "google" }) as never);

    const response = await POST(actionRequest("refresh"), params);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("reconnect_required");
  });

  it("revokes and clears the credentials on disconnect", async () => {
    getConnectionMock.mockResolvedValue(connection(authorizedConfig) as never);
    revokeMock.mockResolvedValue();

    const response = await POST(actionRequest("disconnect"), params);
    const body = await response.json();
    const saved = updateConnectionMock.mock.calls[0][1].config ?? {};

    expect(body).toEqual({ ok: true, revoked: true });
    expect(saved).not.toHaveProperty("accessToken");
    expect(saved).not.toHaveProperty("refreshToken");
    expect(saved).not.toHaveProperty("email");
    expect(saved).toMatchObject({ provider: "google" });
  });

  it("still clears the credentials when revoke fails", async () => {
    getConnectionMock.mockResolvedValue(connection(authorizedConfig) as never);
    revokeMock.mockRejectedValue(new Error("network"));

    const response = await POST(actionRequest("disconnect"), params);

    expect((await response.json()).revoked).toBe(false);
    expect(updateConnectionMock).toHaveBeenCalled();
  });
});
