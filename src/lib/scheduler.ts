import { createHash } from "crypto";
import { Queue } from "bullmq";
import { prisma } from "@/lib/db";
import { parseWorkflowVariables } from "@/lib/workflows/variables";
import { resolveTriggerMetadata } from "@/lib/workflows/trigger-metadata";
import type { EditorNode } from "@/lib/types";

const QUEUE_NAME = "workflow-execution";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = { url: REDIS_URL };
const queue = new Queue(QUEUE_NAME, { connection });

interface ScheduleTrigger {
  type: "schedule";
  cron: string;
}

interface DiscordListenTrigger {
  type: "discord-listen";
  cron: string;
  channelId: string;
  limit: number;
  connectionId: string;
}

interface GmailListenTrigger {
  type: "gmail-listen";
  cron: string;
  query: string;
  maxResults: number;
}

type TriggerConfig = ScheduleTrigger | DiscordListenTrigger | GmailListenTrigger;

function findTriggerNodes(
  nodes: EditorNode[],
  variables: Record<string, string>,
): TriggerConfig | null {
  for (const node of nodes) {
    if (node.data.type !== "Trigger") continue;
    const meta = resolveTriggerMetadata(
      (node.data.metadata || {}) as Record<string, string>,
      variables,
    );

    if (node.data.title === "Schedule" && meta.cron) {
      return { type: "schedule", cron: meta.cron };
    }

    if (
      node.data.title === "Listen Discord Messages" &&
      meta.cron &&
      meta.channelId &&
      meta.connectionId
    ) {
      return {
        type: "discord-listen",
        cron: meta.cron,
        channelId: meta.channelId,
        limit: parseInt(meta.limit || "50", 10),
        connectionId: meta.connectionId,
      };
    }
    if (
      node.data.title === "Watch Emails" &&
      meta.cron &&
      meta.query
    ) {
      return {
        type: "gmail-listen",
        cron: meta.cron,
        query: meta.query,
        maxResults: parseInt(meta.maxResults || "25", 10),
      };
    }
  }
  return null;
}

function gmailJobKey(query: string): string {
  return createHash("sha1").update(query).digest("hex").slice(0, 12);
}

function jobName(workflowId: string, trigger: TriggerConfig): string {
  if (trigger.type === "schedule") return workflowId;
  if (trigger.type === "gmail-listen") {
    return `gmail-listen:${workflowId}:${gmailJobKey(trigger.query)}`;
  }
  return `discord-listen:${workflowId}:${trigger.channelId}`;
}

function jobData(workflowId: string, trigger: TriggerConfig): Record<string, unknown> {
  if (trigger.type === "schedule") {
    return { workflowId, source: "schedule" };
  }
  if (trigger.type === "gmail-listen") {
    return {
      workflowId,
      source: "gmail-listen",
      body: { query: trigger.query, maxResults: trigger.maxResults },
    };
  }
  return {
    workflowId,
    source: "discord-listen",
    body: {
      connectionId: trigger.connectionId,
      channelId: trigger.channelId,
      limit: trigger.limit,
    },
  };
}

export async function registerSchedule(name: string, workflowId: string, trigger: TriggerConfig): Promise<void> {
  const existing = await queue.getRepeatableJobs();
  const already = existing.some((j) => j.name === name && j.pattern === trigger.cron);
  if (already) return;

  await queue.add(
    name,
    jobData(workflowId, trigger),
    {
      repeat: { pattern: trigger.cron },
    },
  );
}

export async function unregisterSchedule(workflowId: string): Promise<void> {
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (!job.name) continue;
    if (
      job.name === workflowId ||
      job.name.startsWith(`discord-listen:${workflowId}:`) ||
      job.name.startsWith(`gmail-listen:${workflowId}:`)
    ) {
      if (job.pattern) {
        await queue.removeRepeatable(job.name, { pattern: job.pattern });
      }
    }
  }
}

export async function syncSchedules(): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { status: "active" },
  });

  const desired = new Map<string, { workflowId: string; cron: string; trigger: TriggerConfig }>();
  for (const workflow of workflows) {
    if (!workflow.nodes) continue;
    const nodes: EditorNode[] = JSON.parse(workflow.nodes);
    const trigger = findTriggerNodes(nodes, parseWorkflowVariables(workflow.variables));
    if (trigger) {
      const name = jobName(workflow.id, trigger);
      desired.set(name, { workflowId: workflow.id, cron: trigger.cron, trigger });
    }
  }

  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (!job.name) continue;
    const wanted = desired.get(job.name);
    if (!wanted || job.pattern !== wanted.cron) {
      if (job.pattern) {
        await queue.removeRepeatable(job.name, { pattern: job.pattern });
      }
    }
  }

  for (const [name, { workflowId, trigger }] of desired) {
    await registerSchedule(name, workflowId, trigger);
  }
}
