"use client";

import { useCallback } from "react";
import type { Node, ReactFlowInstance } from "reactflow";
import type { EditorAction } from "@/providers/editor-provider";

export function useCanvasDrop({
  reactFlowInstance,
  setNodes,
  dispatch,
}: {
  reactFlowInstance: ReactFlowInstance | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type");
      const title = event.dataTransfer.getData("application/reactflow-title");
      const description = event.dataTransfer.getData("application/reactflow-description");

      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: "cardNode",
        position,
        data: { title, description, type, completed: false, current: false, metadata: {} },
      };

      setNodes((current) => [...current, newNode]);
      dispatch({ type: "ADD_NODE", payload: newNode as never });
    },
    [reactFlowInstance, setNodes, dispatch],
  );

  return { onDragOver, onDrop };
}
