export type NotificationChannel = "slack" | "email" | "discord";

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ["slack", "email", "discord"];

export const DEFAULT_THROTTLE_MINUTES = 60;

export interface FailureMessageInput {
  workflowName: string;
  failingNode: string | null;
  error: string | null;
  runUrl: string;
}

export interface FailureMessage {
  title: string;
  body: string;
}

/** Builds the one message reused across Slack, Discord and email. */
export function buildFailureMessage(input: FailureMessageInput): FailureMessage {
  const title = `${input.workflowName} failed`;

  const lines = [
    input.failingNode ? `Node: ${input.failingNode}` : null,
    `Error: ${input.error ?? "Unknown error"}`,
    `Run: ${input.runUrl}`,
  ].filter((line): line is string => Boolean(line));

  return { title, body: lines.join("\n") };
}

/** Wraps the message for chat channels, which render the title inline. */
export function formatNotificationText(message: FailureMessage): string {
  return `❌ ${message.title}\n${message.body}`;
}

/**
 * Only the first failure of a workflow is announced; repeats are muted until
 * the throttle window passes. Without this, a 15-minute schedule would send a
 * message every quarter hour.
 */
export function shouldNotify(
  lastNotifiedAt: Date | null | undefined,
  now: Date,
  throttleMinutes: number,
): boolean {
  if (!lastNotifiedAt) return true;

  const throttleMs = Math.max(0, throttleMinutes) * 60_000;
  return now.getTime() - lastNotifiedAt.getTime() >= throttleMs;
}
