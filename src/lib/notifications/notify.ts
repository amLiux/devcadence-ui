import { prisma } from "@/lib/db";
import { getConnection } from "@/lib/db/connections";
import { sendDiscordMessage } from "@/lib/discord";
import { sendEmail, type SmtpConfig } from "@/lib/smtp";
import { sendMessage } from "@/lib/slack";
import {
  buildFailureMessage,
  formatNotificationText,
  shouldNotify,
  type FailureMessage,
} from "./message";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "./settings";

const SETTINGS_ID = "default";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function runUrl(workflowId: string, runId: string): string {
  return `${appUrl()}/workflows/editor/${workflowId}?run=${runId}`;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await prisma.notificationSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return { ...DEFAULT_NOTIFICATION_SETTINGS };

  return {
    enabled: row.enabled,
    channel: row.channel as NotificationSettings["channel"],
    connectionId: row.connectionId,
    target: row.target,
    throttleMinutes: row.throttleMinutes,
  };
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const row = await prisma.notificationSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...settings },
    update: settings,
  });

  return {
    enabled: row.enabled,
    channel: row.channel as NotificationSettings["channel"],
    connectionId: row.connectionId,
    target: row.target,
    throttleMinutes: row.throttleMinutes,
  };
}

async function deliver(settings: NotificationSettings, message: FailureMessage): Promise<void> {
  if (!settings.connectionId) throw new Error("No notification connection configured");

  const connection = await getConnection(settings.connectionId);
  if (!connection) throw new Error("Notification connection not found");

  const text = formatNotificationText(message);

  if (settings.channel === "slack") {
    await sendMessage(
      { botToken: String(connection.config.botToken ?? "") },
      settings.target,
      text,
    );
    return;
  }

  if (settings.channel === "discord") {
    await sendDiscordMessage(
      { botToken: String(connection.config.botToken ?? "") },
      { channelId: settings.target, content: text },
    );
    return;
  }

  await sendEmail(connection.config as unknown as SmtpConfig, {
    to: settings.target,
    subject: `[DevCadence] ${message.title}`,
    body: message.body,
  });
}

/**
 * Announces a failed run. Never throws: a broken notification channel must not
 * change the outcome of the run that already happened.
 */
export async function notifyRunFailure(runId: string): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.enabled || !settings.connectionId || !settings.target) return;

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: { select: { id: true, name: true } } },
    });
    if (!run || run.status !== "error") return;

    const lastNotified = await prisma.workflowRun.findFirst({
      where: { workflowId: run.workflowId, notifiedAt: { not: null } },
      orderBy: { notifiedAt: "desc" },
      select: { notifiedAt: true },
    });
    if (!shouldNotify(lastNotified?.notifiedAt, new Date(), settings.throttleMinutes)) return;

    const failingNode = await prisma.workflowLog.findFirst({
      where: { runId, status: "error" },
      orderBy: { stepNr: "asc" },
      select: { nodeType: true, error: true },
    });

    const message = buildFailureMessage({
      workflowName: run.workflow.name,
      failingNode: failingNode?.nodeType ?? null,
      error: failingNode?.error ?? run.error ?? null,
      runUrl: runUrl(run.workflowId, runId),
    });

    await deliver(settings, message);
    await prisma.workflowRun.update({ where: { id: runId }, data: { notifiedAt: new Date() } });
  } catch (error) {
    console.error(
      "notifyRunFailure error:",
      error instanceof Error ? error.message : error,
    );
  }
}

/** Sends a sample through the configured channel, for the settings button. */
export async function sendTestNotification(): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.connectionId) throw new Error("Select a connection first");

  const message = buildFailureMessage({
    workflowName: "Test workflow",
    failingNode: "HTTP Request",
    error: "503 Service Unavailable",
    runUrl: `${appUrl()}/workflows`,
  });

  await deliver(settings, message);
}
