import { describe, it, expect } from "vitest";
import { CHANNEL_CONNECTION_TYPE, parseNotificationSettings } from "./settings";

describe("parseNotificationSettings", () => {
  const valid = {
    enabled: true,
    channel: "slack",
    connectionId: "conn-1",
    target: "#alerts",
    throttleMinutes: 30,
  };

  it("accepts a complete payload", () => {
    expect(parseNotificationSettings(valid)).toEqual({ ok: true, value: valid });
  });

  it("trims the target and drops a blank connection", () => {
    const result = parseNotificationSettings({
      ...valid,
      enabled: false,
      target: "  #alerts  ",
      connectionId: "   ",
    });

    expect(result).toEqual({
      ok: true,
      value: { ...valid, enabled: false, target: "#alerts", connectionId: null },
    });
  });

  it("defaults the throttle when it is missing or invalid", () => {
    const result = parseNotificationSettings({ ...valid, throttleMinutes: undefined });
    expect(result.ok && result.value.throttleMinutes).toBe(60);
  });

  it("accepts a numeric string throttle", () => {
    const result = parseNotificationSettings({ ...valid, throttleMinutes: "15" });
    expect(result.ok && result.value.throttleMinutes).toBe(15);
  });

  it("rejects an unknown channel", () => {
    const result = parseNotificationSettings({ ...valid, channel: "teams" });
    expect(result).toEqual({ ok: false, error: "Channel must be slack, email or discord" });
  });

  it("rejects a non-object body", () => {
    expect(parseNotificationSettings(null).ok).toBe(false);
    expect(parseNotificationSettings("nope").ok).toBe(false);
  });

  it("rejects an out-of-range throttle", () => {
    expect(parseNotificationSettings({ ...valid, throttleMinutes: 0 }).ok).toBe(false);
    expect(parseNotificationSettings({ ...valid, throttleMinutes: 5000 }).ok).toBe(false);
  });

  it("requires a connection and target only when enabled", () => {
    expect(parseNotificationSettings({ ...valid, connectionId: "" }).ok).toBe(false);
    expect(parseNotificationSettings({ ...valid, target: "" }).ok).toBe(false);

    const disabled = parseNotificationSettings({
      ...valid,
      enabled: false,
      connectionId: "",
      target: "",
    });
    expect(disabled.ok).toBe(true);
  });
});

describe("CHANNEL_CONNECTION_TYPE", () => {
  it("maps each channel to the connection type it needs", () => {
    expect(CHANNEL_CONNECTION_TYPE).toEqual({
      slack: "Slack",
      email: "SMTP",
      discord: "Discord",
    });
  });
});
