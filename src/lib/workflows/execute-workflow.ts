import { prisma } from "@/lib/db";
import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  findRoots,
  type NodeOutput,
} from "@/lib/workflow-context";
import { executeNode } from "@/lib/workflows/execute-node";
import { resolveNextNodeIds } from "@/lib/workflows/routing";
import { sanitize } from "@/lib/workflows/sanitize";
import { notifyRunFailure } from "@/lib/notifications/notify";
import { enqueueWorkflow, type WorkflowJobData } from "@/lib/queue";
import { scheduleAutoRetry } from "./run-retries";
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

export interface ExecuteRunResult {
  success: boolean;
  runId: string;
  error?: string;
}

export interface ExecuteRunOptions {
  workflowId: string;
  source: WorkflowJobData["source"];
  body?: unknown;
  /** When set, execute this run instead of creating a new one. */
  runId?: string;
}

const now = () => new Date().toISOString();

async function failRun(runId: string, error: string): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: "error", finishedAt: new Date().toISOString(), error },
  });
}

/**
 * Executes a workflow, either as a new run or as the given existing run.
 * Shared by the queue worker and the manual retry endpoint.
 */
export async function executeWorkflowRun({
  workflowId,
  source,
  body,
  runId,
}: ExecuteRunOptions): Promise<ExecuteRunResult> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) {
    if (runId) await failRun(runId, "Workflow not found");
    return { success: false, runId: runId ?? "", error: "Workflow not found" };
  }

  const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
  const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

  if (nodes.length === 0) {
    if (runId) await failRun(runId, "Workflow has no nodes");
    return { success: false, runId: runId ?? "", error: "Workflow has no nodes" };
  }

  const run = runId
    ? await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "running", startedAt: new Date(), nextRetryAt: null },
      })
    : await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          source,
          triggerPayload: body ? sanitize(body).sanitized : null,
        },
      });

  const parents = buildParentMap(edges);
  const forward = buildForwardMap(edges);
  const roots = findRoots(nodes, edges);

  const nodeIds = new Set(nodes.map((node) => node.id));
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
        nodeId: root.id,
        title,
        success: true,
        logs: [
          { type: "info", message: `Starting ${title}...`, timestamp: startedAt },
          { type: "success", message: `${title} completed in 0ms`, timestamp: now() },
        ],
      });
      await prisma.workflowLog.create({
        data: {
          runId: run.id,
          nodeId: root.id,
          nodeType: title,
          stepNr,
          status: "success",
          input: undefined,
          output: sanitize(body).sanitized,
          error: null,
          controlFlow: undefined,
          meta: undefined,
          startedAt,
          finishedAt: now(),
          elapsedMs: 0,
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
        error: debugLog.success
          ? null
          : (debugLog.logs.find((l) => l.type === "error")?.message ?? null),
      });
    }

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      queue.push(targetId);
    }
  }

  const allPassed = stepResults.every((r) => r.success);
  const failureMessage =
    stepResults.find((r) => !r.success)?.logs.find((l) => l.type === "error")?.message ??
    "One or more nodes failed";

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: allPassed ? "success" : "error",
      finishedAt: new Date().toISOString(),
      error: allPassed ? null : failureMessage,
    },
  });

  if (!allPassed) {
    await notifyRunFailure(run.id);
    await enqueueAutoRetry({ workflowId, source, body, failedRunId: run.id, failureMessage });
  }

  return { success: allPassed, runId: run.id, error: allPassed ? undefined : failureMessage };
}

/**
 * Creates the next run in the chain when the policy allows it and schedules it
 * on the queue after the backoff delay.
 */
export async function enqueueAutoRetry({
  workflowId,
  source,
  body,
  failedRunId,
  failureMessage,
}: {
  workflowId: string;
  source: WorkflowJobData["source"];
  body?: unknown;
  failedRunId: string;
  failureMessage: string;
}): Promise<void> {
  const retry = await scheduleAutoRetry(failedRunId, { message: failureMessage });
  if (!retry) return;

  const delayMs = Math.max(0, retry.nextRetryAt.getTime() - Date.now());
  await enqueueWorkflow(
    { workflowId, source, body, runId: retry.runId },
    { delayMs },
  );
}
