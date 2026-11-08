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
import { notifyRunFailure } from "@/lib/notifications/notify";
import { enqueueAutoRetry } from "@/lib/workflows/execute-workflow";
import { sanitize } from "@/lib/workflows/sanitize";
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";
import {
  filterValidWorkflows,
  findMatchingWorkflows,
  findWebhookNode,
  type WebhookWorkflow,
} from "./webhook-selection";
import { parseWorkflowVariables } from "./variables";

const now = () => new Date().toISOString();

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

export interface WebhookExecutionResult {
  status: number;
  headers?: Record<string, string>;
  payload: Record<string, unknown>;
}

interface WebhookWorkflowResult {
  workflowId: string;
  workflowName: string;
  success: boolean;
  steps: NodeDebugLog[];
  runId: string;
}

async function seedRoots({
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
    const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
    if (!isWebhookTrigger) {
      queue.push(root.id);
      continue;
    }

    const startedAt = now();
    state.stepNr++;
    const payload = sanitize(body).sanitized;
    state.stepResults.push({
      nodeId: root.id,
      title: "Webhook",
      success: true,
      logs: [
        { type: "info", message: "Starting Webhook...", timestamp: startedAt },
        { type: "info", message: `Input: ${JSON.stringify(payload)}`, timestamp: startedAt },
        { type: "success", message: "Webhook completed in 0ms", timestamp: now() },
        { type: "info", message: `Output: ${JSON.stringify(payload)}`, timestamp: now() },
      ],
    });
    await prisma.workflowLog.create({
      data: {
        runId: state.runId,
        nodeId: root.id,
        nodeType: "Webhook",
        stepNr: state.stepNr,
        status: "success",
        input: undefined,
        output: payload,
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
          : (debugLog.logs.find((log) => log.type === "error")?.message ?? "Unknown error"),
      });
    }

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      queue.push(targetId);
    }
  }
}

async function finalizeRun({
  workflow,
  body,
  state,
}: {
  workflow: WebhookWorkflow;
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
    await enqueueAutoRetry({
      workflowId: workflow.id,
      source: "webhook",
      body,
      failedRunId: state.runId,
      failureMessage,
    });
  }

  return { success, failureMessage };
}

async function executeWebhookWorkflow(
  workflow: WebhookWorkflow,
  connectionId: string,
  body: unknown,
): Promise<WebhookWorkflowResult> {
  const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
  const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      source: "webhook",
      triggerPayload: sanitize(body).sanitized,
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

  // Store the webhook payload BEFORE walking so downstream nodes can access it.
  const webhookNode = findWebhookNode(nodes, connectionId);
  if (webhookNode) {
    state.nodeOutputs.set(webhookNode.id, { data: body, success: true, error: null });
  }

  const queue = await seedRoots({ roots, forward, body, state });
  await walkNodes({ queue, nodes, parents, forward, nodeIds, state });
  const outcome = await finalizeRun({ workflow, body, state });

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    success: outcome.success,
    steps: state.stepResults,
    runId: run.id,
  };
}

export async function executeWebhook(
  connectionId: string,
  body: unknown,
): Promise<WebhookExecutionResult> {
  const matchingWorkflows = await findMatchingWorkflows(connectionId);

  if (matchingWorkflows.length === 0) {
    return {
      status: 200,
      payload: {
        success: true,
        message: "Webhook received but no active workflows match this webhook",
      },
    };
  }

  const { validWorkflows, validationErrors, rateLimited } = await filterValidWorkflows(
    matchingWorkflows,
    connectionId,
    body,
  );

  if (validWorkflows.length === 0) {
    if (rateLimited.length > 0) {
      const maxRetryAfter = Math.max(...rateLimited.map((item) => item.retryAfter));
      return {
        status: 429,
        headers: { "Retry-After": String(maxRetryAfter) },
        payload: { success: false, message: "Webhook rate limit exceeded", rateLimited },
      };
    }
    return {
      status: 422,
      payload: {
        success: false,
        message: "Webhook payload failed validation against all matching workflows",
        errors: validationErrors,
      },
    };
  }

  const results: WebhookWorkflowResult[] = [];
  for (const workflow of validWorkflows) {
    results.push(await executeWebhookWorkflow(workflow, connectionId, body));
  }

  const payload: Record<string, unknown> = {
    success: true,
    message: `Webhook triggered ${results.length} workflow(s)`,
    results,
  };
  if (validationErrors.length > 0) payload.validationErrors = validationErrors;
  if (rateLimited.length > 0) payload.rateLimited = rateLimited;

  return { status: 200, payload };
}
