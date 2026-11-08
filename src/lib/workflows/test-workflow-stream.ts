import { prisma } from "@/lib/db";
import { runGraph, type SeedContext, type SeedResult } from "./run-graph";
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

const now = () => new Date().toISOString();

async function recordInvalidPayload({
  root,
  runId,
  enqueue,
  state,
}: {
  root: EditorNode;
  runId: string;
  enqueue: (message: unknown) => void;
  state: SeedContext["state"];
}): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: "error", finishedAt: now(), error: "Invalid test payload JSON" },
  });
  state.stepNr++;
  const step: NodeDebugLog = {
    nodeId: root.id,
    title: "Webhook",
    success: false,
    logs: [
      { type: "info", message: "Starting Webhook...", timestamp: now() },
      {
        type: "error",
        message: "Invalid test payload JSON. Please provide valid JSON.",
        timestamp: now(),
      },
    ],
  };
  enqueue({ type: "step-start", nodeId: root.id, title: "Webhook" });
  for (const entry of step.logs) enqueue({ type: "log", nodeId: root.id, entry });
  enqueue({ type: "step", step });
  state.stepResults.push(step);
  await prisma.workflowLog.create({
    data: {
      runId,
      nodeId: root.id,
      nodeType: "Webhook",
      stepNr: state.stepNr,
      status: "error",
      input: undefined,
      output: undefined,
      error: "Invalid test payload JSON",
      controlFlow: undefined,
      meta: undefined,
      startedAt: now(),
      finishedAt: now(),
      elapsedMs: 0,
    },
  });
  state.visited.add(root.id);
  enqueue({
    type: "result",
    success: false,
    context: {},
    message: "Invalid test payload JSON",
    runId,
  });
}

async function seedWebhookRoot({
  root,
  runId,
  enqueue,
  state,
  queue,
  forward,
}: SeedContext & {
  runId: string;
  enqueue: (message: unknown) => void;
}): Promise<SeedResult> {
  const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
  if (!isWebhookTrigger) return "queue";

  const meta = (root.data.metadata || {}) as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;

  if (meta.testPayload) {
    try {
      payload = JSON.parse(meta.testPayload);
    } catch {
      await recordInvalidPayload({ root, runId, enqueue, state });
      return "abort";
    }
  }

  state.visited.add(root.id);
  state.stepNr++;
  const hasTestPayload = !!meta.testPayload;
  const logs = [
    { type: "info" as const, message: "Starting Webhook...", timestamp: now() },
    { type: "success" as const, message: "Webhook completed in 0ms", timestamp: now() },
  ];
  if (hasTestPayload) {
    logs.splice(1, 0, {
      type: "info" as const,
      message: `Input: ${JSON.stringify(payload)}`,
      timestamp: now(),
    });
    logs.push({
      type: "info" as const,
      message: `Output: ${JSON.stringify(payload)}`,
      timestamp: now(),
    });
  }
  const step: NodeDebugLog = { nodeId: root.id, title: "Webhook", success: true, logs };
  enqueue({ type: "step-start", nodeId: root.id, title: "Webhook" });
  for (const entry of step.logs) enqueue({ type: "log", nodeId: root.id, entry });
  enqueue({ type: "step", step });
  state.stepResults.push(step);
  await prisma.workflowLog.create({
    data: {
      runId,
      nodeId: root.id,
      nodeType: "Webhook",
      stepNr: state.stepNr,
      status: "success",
      input: hasTestPayload ? payload : undefined,
      output: hasTestPayload ? payload : undefined,
      error: null,
      controlFlow: undefined,
      meta: undefined,
      startedAt: now(),
      finishedAt: now(),
      elapsedMs: 0,
    },
  });
  state.nodeOutputs.set(root.id, { data: payload, success: true, error: null });

  for (const child of forward.get(root.id) || []) {
    queue.push(child.targetId);
  }
  return "seeded";
}

export async function runTestWorkflowStream({
  runId,
  nodes,
  edges,
  variables = {},
  enqueue,
}: {
  runId: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  variables?: Record<string, string>;
  enqueue: (message: unknown) => void;
}): Promise<void> {
  const state = await runGraph({
    nodes,
    edges,
    runId,
    variables,
    order: "dfs",
    seed: (context) => seedWebhookRoot({ ...context, runId, enqueue }),
    onStepStart: (node) =>
      enqueue({ type: "step-start", nodeId: node.id, title: node.data.title }),
    onLog: (nodeId, entry) => enqueue({ type: "log", nodeId, entry }),
    onStep: (debugLog) => enqueue({ type: "step", step: debugLog }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullContext: Record<string, any> = {};
  for (const [nodeId, output] of state.nodeOutputs) {
    const node = nodes.find((item) => item.id === nodeId);
    fullContext[nodeId] = {
      name: node?.data.title ?? "Unknown",
      ...output,
    };
  }

  const allPassed = state.stepResults.every((result) => result.success);

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: allPassed ? "success" : "error",
      finishedAt: new Date().toISOString(),
      nodeOutputs: fullContext,
      error: allPassed
        ? null
        : `${state.stepResults.filter((result) => !result.success).length} node(s) failed`,
    },
  });

  enqueue({
    type: "result",
    context: fullContext,
    success: allPassed,
    message: allPassed
      ? `All ${state.stepResults.length} node(s) passed`
      : `${state.stepResults.filter((result) => result.success).length}/${state.stepResults.length} nodes passed`,
    runId,
  });
}
