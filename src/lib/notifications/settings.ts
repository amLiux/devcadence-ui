import { DEFAULT_THROTTLE_MINUTES, NOTIFICATION_CHANNELS, type NotificationChannel } from "./message";

export interface NotificationSettings {
  enabled: boolean;
  channel: NotificationChannel;
  connectionId: string | null;
  target: string;
  throttleMinutes: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  channel: "slack",
  connectionId: null,
  target: "",
  throttleMinutes: DEFAULT_THROTTLE_MINUTES,
};

/** Which stored connection type each channel needs. */
export const CHANNEL_CONNECTION_TYPE: Record<NotificationChannel, "Slack" | "SMTP" | "Discord"> = {
  slack: "Slack",
  email: "SMTP",
  discord: "Discord",
};

export type ParseResult =
  | { ok: true; value: NotificationSettings }
  | { ok: false; error: string };

function parseConnectionId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseThrottle(value: unknown): number {
  const raw =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(raw) ? Math.trunc(raw) : DEFAULT_THROTTLE_MINUTES;
}

/** Validates the settings payload without touching the database. */
export function parseNotificationSettings(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;

  if (!NOTIFICATION_CHANNELS.includes(input.channel as NotificationChannel)) {
    return { ok: false, error: "Channel must be slack, email or discord" };
  }
  const channel = input.channel as NotificationChannel;

  const enabled = input.enabled === true;
  const connectionId = parseConnectionId(input.connectionId);
  const target = typeof input.target === "string" ? input.target.trim() : "";
  const throttleMinutes = parseThrottle(input.throttleMinutes);

  if (throttleMinutes < 1 || throttleMinutes > 1440) {
    return { ok: false, error: "Throttle must be between 1 and 1440 minutes" };
  }
  if (enabled && !connectionId) {
    return { ok: false, error: "Select a connection for notifications" };
  }
  if (enabled && !target) {
    return { ok: false, error: "Set a channel, user or email to notify" };
  }

  return { ok: true, value: { enabled, channel, connectionId, target, throttleMinutes } };
}
