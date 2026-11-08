import { prisma } from "@/lib/db";
import { sanitize } from "@/lib/workflows/sanitize";
import { notifyRunFailure } from "@/lib/notifications/notify";
import { enqueueWorkflow, type WorkflowJobData } from "@/lib/queue";
import { scheduleAutoRetry } from "./run-retries";
import { parseWorkflowVariables } from "./variables";
import { runGraph, type RunGraphState } from "./run-graph";
import type { EditorNode, EditorEdge } from "@/lib/types";

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

async function finalizeRun({
  workflowId,
  source,
  body,
  state,
}: {
  workflowId: string;
  source: WorkflowJobData["source"];
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

  const state = await runGraph({
    nodes,
    edges,
    runId: run.id,
    variables: parseWorkflowVariables(workflow.variables),
    seed: async ({ root, state: seedState, queue, forward }) => {
      const isTriggerWithBody = root.data.type === "Trigger" && Boolean(body);
      if (!isTriggerWithBody) return "queue";

      const title = root.data.title;
      seedState.nodeOutputs.set(root.id, { data: body, success: true, error: null });
      const startedAt = now();
      seedState.stepNr++;
      seedState.stepResults.push({
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
          runId: seedState.runId,
          nodeId: root.id,
          nodeType: title,
          stepNr: seedState.stepNr,
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
      seedState.visited.add(root.id);
      for (const child of forward.get(root.id) || []) queue.push(child.targetId);
      return "seeded";
    },
  });

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
