import { prisma } from "@/lib/db";
import { sanitize } from "@/lib/workflows/sanitize";
import { notifyRunFailure } from "@/lib/notifications/notify";
import { enqueueAutoRetry } from "@/lib/workflows/execute-workflow";
import {
  filterValidWorkflows,
  findMatchingWorkflows,
  type WebhookWorkflow,
} from "./webhook-selection";
import { parseWorkflowVariables } from "./variables";
import { runGraph, type RunGraphState } from "./run-graph";
import type { EditorNode, EditorEdge } from "@/lib/types";

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
  steps: RunGraphState["stepResults"];
  runId: string;
}

async function finalizeRun({
  workflow,
  body,
  state,
}: {
  workflow: WebhookWorkflow;
  body: unknown;
  state: RunGraphState;
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

  const state = await runGraph({
    nodes,
    edges,
    runId: run.id,
    variables: parseWorkflowVariables(workflow.variables),
    seed: async ({ root, state: seedState, queue, forward }) => {
      const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
      if (!isWebhookTrigger) return "queue";

      seedState.nodeOutputs.set(root.id, { data: body, success: true, error: null });
      const startedAt = now();
      seedState.stepNr++;
      const payload = sanitize(body).sanitized;
      seedState.stepResults.push({
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
          runId: seedState.runId,
          nodeId: root.id,
          nodeType: "Webhook",
          stepNr: seedState.stepNr,
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
      seedState.visited.add(root.id);
      for (const child of forward.get(root.id) || []) queue.push(child.targetId);
      return "seeded";
    },
  });

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
