"use client";

import { useEffect, type MutableRefObject } from "react";
import type { Edge, Node } from "reactflow";
import type { EditorAction, SidebarTab } from "@/providers/editor-provider";
import type { EditorNode, WorkflowContext } from "@/lib/types";
import type { useDebugLogs } from "@/hooks/use-debug-logs";

export function useCanvasEvents({
  elements,
  context,
  workflowId,
  edges,
  debugRef,
  selectNode,
  setSidebarTab,
  setNodes,
  setEdges,
  dispatch,
}: {
  elements: EditorNode[];
  context: WorkflowContext;
  workflowId: string;
  edges: Edge[];
  debugRef: MutableRefObject<ReturnType<typeof useDebugLogs>>;
  selectNode: (node: EditorNode | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  dispatch: React.Dispatch<EditorAction>;
}) {
  useEffect(() => {
    const handleNodeEdit = (event: Event) => {
      const nodeId = (event as CustomEvent).detail.nodeId;
      const node = elements.find((item) => item.id === nodeId);
      if (node) {
        selectNode(node);
        setSidebarTab("settings");
      }
    };

    const handleNodeDelete = (event: Event) => {
      const nodeId = (event as CustomEvent).detail.nodeId;
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) =>
        current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      dispatch({ type: "DELETE_NODE", payload: { nodeId } });
    };

    const handleNodeTest = (event: Event) => {
      const nodeId = (event as CustomEvent).detail.nodeId;
      const node = elements.find((item) => item.id === nodeId);
      if (!node) return;
      debugRef.current.testNode(node, workflowId, elements, edges, context);
    };

    window.addEventListener("node:edit", handleNodeEdit);
    window.addEventListener("node:delete", handleNodeDelete);
    window.addEventListener("node:test", handleNodeTest);

    return () => {
      window.removeEventListener("node:edit", handleNodeEdit);
      window.removeEventListener("node:delete", handleNodeDelete);
      window.removeEventListener("node:test", handleNodeTest);
    };
  }, [
    elements,
    context,
    workflowId,
    selectNode,
    setSidebarTab,
    setNodes,
    setEdges,
    dispatch,
    edges,
    debugRef,
  ]);
}
