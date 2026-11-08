import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  findRoots,
  type NodeOutput,
} from "@/lib/workflow-context";
import { executeNode } from "@/lib/workflows/execute-node";
import { resolveNextNodeIds } from "@/lib/workflows/routing";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry } from "@/lib/types";

export type ForwardMap = ReturnType<typeof buildForwardMap>;
export type ParentsMap = ReturnType<typeof buildParentMap>;

export interface RunGraphState {
  runId: string;
  variables: Record<string, string>;
  nodeOutputs: Map<string, NodeOutput>;
  stepResults: NodeDebugLog[];
  visited: Set<string>;
  stepNr: number;
  lastResult: unknown;
}

export type SeedResult = "queue" | "seeded" | "abort";

export interface SeedContext {
  root: EditorNode;
  state: RunGraphState;
  queue: string[];
  forward: ForwardMap;
}

export type SeedRoot = (context: SeedContext) => Promise<SeedResult> | SeedResult;

export interface RunGraphOptions {
  nodes: EditorNode[];
  edges: EditorEdge[];
  runId: string;
  variables?: Record<string, string>;
  seed?: SeedRoot;
  /** Queue preserves breadth-first order and defers nodes until parents finish. */
  order?: "queue" | "dfs";
  onStepStart?: (node: EditorNode) => void;
  onLog?: (nodeId: string, entry: LogEntry) => void;
  onStep?: (debugLog: NodeDebugLog) => void;
}

interface WalkContext {
  nodes: EditorNode[];
  parents: ParentsMap;
  forward: ForwardMap;
  nodeIds: Set<string>;
  state: RunGraphState;
  onStepStart?: (node: EditorNode) => void;
  onLog?: (nodeId: string, entry: LogEntry) => void;
  onStep?: (debugLog: NodeDebugLog) => void;
}

function createState(runId: string, variables: Record<string, string>): RunGraphState {
  return {
    runId,
    variables,
    nodeOutputs: new Map(),
    stepResults: [],
    visited: new Set(),
    stepNr: 0,
    lastResult: undefined,
  };
}

async function executeGraphNode(
  node: EditorNode,
  context: WalkContext,
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const { parents, state, nodes, onLog } = context;
  const chain = buildAncestorChain(node.id, parents, state.nodeOutputs, nodes);
  const { debugLog, data } = await executeNode(node, chain, {
    runId: state.runId,
    stepNr: ++state.stepNr,
    variables: state.variables,
    onLog: onLog ? (entry) => onLog(node.id, entry) : undefined,
  });

  state.stepResults.push(debugLog);
  if (!state.nodeOutputs.has(node.id)) {
    state.nodeOutputs.set(node.id, {
      data: data ?? null,
      success: debugLog.success,
      error: debugLog.success
        ? null
        : (debugLog.logs.find((log) => log.type === "error")?.message ?? null),
    });
  }
  state.lastResult = data;

  return { debugLog, data };
}

async function walkQueue(queue: string[], context: WalkContext): Promise<void> {
  const { parents, forward, nodeIds, state, onStepStart, onStep } = context;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (state.visited.has(nodeId)) continue;

    const nodeParents = parents.get(nodeId) || [];
    if (nodeParents.some((parent) => !state.visited.has(parent))) {
      queue.push(nodeId);
      continue;
    }

    state.visited.add(nodeId);
    const node = context.nodes.find((item) => item.id === nodeId);
    if (!node) continue;

    onStepStart?.(node);
    const { debugLog, data } = await executeGraphNode(node, context);
    onStep?.(debugLog);

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      queue.push(targetId);
    }
  }
}

async function walkDepthFirst(queue: string[], context: WalkContext): Promise<void> {
  const { forward, nodeIds, state, onStepStart, onStep } = context;

  const walk = async (nodeId: string): Promise<void> => {
    if (state.visited.has(nodeId)) return;
    state.visited.add(nodeId);

    const node = context.nodes.find((item) => item.id === nodeId);
    if (!node) return;

    onStepStart?.(node);
    const { debugLog, data } = await executeGraphNode(node, context);
    onStep?.(debugLog);

    const children = forward.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      await walk(targetId);
    }
  };

  for (const nodeId of queue) {
    await walk(nodeId);
  }
}

/**
 * Runs the workflow graph from its roots. Entry points keep their own policy
 * (trigger seeding, streaming, retry/notify) and use this for the traversal.
 */
export async function runGraph({
  nodes,
  edges,
  runId,
  variables = {},
  seed,
  order = "queue",
  onStepStart,
  onLog,
  onStep,
}: RunGraphOptions): Promise<RunGraphState> {
  const parents = buildParentMap(edges);
  const forward = buildForwardMap(edges);
  const roots = findRoots(nodes, edges);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const state = createState(runId, variables);
  const queue: string[] = [];

  for (const root of roots) {
    const result = seed ? await seed({ root, state, queue, forward }) : "queue";
    if (result === "abort") return state;
    if (result === "queue") queue.push(root.id);
  }

  const context: WalkContext = {
    nodes,
    parents,
    forward,
    nodeIds,
    state,
    onStepStart,
    onLog,
    onStep,
  };

  if (order === "dfs") {
    await walkDepthFirst(queue, context);
  } else {
    await walkQueue(queue, context);
  }

  return state;
}
