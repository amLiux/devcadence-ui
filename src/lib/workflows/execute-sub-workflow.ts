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

export interface SubWorkflowRunResult {
  debugLogs: NodeDebugLog[];
  context: Record<string, NodeOutput>;
  lastResult: unknown;
}

export async function runSubWorkflow({
  nodes,
  edges,
  runId,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  runId: string;
}): Promise<SubWorkflowRunResult> {
  const parentMap = buildParentMap(edges);
  const forwardMap = buildForwardMap(edges);
  const roots = findRoots(nodes, edges);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const visited = new Set<string>();
  const queue = roots.map((node) => node.id);

  const context: Record<string, NodeOutput> = {};
  const debugLogs: NodeDebugLog[] = [];
  let lastResult: unknown;
  let stepNr = 0;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((item) => item.id === nodeId);
    if (!node) continue;

    const parents = parentMap.get(nodeId) || [];
    if (parents.some((parent) => !visited.has(parent))) {
      queue.push(nodeId);
      continue;
    }

    const ancestorChain = buildAncestorChain(
      nodeId,
      parentMap,
      new Map(Object.entries(context)),
      nodes,
    );
    const { debugLog, data } = await executeNode(node, ancestorChain, {
      runId,
      stepNr: ++stepNr,
    });

    debugLogs.push(debugLog);
    context[nodeId] = { data, success: true, error: null };
    lastResult = data;

    const children = forwardMap.get(nodeId) || [];
    for (const targetId of resolveNextNodeIds(node.data.title, data, children, nodeIds)) {
      if (!visited.has(targetId)) queue.push(targetId);
    }
  }

  return { debugLogs, context, lastResult };
}
