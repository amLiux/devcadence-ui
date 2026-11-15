import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db";
import { getConnection } from "@/lib/db/connections";
import { getChannelMessages } from "@/lib/discord";
import { prepareGmailListenBody } from "@/lib/gmail/trigger";
import { prepareCalendarListenBody } from "@/lib/google-calendar/trigger";
import { executeWorkflowRun, type ExecuteRunResult } from "@/lib/workflows/execute-workflow";
import {
  QUEUE_CONNECTION,
  QUEUE_NAME,
  getWorkflowQueue,
  type WorkflowJobData,
} from "./queue";

async function getTriggerState(
  workflowId: string,
  triggerType: string,
  key: string,
): Promise<string | null> {
  const state = await prisma.triggerState.findUnique({
    where: { workflowId_triggerType_key: { workflowId, triggerType, key } },
  });
  return state?.lastValue ?? null;
}

async function setTriggerState(
  workflowId: string,
  triggerType: string,
  key: string,
  value: string,
): Promise<void> {
  await prisma.triggerState.upsert({
    where: { workflowId_triggerType_key: { workflowId, triggerType, key } },
    create: { workflowId, triggerType, key, lastValue: value },
    update: { lastValue: value },
  });
}

async function prepareDiscordListenBody(
  workflowId: string,
  body: unknown,
): Promise<{ messages: Record<string, unknown>[] } | null> {
  const config = body as { connectionId?: string; channelId?: string; limit?: number } | undefined;
  if (!config?.connectionId || !config?.channelId) {
    throw new Error("Invalid discord-listen job body");
  }
  if (!/^\d{17,20}$/.test(config.channelId)) {
    throw new Error(
      `Invalid Discord channel ID "${config.channelId}". Use the numeric channel ID, not a name or template.`,
    );
  }

  const connection = await getConnection(config.connectionId);
  if (!connection) throw new Error("Discord connection not found");

  const connConfig = connection.config as Record<string, string>;
  const botToken = connConfig.botToken;
  if (!botToken) throw new Error("Discord connection missing bot token");

  const lastId = await getTriggerState(workflowId, "discord-listen", config.channelId);
  const messages = await getChannelMessages(
    { botToken },
    { channelId: config.channelId, limit: config.limit ?? 50, after: lastId ?? undefined },
  );

  // Ignore messages from bots (including our own) to prevent reply loops.
  const filtered = messages.filter((m) => !m.author.bot);
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => (a.id > b.id ? 1 : -1));
  const newestId = sorted[sorted.length - 1].id;
  await setTriggerState(workflowId, "discord-listen", config.channelId, newestId);

  return { messages: sorted.map((m) => ({ ...m })) as Record<string, unknown>[] };
}

const worker = new Worker<WorkflowJobData>(
  QUEUE_NAME,
  async (job: Job<WorkflowJobData>): Promise<ExecuteRunResult> => {
    const { workflowId, source, body, runId } = job.data;

    // A retry already carries the payload captured on the original run, so it
    // must not fetch Discord messages again.
    if (source === "discord-listen" && !runId) {
      const triggerBody = await prepareDiscordListenBody(workflowId, body);
      if (!triggerBody) return { success: true, runId: "", error: "No new Discord messages" };
      return executeWorkflowRun({ workflowId, source, body: triggerBody });
    }

    if (source === "gmail-listen" && !runId) {
      const triggerBody = await prepareGmailListenBody(workflowId, body);
      if (!triggerBody) return { success: true, runId: "", error: "No new emails" };
      return executeWorkflowRun({ workflowId, source, body: triggerBody });
    }

    if (source === "calendar-listen" && !runId) {
      const triggerBody = await prepareCalendarListenBody(workflowId, body);
      if (!triggerBody) return { success: true, runId: "", error: "No new calendar events" };
      return executeWorkflowRun({ workflowId, source, body: triggerBody });
    }

    return executeWorkflowRun({ workflowId, source, body, runId });
  },
  { connection: QUEUE_CONNECTION },
);

worker.on("completed", (job: Job<WorkflowJobData>, result: ExecuteRunResult) => {
  console.info(`[queue] Job ${job.id} completed: ${result.runId} success=${result.success}`);
});

worker.on("failed", (job: Job<WorkflowJobData> | undefined, err: Error) => {
  console.error(`[queue] Job ${job?.id} failed: ${err.message}`);
});

export async function shutdownQueue(): Promise<void> {
  await worker.close();
  await getWorkflowQueue().close();
}
