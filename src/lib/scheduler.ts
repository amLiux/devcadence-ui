import { Queue } from "bullmq";
import { prisma } from "@/lib/db";
import type { EditorNode } from "@/lib/types";

const QUEUE_NAME = "workflow-execution";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = { url: REDIS_URL };
const queue = new Queue(QUEUE_NAME, { connection });

function findScheduleNode(nodes: EditorNode[]): { cron: string } | null {
  for (const node of nodes) {
    if (node.data.type === "Trigger" && node.data.title === "Schedule") {
      const meta = (node.data.metadata || {}) as Record<string, string>;
      if (meta.cron) return { cron: meta.cron };
    }
  }
  return null;
}

export async function registerSchedule(workflowId: string, cron: string): Promise<void> {
  const existing = await queue.getRepeatableJobs();
  const already = existing.some((j) => j.name === workflowId && j.pattern === cron);
  if (already) return;

  await queue.add(
    workflowId,
    { workflowId, source: "schedule" },
    {
      repeat: { pattern: cron },
    },
  );
}

export async function unregisterSchedule(workflowId: string): Promise<void> {
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === workflowId && job.pattern) {
      await queue.removeRepeatable(workflowId, { pattern: job.pattern });
    }
  }
}

export async function syncSchedules(): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { status: "active" },
  });

  const desired = new Map<string, string>();
  for (const workflow of workflows) {
    if (!workflow.nodes) continue;
    const nodes: EditorNode[] = JSON.parse(workflow.nodes);
    const schedule = findScheduleNode(nodes);
    if (schedule) {
      desired.set(workflow.id, schedule.cron);
    }
  }

  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (!job.name) continue;
    const wantedCron = desired.get(job.name);
    if (wantedCron === undefined || job.pattern !== wantedCron) {
      if (job.pattern) {
        await queue.removeRepeatable(job.name, { pattern: job.pattern });
      }
    }
  }

  for (const [workflowId, cron] of desired) {
    await registerSchedule(workflowId, cron);
  }
}
