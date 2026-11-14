import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnection, getLatestConnectionByType } from "@/lib/db/connections";
import { refreshConnection } from "@/lib/oauth/connection-service";
import { getGoogleAccessToken, googleFetch } from "./token";

vi.mock("@/lib/db/connections", () => ({
  getLatestConnectionByType: vi.fn(),
  getConnection: vi.fn(),
}));

vi.mock("@/lib/oauth/connection-service", () => ({ refreshConnection: vi.fn() }));

const latestMock = vi.mocked(getLatestConnectionByType);
const getMock = vi.mocked(getConnection);
const refreshMock = vi.mocked(refreshConnection);

const future = Date.now() + 3600_000;

function connection(config: Record<string, unknown>) {
  return {
    id: "conn-1",
    type: "Google",
    name: "Google",
    description: "",
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  latestMock.mockReset();
  getMock.mockReset();
  refreshMock.mockReset();
  vi.unstubAllGlobals();
});

describe("getGoogleAccessToken", () => {
  it("returns the stored token when it is not about to expire", async () => {
    latestMock.mockResolvedValue(
      connection({
        accessToken: "valid",
        refreshToken: "refresh",
        expiresAt: String(future),
        scopes: "openid",
      }) as never,
    );

    await expect(getGoogleAccessToken()).resolves.toBe("valid");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refreshes and reloads the token when it is expiring", async () => {
    latestMock.mockResolvedValue(
      connection({
        accessToken: "old",
        refreshToken: "refresh",
        expiresAt: String(Date.now() + 1000),
        scopes: "openid",
      }) as never,
    );
    getMock.mockResolvedValue(
      connection({
        accessToken: "fresh",
        refreshToken: "refresh",
        expiresAt: String(future),
        scopes: "openid",
      }) as never,
    );

    await expect(getGoogleAccessToken()).resolves.toBe("fresh");
    expect(refreshMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "conn-1" }),
    );
  });

  it("fails clearly when there is no Google connection", async () => {
    latestMock.mockResolvedValue(null);

    await expect(getGoogleAccessToken()).rejects.toMatchObject({ code: "not_configured" });
  });

  it("fails with reconnect_required when the connection has no tokens", async () => {
    latestMock.mockResolvedValue(connection({}) as never);

    await expect(getGoogleAccessToken()).rejects.toMatchObject({ code: "reconnect_required" });
  });
});

describe("googleFetch", () => {
  it("retries once on 401 with a forced refresh", async () => {
    latestMock.mockResolvedValue(
      connection({
        accessToken: "initial",
        refreshToken: "refresh",
        expiresAt: String(future),
        scopes: "openid",
      }) as never,
    );
    getMock.mockResolvedValue(
      connection({
        accessToken: "refreshed",
        refreshToken: "refresh",
        expiresAt: String(future),
        scopes: "openid",
      }) as never,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await googleFetch("https://example.test/api");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("does not retry on other statuses", async () => {
    latestMock.mockResolvedValue(
      connection({
        accessToken: "initial",
        refreshToken: "refresh",
        expiresAt: String(future),
        scopes: "openid",
      }) as never,
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await googleFetch("https://example.test/api");

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
