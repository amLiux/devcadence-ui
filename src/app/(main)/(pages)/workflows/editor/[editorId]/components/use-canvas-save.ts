"use client";

import { useCallback, useEffect, useState, type MutableRefObject } from "react";
import type { Edge, Node } from "reactflow";
import { pruneDanglingEdges } from "@/lib/workflows/graph";
import type { EditorNode, Workflow } from "@/lib/types";
import type { useApi } from "@/hooks/use-api";

export function useCanvasSave({
  nodes,
  edges,
  elements,
  workflow,
  request,
  markCleanAfterSave,
  onSaveRef,
}: {
  nodes: Node[];
  edges: Edge[];
  elements: EditorNode[];
  workflow: Workflow;
  request: ReturnType<typeof useApi>["request"];
  markCleanAfterSave: () => void;
  onSaveRef?: MutableRefObject<(() => Promise<void>) | null>;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const merged = nodes.map((node) => {
        const element = elements.find((item) => item.id === node.id);
        return { ...node, data: element?.data ?? node.data };
      });
      // Edges left behind by deleted nodes would otherwise be saved forever.
      const validEdges = pruneDanglingEdges(merged, edges);
      await request({
        endpoint: `/api/workflows/${workflow.id}`,
        method: "PUT",
        data: {
          nodes: JSON.stringify(merged),
          edges: JSON.stringify(validEdges),
        },
      });
      markCleanAfterSave();
    } finally {
      setSaving(false);
    }
  }, [nodes, elements, request, workflow.id, edges, markCleanAfterSave]);

  useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSave;
  }, [handleSave, onSaveRef]);

  return { saving, handleSave };
}
