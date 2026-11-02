import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  isTestable: vi.fn(),
  testConnectionConfig: vi.fn(),
}));

vi.mock("@/lib/db/connections", () => ({
  getConnection: mocks.getConnection,
}));

vi.mock("@/lib/connections/test", () => ({
  isTestable: mocks.isTestable,
  testConnectionConfig: mocks.testConnectionConfig,
}));

function call(id = "conn-1") {
  return POST(new Request(`http://localhost/api/connections/${id}/test`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  mocks.getConnection.mockReset();
  mocks.isTestable.mockReset();
  mocks.testConnectionConfig.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/connections/[id]/test", () => {
  it("returns 404 for an unknown connection", async () => {
    mocks.getConnection.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(404);
    expect(mocks.testConnectionConfig).not.toHaveBeenCalled();
  });

  it("returns 400 for a type without a probe", async () => {
    mocks.getConnection.mockResolvedValue({ type: "Webhook", config: {} });
    mocks.isTestable.mockReturnValue(false);

    const response = await call();

    expect(response.status).toBe(400);
    expect(mocks.testConnectionConfig).not.toHaveBeenCalled();
  });

  it("returns the probe result with a 200 even when the probe fails", async () => {
    mocks.getConnection.mockResolvedValue({
      type: "Slack",
      config: { botToken: "xoxb-token" },
    });
    mocks.isTestable.mockReturnValue(true);
    mocks.testConnectionConfig.mockResolvedValue({
      ok: false,
      latencyMs: 120,
      message: "Slack: invalid_auth",
    });

    const response = await call();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: false, latencyMs: 120, message: "Slack: invalid_auth" });
    expect(mocks.testConnectionConfig).toHaveBeenCalledWith({
      type: "Slack",
      config: { botToken: "xoxb-token" },
    });
  });

  it("returns 500 when the probe blows up", async () => {
    mocks.getConnection.mockResolvedValue({ type: "GitHub", config: {} });
    mocks.isTestable.mockReturnValue(true);
    mocks.testConnectionConfig.mockRejectedValue(new Error("boom"));

    const response = await call();

    expect(response.status).toBe(500);
  });
});
