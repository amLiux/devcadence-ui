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
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

const now = () => new Date().toISOString();

interface StreamState {
  stepNr: number;
  results: NodeDebugLog[];
  visited: Set<string>;
  nodeOutputs: Map<string, NodeOutput>;
}

type ForwardMap = ReturnType<typeof buildForwardMap>;

async function recordInvalidPayload({
  root,
  runId,
  enqueue,
  state,
}: {
  root: EditorNode;
  runId: string;
  enqueue: (message: unknown) => void;
  state: StreamState;
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
  state.results.push(step);
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

async function processWebhookRoot({
  root,
  runId,
  forward,
  nodes,
  enqueue,
  state,
}: {
  root: EditorNode;
  runId: string;
  forward: ForwardMap;
  nodes: EditorNode[];
  enqueue: (message: unknown) => void;
  state: StreamState;
}): Promise<{ aborted: boolean; rootsToWalk: EditorNode[] }> {
  const meta = (root.data.metadata || {}) as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;

  if (meta.testPayload) {
    try {
      payload = JSON.parse(meta.testPayload);
    } catch {
      await recordInvalidPayload({ root, runId, enqueue, state });
      return { aborted: true, rootsToWalk: [] };
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
  state.results.push(step);
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

  const rootsToWalk: EditorNode[] = [];
  for (const child of forward.get(root.id) || []) {
    const childNode = nodes.find((item: EditorNode) => item.id === child.targetId);
    if (childNode) rootsToWalk.push(childNode);
  }
  return { aborted: false, rootsToWalk };
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
  const parents = buildParentMap(edges);
  const forward = buildForwardMap(edges);
  const roots = findRoots(nodes, edges);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const state: StreamState = {
    stepNr: 0,
    results: [],
    visited: new Set(),
    nodeOutputs: new Map(),
  };

  async function walk(nodeId: string) {
    if (state.visited.has(nodeId)) return;
    state.visited.add(nodeId);

    const node = nodes.find((item: EditorNode) => item.id === nodeId);
    if (!node) return;

    const chain = buildAncestorChain(nodeId, parents, state.nodeOutputs, nodes);
    enqueue({ type: "step-start", nodeId, title: node.data.title });
    const { debugLog, data } = await executeNode(node, chain, {
      runId,
      stepNr: ++state.stepNr,
      variables,
      onLog: (entry) => enqueue({ type: "log", nodeId, entry }),
    });
    state.results.push(debugLog);
    enqueue({ type: "step", step: debugLog });

    state.nodeOutputs.set(nodeId, {
      data: data ?? null,
      success: debugLog.success,
      error: debugLog.success
        ? null
        : (debugLog.logs.find((log) => log.type === "error")?.message ?? "Unknown error"),
    });

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      await walk(targetId);
    }
  }

  const rootsToWalk: EditorNode[] = [];
  for (const root of roots) {
    const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
    if (isWebhookTrigger) {
      const outcome = await processWebhookRoot({
        root,
        runId,
        forward,
        nodes,
        enqueue,
        state,
      });
      if (outcome.aborted) return;
      rootsToWalk.push(...outcome.rootsToWalk);
    } else {
      rootsToWalk.push(root);
    }
  }

  for (const root of rootsToWalk) {
    await walk(root.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullContext: Record<string, any> = {};
  for (const [nodeId, output] of state.nodeOutputs) {
    const node = nodes.find((item: EditorNode) => item.id === nodeId);
    fullContext[nodeId] = {
      name: node?.data.title ?? "Unknown",
      ...output,
    };
  }

  const allPassed = state.results.every((result) => result.success);

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: allPassed ? "success" : "error",
      finishedAt: new Date().toISOString(),
      nodeOutputs: fullContext,
      error: allPassed
        ? null
        : `${state.results.filter((result) => !result.success).length} node(s) failed`,
    },
  });

  enqueue({
    type: "result",
    context: fullContext,
    success: allPassed,
    message: allPassed
      ? `All ${state.results.length} node(s) passed`
      : `${state.results.filter((result) => result.success).length}/${state.results.length} nodes passed`,
    runId,
  });
}
