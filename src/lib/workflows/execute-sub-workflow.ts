import type { NodeOutput } from "@/lib/workflow-context";
import { runGraph } from "./run-graph";
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
  variables = {},
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  runId: string;
  variables?: Record<string, string>;
}): Promise<SubWorkflowRunResult> {
  const state = await runGraph({ nodes, edges, runId, variables });

  return {
    debugLogs: state.stepResults,
    context: Object.fromEntries(state.nodeOutputs),
    lastResult: state.lastResult,
  };
}
