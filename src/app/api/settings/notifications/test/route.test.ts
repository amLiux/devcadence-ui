import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  sendTestNotification: vi.fn(),
}));

vi.mock("@/lib/notifications/notify", () => ({
  sendTestNotification: mocks.sendTestNotification,
}));

beforeEach(() => {
  mocks.sendTestNotification.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/settings/notifications/test", () => {
  it("returns success when the sample is delivered", async () => {
    mocks.sendTestNotification.mockResolvedValue(undefined);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns the delivery error", async () => {
    mocks.sendTestNotification.mockRejectedValue(new Error("Slack: invalid_auth"));

    const response = await POST();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Slack: invalid_auth" });
  });
});
