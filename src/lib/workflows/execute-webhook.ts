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

const now = () => new Date().toISOString();

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

  const nodeOutputs = new Map<string, NodeOutput>();
  const stepResults: NodeDebugLog[] = [];
  const visited = new Set<string>();
  let stepNr = 0;

  // Store the webhook payload BEFORE walking so downstream nodes can access it.
  const webhookNode = findWebhookNode(nodes, connectionId);
  if (webhookNode) {
    nodeOutputs.set(webhookNode.id, { data: body, success: true, error: null });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const queue: string[] = [];

  for (const root of roots) {
    const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
    if (isWebhookTrigger) {
      const startedAt = now();
      stepNr++;
      const payload = sanitize(body).sanitized;
      stepResults.push({
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
          runId: run.id,
          nodeId: root.id,
          nodeType: "Webhook",
          stepNr,
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
      visited.add(root.id);
      for (const child of forward.get(root.id) || []) queue.push(child.targetId);
    } else {
      queue.push(root.id);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;

    const nodeParents = parents.get(nodeId) || [];
    if (nodeParents.some((parent) => !visited.has(parent))) {
      queue.push(nodeId);
      continue;
    }

    visited.add(nodeId);
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) continue;

    const chain = buildAncestorChain(nodeId, parents, nodeOutputs, nodes);
    const { debugLog, data } = await executeNode(node, chain, {
      runId: run.id,
      stepNr: ++stepNr,
    });
    stepResults.push(debugLog);

    if (!nodeOutputs.has(nodeId)) {
      nodeOutputs.set(nodeId, {
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

  const allPassed = stepResults.every((result) => result.success);
  const failureMessage =
    stepResults.find((result) => !result.success)?.logs.find((log) => log.type === "error")
      ?.message ?? "One or more nodes failed";

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
    await enqueueAutoRetry({
      workflowId: workflow.id,
      source: "webhook",
      body,
      failedRunId: run.id,
      failureMessage,
    });
  }

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    success: allPassed,
    steps: stepResults,
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
        payload: {
          success: false,
          message: "Webhook rate limit exceeded",
          rateLimited,
        },
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
