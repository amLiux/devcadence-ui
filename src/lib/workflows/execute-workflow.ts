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
import { parseWorkflowVariables } from "./variables";
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

type ForwardMap = ReturnType<typeof buildForwardMap>;
type ParentsMap = ReturnType<typeof buildParentMap>;

interface RunState {
  runId: string;
  nodeOutputs: Map<string, NodeOutput>;
  stepResults: NodeDebugLog[];
  visited: Set<string>;
  stepNr: number;
  variables: Record<string, string>;
}

const now = () => new Date().toISOString();

async function failRun(runId: string, error: string): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: "error", finishedAt: new Date().toISOString(), error },
  });
}

async function seedTriggerRoots({
  roots,
  forward,
  body,
  state,
}: {
  roots: EditorNode[];
  forward: ForwardMap;
  body: unknown;
  state: RunState;
}): Promise<string[]> {
  const queue: string[] = [];

  for (const root of roots) {
    const isTriggerWithBody = root.data.type === "Trigger" && Boolean(body);
    if (!isTriggerWithBody) {
      queue.push(root.id);
      continue;
    }

    const title = root.data.title;
    state.nodeOutputs.set(root.id, { data: body, success: true, error: null });
    const startedAt = now();
    state.stepNr++;
    state.stepResults.push({
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
        runId: state.runId,
        nodeId: root.id,
        nodeType: title,
        stepNr: state.stepNr,
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
    state.visited.add(root.id);
    for (const child of forward.get(root.id) || []) queue.push(child.targetId);
  }

  return queue;
}

async function walkNodes({
  queue,
  nodes,
  parents,
  forward,
  nodeIds,
  state,
}: {
  queue: string[];
  nodes: EditorNode[];
  parents: ParentsMap;
  forward: ForwardMap;
  nodeIds: Set<string>;
  state: RunState;
}): Promise<void> {
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (state.visited.has(nodeId)) continue;

    const nodeParents = parents.get(nodeId) || [];
    if (nodeParents.some((parent) => !state.visited.has(parent))) {
      queue.push(nodeId);
      continue;
    }

    state.visited.add(nodeId);
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) continue;

    const chain = buildAncestorChain(nodeId, parents, state.nodeOutputs, nodes);
    const { debugLog, data } = await executeNode(node, chain, {
      runId: state.runId,
      stepNr: ++state.stepNr,
      variables: state.variables,
    });
    state.stepResults.push(debugLog);

    if (!state.nodeOutputs.has(nodeId)) {
      state.nodeOutputs.set(nodeId, {
        data: data ?? null,
        success: debugLog.success,
        error: debugLog.success
          ? null
          : (debugLog.logs.find((log) => log.type === "error")?.message ?? null),
      });
    }

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      queue.push(targetId);
    }
  }
}

async function finalizeRun({
  workflowId,
  source,
  body,
  state,
}: {
  workflowId: string;
  source: WorkflowJobData["source"];
  body: unknown;
  state: RunState;
}): Promise<{ success: boolean; failureMessage: string }> {
  const success = state.stepResults.every((result) => result.success);
  const failureMessage =
    state.stepResults.find((result) => !result.success)?.logs.find((log) => log.type === "error")
      ?.message ?? "One or more nodes failed";

  await prisma.workflowRun.update({
    where: { id: state.runId },
    data: {
      status: success ? "success" : "error",
      finishedAt: new Date().toISOString(),
      error: success ? null : failureMessage,
    },
  });

  if (!success) {
    await notifyRunFailure(state.runId);
    await enqueueAutoRetry({ workflowId, source, body, failedRunId: state.runId, failureMessage });
  }

  return { success, failureMessage };
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
  const state: RunState = {
    runId: run.id,
    nodeOutputs: new Map(),
    stepResults: [],
    visited: new Set(),
    stepNr: 0,
    variables: parseWorkflowVariables(workflow.variables),
  };

  const queue = await seedTriggerRoots({ roots, forward, body, state });
  await walkNodes({ queue, nodes, parents, forward, nodeIds, state });
  const outcome = await finalizeRun({ workflowId, source, body, state });

  return {
    success: outcome.success,
    runId: run.id,
    error: outcome.success ? undefined : outcome.failureMessage,
  };
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
  await enqueueWorkflow({ workflowId, source, body, runId: retry.runId }, { delayMs });
}
