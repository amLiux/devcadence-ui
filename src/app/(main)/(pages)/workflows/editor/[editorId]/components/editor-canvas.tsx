"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEditor } from "@/providers/editor-provider";
import { EditorCanvasSidebar } from "./editor-canvas-sidebar";
import { EditorCanvasCard } from "./editor-canvas-card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useWorkflowDirty } from "@/hooks/use-workflow-dirty";
import { Save, Play, Download } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DebugModal } from "@/components/composed/debug-modal";
import { useDebugLogs } from "@/hooks/use-debug-logs";
import type { Workflow, WorkflowContext, EditorNode } from "@/lib/types";
import { createDefaultSubWorkflowNodes } from "@/lib/types";

const nodeTypes = { cardNode: EditorCanvasCard };

const minimapStyle = { height: 120, width: 200 };

interface Props {
  workflow: Workflow;
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function EditorCanvas({ workflow, onSaveRef }: Props) {
  const { editor, dispatch, setEdges: setEditorEdges, selectNode, setSidebarTab, setContext } = useEditor();
  const { request } = useApi();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [saving, setSaving] = useState(false);
  const debug = useDebugLogs({
    onWorkflowResult: (context) => setContext(context),
    onNodeResult: (nodeId, data, success, error) => {
      const node = editor.elements.find((n) => n.id === nodeId);
      if (!node) return;
      setContext((prev) => ({
        ...prev,
        [nodeId]: { name: node.data.title, output: data, success, error },
      }));
    },
  });

  const { markClean, markCleanAfterSave } = useWorkflowDirty({
    nodes,
    edges,
  });

  useEffect(() => {
    if (workflow.nodes) {
      try {
        const savedNodes = JSON.parse(workflow.nodes) as Node[];
        const savedEdges = JSON.parse(workflow.edges || "[]") as Edge[];
        
        // For new reusable workflows with no nodes yet, add defaults
        if (savedNodes.length === 0 && workflow.type === "sub-workflow") {
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
        // Invalid JSON, start fresh
      }
    } else if (workflow.type === "sub-workflow") {
      // nodes is null — brand new reusable workflow, add defaults
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
    }
  }, [workflow.nodes, workflow.edges, workflow.type, setNodes, setEdges, dispatch, markClean, reactFlowInstance]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge({ ...connection, animated: true }, edges);
      setEdges(newEdges);
      setEditorEdges(newEdges as never[]);
    },
    [edges, setEdges, setEditorEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const fresh = editor.elements.find((n) => n.id === node.id);
      selectNode((fresh || node) as never);
      setSidebarTab("settings");
    },
    [editor.elements, selectNode, setSidebarTab],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Listen for custom events from node cards (edit/delete buttons)
  useEffect(() => {
    const handleNodeEdit = (e: Event) => {
      const nodeId = (e as CustomEvent).detail.nodeId;
      const node = editor.elements.find((n) => n.id === nodeId);
      if (node) {
        selectNode(node as never);
        setSidebarTab("settings");
      }
    };
    const handleNodeDelete = (e: Event) => {
      const nodeId = (e as CustomEvent).detail.nodeId;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      dispatch({ type: "DELETE_NODE", payload: { nodeId } });
    };
    const handleNodeTest = (e: Event) => {
      const nodeId = (e as CustomEvent).detail.nodeId;
      const node = editor.elements.find((n) => n.id === nodeId);
      if (!node) return;
      debug.testNode(node, workflow.id, editor.elements as EditorNode[], edges, editor.context);
    };
    window.addEventListener("node:edit", handleNodeEdit);
    window.addEventListener("node:delete", handleNodeDelete);
    window.addEventListener("node:test", handleNodeTest);
    return () => {
      window.removeEventListener("node:edit", handleNodeEdit);
      window.removeEventListener("node:delete", handleNodeDelete);
      window.removeEventListener("node:test", handleNodeTest);
    };
  }, [editor.elements, editor.context, selectNode, setSidebarTab, setNodes, dispatch, setContext, edges]);

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

      setNodes((nds) => [...nds, newNode]);
      dispatch({ type: "ADD_NODE", payload: newNode as never });
    },
    [reactFlowInstance, setNodes, dispatch],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const merged = nodes.map((n) => {
        const el = editor.elements.find((e) => e.id === n.id);
        return { ...n, data: el?.data ?? n.data };
      });
      await request({
        endpoint: `/api/workflows/${workflow.id}`,
        method: "PUT",
        data: {
          nodes: JSON.stringify(merged),
          edges: JSON.stringify(edges),
        },
      });
      markCleanAfterSave();
    } finally {
      setSaving(false);
    }
  };

  // Expose save function to parent via ref
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSave;
    }
  }, [handleSave, onSaveRef]);
  const handleExport = () => {
    const merged = nodes.map((n) => {
      const el = editor.elements.find((e) => e.id === n.id);
      return { ...n, data: el?.data ?? n.data };
    });
    const exportData = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: workflow.type,
      },
      nodes: merged,
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestWorkflow = async () => {
    setContext((prev) => {
      const fresh: WorkflowContext = {};
      for (const node of editor.elements) {
        fresh[node.id] = prev[node.id]
          ? { ...prev[node.id], output: null, success: false, error: null }
          : { name: node.data.title, output: null, success: false, error: null };
      }
      return fresh;
    });
    await debug.testWorkflow(workflow, editor.elements, edges);
  };

  return (
    <>
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        <ResizablePanel defaultSize={70} minSize={50}>
          <div className="h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              deleteKeyCode="Delete"
              className="bg-background"
            >
              <Controls className="!bg-background !border-border !rounded-lg" />
              <MiniMap
                style={minimapStyle}
                className="!bg-background !border-border"
                zoomable
                pannable
              />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        </ResizablePanel>
        <ResizableHandle className="w-2 bg-border hover:bg-primary/50 transition-colors" />
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="h-full flex flex-col border-l">
            <div className="flex items-center gap-2 p-2 border-b">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestWorkflow}
                disabled={debug.running || nodes.length === 0}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {debug.running ? "Testing..." : "Test"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={nodes.length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <EditorCanvasSidebar workflowId={workflow.id} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <DebugModal
        open={debug.open}
        onOpenChange={debug.setOpen}
        title={debug.title}
        steps={debug.steps}
        running={debug.running}
      />
    </>
  );
}
