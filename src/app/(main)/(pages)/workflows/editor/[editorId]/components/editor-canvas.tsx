"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEditor } from "@/providers/editor-provider";
import { EditorCanvasSidebar } from "./editor-canvas-sidebar";
import { EditorCanvasCard } from "./editor-canvas-card";
import { EditorCanvasToolbar } from "./editor-canvas-toolbar";
import { useApi } from "@/hooks/use-api";
import { useWorkflowDirty } from "@/hooks/use-workflow-dirty";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DebugModal } from "@/components/composed/debug-modal";
import { useDebugLogs } from "@/hooks/use-debug-logs";
import { useModal } from "@/providers/modal-provider";
import { useEditorDrawers } from "./use-editor-drawers";
import { useCanvasInit } from "./use-canvas-init";
import { useCanvasEvents } from "./use-canvas-events";
import { useCanvasDrop } from "./use-canvas-drop";
import { useCanvasSave } from "./use-canvas-save";
import { useCanvasExport } from "./use-canvas-export";
import { useCanvasTest } from "./use-canvas-test";
import type { Workflow } from "@/lib/types";

const nodeTypes = { cardNode: EditorCanvasCard };

const minimapStyle = { height: 120, width: 200 };

interface Props {
  workflow: Workflow;
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  initialRunId?: string | null;
}

export function EditorCanvas({ workflow, onSaveRef, initialRunId }: Props) {
  const {
    editor,
    dispatch,
    setEdges: setEditorEdges,
    selectNode,
    setSidebarTab,
    setContext,
  } = useEditor();
  const { request } = useApi();
  const { setOpen, setClose } = useModal();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>(workflow.variables ?? {});

  const debug = useDebugLogs({
    onWorkflowResult: (context) => setContext(context),
    onNodeResult: (nodeId, data, success, error) => {
      const node = editor.elements.find((item) => item.id === nodeId);
      if (!node) return;
      setContext((previous) => ({
        ...previous,
        [nodeId]: { name: node.data.title, output: data, success, error },
      }));
    },
  });

  const { markClean, markCleanAfterSave } = useWorkflowDirty({ nodes, edges });

  // Keep the latest debug handlers in a ref so the window-event effect does not
  // re-subscribe on every render (useDebugLogs returns new functions).
  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

  useCanvasInit({
    workflow,
    setNodes,
    setEdges,
    dispatch,
    markClean,
    reactFlowInstance,
  });

  useCanvasEvents({
    elements: editor.elements,
    context: editor.context,
    workflowId: workflow.id,
    edges,
    debugRef,
    selectNode,
    setSidebarTab,
    setNodes,
    setEdges,
    dispatch,
  });

  const { onDragOver, onDrop } = useCanvasDrop({ reactFlowInstance, setNodes, dispatch });
  const { saving, handleSave } = useCanvasSave({
    nodes,
    edges,
    elements: editor.elements,
    workflow,
    request,
    markCleanAfterSave,
    onSaveRef,
  });
  const handleExport = useCanvasExport({
    nodes,
    edges,
    elements: editor.elements,
    workflow,
  });
  const handleTestWorkflow = useCanvasTest({
    elements: editor.elements,
    workflow,
    edges,
    debug,
    setContext,
  });

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
      const fresh = editor.elements.find((item) => item.id === node.id);
      selectNode((fresh || node) as never);
      setSidebarTab("settings");
    },
    [editor.elements, selectNode, setSidebarTab],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const drawers = useEditorDrawers({
    workflow,
    elements: editor.elements,
    edges,
    variables,
    onVariablesSaved: setVariables,
    setOpen,
    setClose,
  });

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
            <EditorCanvasToolbar
              saving={saving}
              running={debug.running}
              nodeCount={nodes.length}
              onSave={handleSave}
              onTest={handleTestWorkflow}
              onExport={handleExport}
              onVersions={drawers.openVersions}
              onVariables={drawers.openVariables}
            />
            <div className="flex-1 overflow-auto">
              <EditorCanvasSidebar
                workflowId={workflow.id}
                projectId={workflow.projectId}
                initialRunId={initialRunId}
              />
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
