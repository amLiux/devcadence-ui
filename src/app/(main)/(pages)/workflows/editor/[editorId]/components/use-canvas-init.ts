"use client";

import { useEffect } from "react";
import type { Edge, Node, ReactFlowInstance } from "reactflow";
import type { EditorAction } from "@/providers/editor-provider";
import { createDefaultSubWorkflowNodes, type Workflow } from "@/lib/types";

export function useCanvasInit({
  workflow,
  setNodes,
  setEdges,
  dispatch,
  markClean,
  reactFlowInstance,
}: {
  workflow: Workflow;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  dispatch: React.Dispatch<EditorAction>;
  markClean: (nodes: Node[], edges: Edge[]) => void;
  reactFlowInstance: ReactFlowInstance | null;
}) {
  useEffect(() => {
    const loadDefaults = () => {
      const { inputNode, returnNode } = createDefaultSubWorkflowNodes();
      setNodes([inputNode, returnNode]);
      dispatch({
        type: "LOAD_DATA",
        payload: { elements: [inputNode, returnNode] as never[], edges: [] },
      });
      setTimeout(() => {
        markClean([inputNode, returnNode], []);
        reactFlowInstance?.fitView({ padding: 0.2 });
      }, 0);
    };

    if (workflow.nodes) {
      try {
        const savedNodes = JSON.parse(workflow.nodes) as Node[];
        const savedEdges = JSON.parse(workflow.edges || "[]") as Edge[];

        if (savedNodes.length === 0 && workflow.type === "sub-workflow") {
          loadDefaults();
        } else {
          setNodes(savedNodes);
          setEdges(savedEdges);
          dispatch({
            type: "LOAD_DATA",
            payload: { elements: savedNodes as never[], edges: savedEdges as never[] },
          });
          setTimeout(() => {
            markClean(savedNodes, savedEdges);
            reactFlowInstance?.fitView({ padding: 0.2 });
          }, 0);
        }
      } catch {
        // Invalid JSON, start fresh.
      }
    } else if (workflow.type === "sub-workflow") {
      loadDefaults();
    }
  }, [
    workflow.nodes,
    workflow.edges,
    workflow.type,
    setNodes,
    setEdges,
    dispatch,
    markClean,
    reactFlowInstance,
  ]);
}
