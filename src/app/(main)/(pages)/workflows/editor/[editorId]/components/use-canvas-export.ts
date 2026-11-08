"use client";

import { useCallback } from "react";
import type { Edge, Node } from "reactflow";
import { pruneDanglingEdges } from "@/lib/workflows/graph";
import type { EditorNode, Workflow } from "@/lib/types";

export function useCanvasExport({
  nodes,
  edges,
  elements,
  workflow,
}: {
  nodes: Node[];
  edges: Edge[];
  elements: EditorNode[];
  workflow: Workflow;
}) {
  return useCallback(() => {
    const merged = nodes.map((node) => {
      const element = elements.find((item) => item.id === node.id);
      return { ...node, data: element?.data ?? node.data };
    });
    const exportData = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: workflow.type,
      },
      nodes: merged,
      edges: pruneDanglingEdges(merged, edges).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workflow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, elements, workflow]);
}
