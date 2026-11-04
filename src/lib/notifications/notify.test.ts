import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  setting: { findUnique: vi.fn(), upsert: vi.fn() },
  run: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  log: { findFirst: vi.fn() },
  getConnection: vi.fn(),
  sendMessage: vi.fn(),
  sendDiscordMessage: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notificationSetting: mocks.setting,
    workflowRun: mocks.run,
    workflowLog: mocks.log,
  },
}));

vi.mock("@/lib/db/connections", () => ({
  getConnection: mocks.getConnection,
}));

vi.mock("@/lib/slack", () => ({ sendMessage: mocks.sendMessage }));
vi.mock("@/lib/discord", () => ({ sendDiscordMessage: mocks.sendDiscordMessage }));
vi.mock("@/lib/smtp", () => ({ sendEmail: mocks.sendEmail }));

import { getNotificationSettings, notifyRunFailure, runUrl, sendTestNotification } from "./notify";

function settings(overrides: Record<string, unknown> = {}) {
  return {
    id: "default",
    enabled: true,
    channel: "slack",
    connectionId: "conn-1",
    target: "#alerts",
    throttleMinutes: 60,
    updatedAt: new Date(),
    ...overrides,
  };
}

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    workflowId: "wf-1",
    status: "error",
    error: "One or more nodes failed",
    workflow: { id: "wf-1", name: "Deploy alerts" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.setting.findUnique.mockResolvedValue(settings());
  mocks.run.findUnique.mockResolvedValue(run());
  mocks.run.findFirst.mockResolvedValue(null);
  mocks.log.findFirst.mockResolvedValue({ nodeType: "HTTP Request", error: "503 Service Unavailable" });
  mocks.getConnection.mockResolvedValue({
    id: "conn-1",
    type: "Slack",
    config: { botToken: "xoxb-token" },
  });
  mocks.run.update.mockResolvedValue({});
});

describe("getNotificationSettings", () => {
  it("returns defaults when nothing is stored", async () => {
    mocks.setting.findUnique.mockResolvedValue(null);

    const result = await getNotificationSettings();

    expect(result).toMatchObject({ enabled: false, channel: "slack", throttleMinutes: 60 });
  });
});

describe("notifyRunFailure", () => {
  it("does nothing when notifications are disabled", async () => {
    mocks.setting.findUnique.mockResolvedValue(settings({ enabled: false }));

    await notifyRunFailure("run-1");

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.run.update).not.toHaveBeenCalled();
  });

  it("does nothing without a connection or target", async () => {
    mocks.setting.findUnique.mockResolvedValue(settings({ connectionId: null }));

    await notifyRunFailure("run-1");

    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("ignores runs that did not fail", async () => {
    mocks.run.findUnique.mockResolvedValue(run({ status: "success" }));

    await notifyRunFailure("run-1");

    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("mutes a failure inside the throttle window", async () => {
    mocks.run.findFirst.mockResolvedValue({ notifiedAt: new Date() });

    await notifyRunFailure("run-1");

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.run.update).not.toHaveBeenCalled();
  });

  it("sends the Slack message and marks the run as notified", async () => {
    await notifyRunFailure("run-1");

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      { botToken: "xoxb-token" },
      "#alerts",
      expect.stringContaining("Deploy alerts failed"),
    );
    expect(mocks.sendMessage.mock.calls[0][2]).toContain("Node: HTTP Request");
    expect(mocks.sendMessage.mock.calls[0][2]).toContain("503 Service Unavailable");
    expect(mocks.run.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { notifiedAt: expect.any(Date) },
    });
  });

  it("sends to Discord", async () => {
    mocks.setting.findUnique.mockResolvedValue(settings({ channel: "discord", target: "1234" }));
    mocks.getConnection.mockResolvedValue({
      id: "conn-1",
      type: "Discord",
      config: { botToken: "discord-token" },
    });

    await notifyRunFailure("run-1");

    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith(
      { botToken: "discord-token" },
      { channelId: "1234", content: expect.stringContaining("Deploy alerts failed") },
    );
  });

  it("sends an email", async () => {
    mocks.setting.findUnique.mockResolvedValue(
      settings({ channel: "email", target: "ana@example.com" }),
    );
    mocks.getConnection.mockResolvedValue({
      id: "conn-1",
      type: "SMTP",
      config: { host: "smtp.test", port: 587, fromEmail: "bot@test.dev" },
    });

    await notifyRunFailure("run-1");

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.test" }),
      expect.objectContaining({ to: "ana@example.com", subject: "[DevCadence] Deploy alerts failed" }),
    );
  });

  it("stays quiet when the connection was deleted", async () => {
    mocks.getConnection.mockResolvedValue(null);

    await expect(notifyRunFailure("run-1")).resolves.toBeUndefined();

    expect(mocks.run.update).not.toHaveBeenCalled();
  });

  it("swallows delivery errors", async () => {
    mocks.sendMessage.mockRejectedValue(new Error("slack down"));

    await expect(notifyRunFailure("run-1")).resolves.toBeUndefined();

    expect(mocks.run.update).not.toHaveBeenCalled();
  });
});

describe("runUrl", () => {
  it("deep links to the run in the editor", () => {
    expect(runUrl("wf-1", "run-1")).toMatch(/\/workflows\/editor\/wf-1\?run=run-1$/);
  });
});

describe("sendTestNotification", () => {
  it("sends a sample through the configured channel", async () => {
    await sendTestNotification();

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      { botToken: "xoxb-token" },
      "#alerts",
      expect.stringContaining("Test workflow failed"),
    );
  });

  it("requires a connection", async () => {
    mocks.setting.findUnique.mockResolvedValue(settings({ connectionId: null }));

    await expect(sendTestNotification()).rejects.toThrow(/connection/i);
  });
});
