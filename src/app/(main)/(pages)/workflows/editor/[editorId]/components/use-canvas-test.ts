"use client";

import { useCallback } from "react";
import type { Edge } from "reactflow";
import type { useDebugLogs } from "@/hooks/use-debug-logs";
import type { EditorNode, Workflow, WorkflowContext } from "@/lib/types";

export function useCanvasTest({
  elements,
  workflow,
  edges,
  debug,
  setContext,
}: {
  elements: EditorNode[];
  workflow: Workflow;
  edges: Edge[];
  debug: ReturnType<typeof useDebugLogs>;
  setContext: (context: WorkflowContext | ((prev: WorkflowContext) => WorkflowContext)) => void;
}) {
  return useCallback(async () => {
    setContext((previous) => {
      const fresh: WorkflowContext = {};
      for (const node of elements) {
        fresh[node.id] = previous[node.id]
          ? { ...previous[node.id], output: null, success: false, error: null }
          : { name: node.data.title, output: null, success: false, error: null };
      }
      return fresh;
    });
    await debug.testWorkflow(workflow, elements, edges);
  }, [elements, workflow, edges, debug, setContext]);
}
