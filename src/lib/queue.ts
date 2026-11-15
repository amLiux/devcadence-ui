import { Queue } from "bullmq";

export const QUEUE_NAME = "workflow-execution";
export const QUEUE_CONNECTION = { url: process.env.REDIS_URL || "redis://localhost:6379" };

export interface WorkflowJobData {
  workflowId: string;
  source: "webhook" | "schedule" | "subWorkflow" | "discord-listen" | "gmail-listen" | "calendar-listen" | "manual";
  body?: unknown;
  /** When set, the worker executes this existing run instead of creating one. */
  runId?: string;
}

export interface JobResult {
  success: boolean;
  runId: string;
  error?: string;
}

let queue: Queue<WorkflowJobData> | null = null;

/**
 * Lazily creates the queue. Importing this module must not open a Redis
 * connection: route handlers and tests import it without running a worker.
 */
export function getWorkflowQueue(): Queue<WorkflowJobData> {
  if (!queue) queue = new Queue<WorkflowJobData>(QUEUE_NAME, { connection: QUEUE_CONNECTION });
  return queue;
}

export async function enqueueWorkflow(
  data: WorkflowJobData,
  options: { delayMs?: number } = {},
): Promise<string> {
  const job = await getWorkflowQueue().add(QUEUE_NAME, data, {
    // Retry jobs already own a run; BullMQ retries would re-run the same row.
    attempts: data.runId ? 1 : 3,
    backoff: { type: "exponential", delay: 2000 },
    delay: options.delayMs && options.delayMs > 0 ? options.delayMs : undefined,
  });
  return job.id ?? "";
}

export async function getJobResult(jobId: string): Promise<JobResult | null> {
  const job = await getWorkflowQueue().getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  if (state === "completed") return job.returnvalue as JobResult;
  if (state === "failed") return { success: false, runId: "", error: job.failedReason };
  return null;
}
