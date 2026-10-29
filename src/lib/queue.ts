import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db";
import { getConnection } from "@/lib/db/connections";
import { getChannelMessages } from "@/lib/discord";
import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  findRoots,
  type NodeOutput,
} from "@/lib/workflow-context";
import { executeNode } from "@/lib/workflows/execute-node";
import { sanitize } from "@/lib/workflows/sanitize";
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

const QUEUE_NAME = "workflow-execution";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = { url: REDIS_URL };

export const workflowQueue = new Queue(QUEUE_NAME, { connection });

export interface WorkflowJobData {
  workflowId: string;
  source: "webhook" | "schedule" | "subWorkflow" | "discord-listen";
  body?: unknown;
}

interface JobResult {
  success: boolean;
  runId: string;
  error?: string;
}

const now = () => new Date().toISOString();

async function getTriggerState(workflowId: string, triggerType: string, key: string): Promise<string | null> {
  const state = await prisma.triggerState.findUnique({
    where: { workflowId_triggerType_key: { workflowId, triggerType, key } },
  });
  return state?.lastValue ?? null;
}

async function setTriggerState(workflowId: string, triggerType: string, key: string, value: string): Promise<void> {
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

  if (messages.length === 0) return null;

  const sorted = [...messages].sort((a, b) => (a.id > b.id ? 1 : -1));
  const newestId = sorted[sorted.length - 1].id;
  await setTriggerState(workflowId, "discord-listen", config.channelId, newestId);

  return { messages: sorted.map((m) => ({ ...m })) as Record<string, unknown>[] };
}

async function executeWorkflow(workflowId: string, source: string, body?: unknown): Promise<JobResult> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) return { success: false, runId: "", error: "Workflow not found" };

  const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
  const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

  if (nodes.length === 0) return { success: false, runId: "", error: "Workflow has no nodes" };

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      source,
      triggerPayload: body ? sanitize(body).sanitized : null,
    },
  });

  const parents = buildParentMap(edges);
  const forward = buildForwardMap(edges);
  const roots = findRoots(nodes, edges);

  const nodeOutputs = new Map<string, NodeOutput>();
  const stepResults: NodeDebugLog[] = [];
  const visited = new Set<string>();
  let stepNr = 0;

  const queue: string[] = [];

  for (const root of roots) {
    const isTriggerWithBody = root.data.type === "Trigger" && body;
    if (isTriggerWithBody) {
      const title = root.data.title;
      nodeOutputs.set(root.id, { data: body, success: true, error: null });
      const startedAt = now();
      stepNr++;
      stepResults.push({
        nodeId: root.id, title, success: true,
        logs: [
          { type: "info", message: `Starting ${title}...`, timestamp: startedAt },
          { type: "success", message: `${title} completed in 0ms`, timestamp: now() },
        ],
      });
      await prisma.workflowLog.create({
        data: {
          runId: run.id, nodeId: root.id, nodeType: title, stepNr,
          status: "success", input: undefined, output: sanitize(body).sanitized,
          error: null, controlFlow: undefined, meta: undefined,
          startedAt, finishedAt: now(), elapsedMs: 0,
        },
      });
      visited.add(root.id);
      const children = forward.get(root.id) || [];
      for (const child of children) queue.push(child.targetId);
    } else {
      queue.push(root.id);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;

    const nodeParents = parents.get(nodeId) || [];
    if (nodeParents.some((p) => !visited.has(p))) {
      queue.push(nodeId);
      continue;
    }

    visited.add(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const chain = buildAncestorChain(nodeId, parents, nodeOutputs, nodes);
    const { debugLog, data } = await executeNode(node, chain, { runId: run.id, stepNr: ++stepNr });
    stepResults.push(debugLog);

    if (!nodeOutputs.has(nodeId)) {
      nodeOutputs.set(nodeId, {
        data: data ?? null,
        success: debugLog.success,
        error: debugLog.success ? null : debugLog.logs.find((l) => l.type === "error")?.message ?? null,
      });
    }

    const children = forward.get(nodeId) || [];

    if (node.data.title === "Conditional" && data && typeof data === "object" && "condition" in data) {
      const condition = (data as { condition: boolean }).condition;
      const targetHandle = condition ? "success" : "failure";
      const matching = children.find((c) => c.sourceHandle === targetHandle);
      if (matching) queue.push(matching.targetId);
    } else {
      for (const child of children) queue.push(child.targetId);
    }
  }

  const allPassed = stepResults.every((r) => r.success);

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: allPassed ? "success" : "error",
      finishedAt: new Date().toISOString(),
      error: allPassed ? null : "One or more nodes failed",
    },
  });

  return { success: allPassed, runId: run.id, error: allPassed ? undefined : "One or more nodes failed" };
}

const worker = new Worker<WorkflowJobData>(
  QUEUE_NAME,
  async (job: Job<WorkflowJobData>) => {
    const { workflowId, source, body } = job.data;

    if (source === "discord-listen") {
      const triggerBody = await prepareDiscordListenBody(workflowId, body);
      if (!triggerBody) return { success: true, runId: "", error: "No new Discord messages" };
      return executeWorkflow(workflowId, source, triggerBody);
    }

    return executeWorkflow(workflowId, source, body);
  },
  { connection },
);

worker.on("completed", (job: Job<WorkflowJobData>, result: JobResult) => {
  console.log(`[queue] Job ${job.id} completed: ${result.runId} success=${result.success}`);
});

worker.on("failed", (job: Job<WorkflowJobData> | undefined, err: Error) => {
  console.error(`[queue] Job ${job?.id} failed: ${err.message}`);
});

export async function enqueueWorkflow(data: WorkflowJobData): Promise<string> {
  const job = await workflowQueue.add(QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
  return job.id ?? "";
}

export async function getJobResult(jobId: string): Promise<JobResult | null> {
  const job = await workflowQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  if (state === "completed") return job.returnvalue as JobResult;
  if (state === "failed") return { success: false, runId: "", error: job.failedReason };
  return null;
}

export async function shutdownQueue(): Promise<void> {
  await worker.close();
  await workflowQueue.close();
}
