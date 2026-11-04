import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  saveNotificationSettings: vi.fn(),
  getConnection: vi.fn(),
}));

vi.mock("@/lib/notifications/notify", () => ({
  getNotificationSettings: mocks.getNotificationSettings,
  saveNotificationSettings: mocks.saveNotificationSettings,
}));

vi.mock("@/lib/db/connections", () => ({
  getConnection: mocks.getConnection,
}));

function put(body: unknown) {
  return PUT(
    new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const valid = {
  enabled: true,
  channel: "slack",
  connectionId: "conn-1",
  target: "#alerts",
  throttleMinutes: 60,
};

beforeEach(() => {
  mocks.getNotificationSettings.mockReset();
  mocks.saveNotificationSettings.mockReset();
  mocks.getConnection.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.getConnection.mockResolvedValue({ id: "conn-1", type: "Slack", config: {} });
  mocks.saveNotificationSettings.mockImplementation(async (value) => value);
});

describe("GET /api/settings/notifications", () => {
  it("returns the stored settings", async () => {
    mocks.getNotificationSettings.mockResolvedValue(valid);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(valid);
  });

  it("returns 500 when the query fails", async () => {
    mocks.getNotificationSettings.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});

describe("PUT /api/settings/notifications", () => {
  it("rejects an invalid payload", async () => {
    const response = await put({ ...valid, channel: "teams" });

    expect(response.status).toBe(400);
    expect(mocks.saveNotificationSettings).not.toHaveBeenCalled();
  });

  it("rejects a connection of the wrong type", async () => {
    mocks.getConnection.mockResolvedValue({ id: "conn-1", type: "Discord", config: {} });

    const response = await put(valid);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Slack/);
    expect(mocks.saveNotificationSettings).not.toHaveBeenCalled();
  });

  it("rejects an unknown connection", async () => {
    mocks.getConnection.mockResolvedValue(null);

    const response = await put(valid);

    expect(response.status).toBe(400);
  });

  it("saves a valid payload", async () => {
    const response = await put(valid);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(valid);
    expect(mocks.saveNotificationSettings).toHaveBeenCalledWith(valid);
  });

  it("skips the connection check when notifications are disabled", async () => {
    const disabled = { ...valid, enabled: false, connectionId: null, target: "" };

    const response = await put(disabled);

    expect(response.status).toBe(200);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });

  it("returns 500 when saving fails", async () => {
    mocks.saveNotificationSettings.mockRejectedValue(new Error("db down"));

    const response = await put(valid);

    expect(response.status).toBe(500);
  });
});
