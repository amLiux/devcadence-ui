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
import { Save, Send, Play } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DebugModal } from "@/components/composed/debug-modal";
import type { Workflow, NodeDebugLog, WorkflowContext, EditorNode } from "@/lib/types";

const nodeTypes = { cardNode: EditorCanvasCard };

const minimapStyle = { height: 120, width: 200 };

interface Props {
  workflow: Workflow;
}

export function EditorCanvas({ workflow }: Props) {
  const { editor, dispatch, setEdges: setEditorEdges, selectNode, setSidebarTab, setContext } = useEditor();
  const { request } = useApi();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingWorkflow, setTestingWorkflow] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugTitle, setDebugTitle] = useState("");
  const [debugSteps, setDebugSteps] = useState<NodeDebugLog[]>([]);

  useEffect(() => {
    if (workflow.nodes) {
      try {
        const savedNodes = JSON.parse(workflow.nodes) as Node[];
        const savedEdges = JSON.parse(workflow.edges || "[]") as Edge[];
        setNodes(savedNodes);
        setEdges(savedEdges);
        dispatch({
          type: "LOAD_DATA",
          payload: { elements: savedNodes as never[], edges: savedEdges as never[] },
        });
      } catch {
        // Invalid JSON, start fresh
      }
    }
  }, [workflow.nodes, workflow.edges, setNodes, setEdges, dispatch]);

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
    const handleNodeTest = async (e: Event) => {
      const nodeId = (e as CustomEvent).detail.nodeId;
      const node = editor.elements.find((n) => n.id === nodeId);
      if (!node) return;

      setDebugTitle(`Test: ${node.data.title}`);
      setDebugSteps([{ nodeId: node.id, title: node.data.title, success: false, logs: [] }]);
      setDebugOpen(true);

      try {
        const res = await fetch("/api/workflows/test-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node,
            nodes: editor.elements as EditorNode[],
            edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
            context: editor.context,
          }),
        });
        const result = await res.json();
        setDebugSteps([result]);

        // Update context with single node output (functional update avoids stale closure)
        if (result.data !== undefined) {
          setContext((prev) => ({
            ...prev,
            [nodeId]: {
              name: node.data.title,
              output: result.data,
              success: result.success,
              error: result.success ? null : result.logs?.find((l: { type: string }) => l.type === "error")?.message ?? null,
            },
          }));
        }
      } catch {
        setDebugSteps([
          {
            nodeId: node.id,
            title: node.data.title,
            success: false,
            logs: [
              {
                type: "error",
                message: "Request failed",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
      }
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
      await request({
        endpoint: `/api/workflows/${workflow.id}`,
        method: "PUT",
        data: {
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    await request({
      endpoint: `/api/workflows/${workflow.id}`,
      method: "PUT",
      data: { publish: !workflow.publish },
    });
  };

  const handleTestWorkflow = async () => {
    setTestingWorkflow(true);
    setDebugTitle(`Test: ${workflow.name}`);
    setDebugSteps([]);
    setDebugOpen(true);

    // Clear context so the run starts fresh
    setContext((prev) => {
      const fresh: WorkflowContext = {};
      for (const node of editor.elements) {
        fresh[node.id] = prev[node.id]
          ? { ...prev[node.id], output: null, success: false, error: null }
          : { name: node.data.title, output: null, success: false, error: null };
      }
      return fresh;
    });

    try {
      const res = await fetch("/api/workflows/test-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          nodes: editor.elements,
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
        }),
      });
      const result = await res.json();

      if (result.steps) {
        setDebugSteps(result.steps);
        if (result.context) {
          setContext(result.context as WorkflowContext);
        }
      } else {
        setDebugSteps([
          {
            nodeId: "error",
            title: "Workflow",
            success: false,
            logs: [
              {
                type: "error",
                message: result.error || result.message || "Unknown error",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
      }
    } catch {
      setDebugSteps([
        {
          nodeId: "error",
          title: "Workflow",
          success: false,
          logs: [
            {
              type: "error",
              message: "Request failed",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ]);
    } finally {
      setTestingWorkflow(false);
    }
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
              fitView
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
                variant={workflow.publish ? "destructive" : "default"}
                onClick={handlePublish}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {workflow.publish ? "Unpublish" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestWorkflow}
                disabled={testingWorkflow || nodes.length === 0}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {testingWorkflow ? "Testing..." : "Test"}
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <EditorCanvasSidebar />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <DebugModal
        open={debugOpen}
        onOpenChange={setDebugOpen}
        title={debugTitle}
        steps={debugSteps}
        running={testingWorkflow}
      />
    </>
  );
}
