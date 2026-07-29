"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import ReactFlow, { Handle, Position, Background, useNodesState, useEdgesState, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronLeft, Check, RotateCcw, ArrowRightLeft, LogIn, LogOut, Settings, Terminal, X } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

// ── Node card components ───────────────────────────────────────────────

function BaseNode({ title, icon: Icon, color, isActive, isComplete, badge }: {
  title: string;
  icon: React.ElementType;
  color: string;
  isActive: boolean;
  isComplete: boolean;
  badge?: string;
}) {
  let borderClass = "border-border";
  if (isActive) borderClass = "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]";
  if (isComplete) borderClass = "border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.2)]";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[180px] max-w-[240px] transition-all duration-500 ${borderClass}`}>
        <div className="flex items-center gap-2 min-w-0 mb-1">
          <Icon className={`h-4 w-4 ${color} shrink-0`} />
          <span className="font-medium text-sm truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
          {isComplete && <div className="h-2 w-2 rounded-full bg-green-500" />}
          <Badge variant="outline" className="text-[9px]">
            {badge || (isActive ? "Running..." : isComplete ? "Done" : "Ready")}
          </Badge>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
    </div>
  );
}

// ── Sub-workflow modal canvas ──────────────────────────────────────────

function SubWorkflowModal({ phase, onClose }: { phase: "input" | "http" | "return" | "done"; onClose: () => void }) {
  const initialNodes: Node[] = [
    { id: "sub-input", type: "subNode", position: { x: 100, y: 0 }, data: { title: "Input", icon: "log-in", color: "text-cyan-500" } },
    { id: "sub-http", type: "subNode", position: { x: 100, y: 140 }, data: { title: "HTTP Request (STS)", icon: "settings", color: "text-blue-500" } },
    { id: "sub-return", type: "subNode", position: { x: 100, y: 280 }, data: { title: "Return", icon: "log-out", color: "text-amber-500" } },
  ];

  const initialEdges: Edge[] = [
    { id: "se1", source: "sub-input", target: "sub-http", animated: true },
    { id: "se2", source: "sub-http", target: "sub-return", animated: true },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({
    subNode: ({ id, data }: { id: string; data: { title: string; icon: string; color: string } }) => {
      const isActive = (id === "sub-input" && phase === "input") ||
                       (id === "sub-http" && phase === "http") ||
                       (id === "sub-return" && phase === "return");
      const isComplete = (id === "sub-input" && ["http", "return", "done"].includes(phase)) ||
                         (id === "sub-http" && ["return", "done"].includes(phase)) ||
                         (id === "sub-return" && phase === "done");

      let borderClass = "border-border";
      if (isActive) borderClass = "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]";
      if (isComplete) borderClass = "border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.2)]";

      const Icon = data.icon === "log-in" ? LogIn : data.icon === "log-out" ? LogOut : Settings;

      return (
        <div className="relative">
          <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background" />
          <div className={`rounded-lg border bg-background p-2.5 shadow-sm w-fit min-w-[160px] transition-all duration-500 ${borderClass}`}>
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${data.color} shrink-0`} />
              <span className="font-medium text-xs">{data.title}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
              {isComplete && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
              <span className="text-[9px] text-muted-foreground">
                {isActive ? "Running..." : isComplete ? "Done" : "Ready"}
              </span>
            </div>
          </div>
          <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background" />
        </div>
      );
    },
  }), [phase]);

  const steps: Record<string, string> = {
    input: "Input receives credentials from parent",
    http: "HTTP Request calls AWS STS with {{input.credentials}}",
    return: "Return exports token to parent",
    done: "Sub-workflow complete — {{callWorkflow.token}} available",
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in">
      <div className="bg-background rounded-lg border shadow-xl w-[360px] max-h-[85vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">AWS Auth</span>
            <Badge variant="outline" className="text-[9px] text-emerald-600">Sub-workflow</Badge>
          </div>
          <button onClick={onClose} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Canvas */}
        <div className="h-[300px] bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* Status */}
        <div className="px-4 py-2.5 border-t bg-[#0d1117] text-[#c9d1d9] font-mono text-[10px]">
          {steps[phase]}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

type MainPhase = "idle" | "webhook" | "call" | "sub" | "http" | "done";

export default function ReusableWorkflowsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("reusable-workflows" as never); }, [markPage]);

  const [phase, setPhase] = useState<MainPhase>("idle");
  const [subPhase, setSubPhase] = useState<"input" | "http" | "return" | "done">("input");

  const initialNodes: Node[] = useMemo(() => [
    { id: "webhook", type: "mainNode", position: { x: 220, y: 20 }, data: { title: "Webhook", icon: "settings", color: "text-yellow-500" } },
    { id: "call-wf", type: "mainNode", position: { x: 220, y: 180 }, data: { title: "Call Workflow", icon: "call", color: "text-emerald-500" } },
    { id: "http", type: "mainNode", position: { x: 220, y: 340 }, data: { title: "HTTP Request", icon: "settings", color: "text-blue-500" } },
  ], []);

  const initialEdges: Edge[] = useMemo(() => [
    { id: "e1", source: "webhook", target: "call-wf", animated: true },
    { id: "e2", source: "call-wf", target: "http", animated: true },
  ], []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({
    mainNode: ({ id, data }: { id: string; data: { title: string; icon: string; color: string } }) => {
      const isActive = (id === "webhook" && phase === "webhook") ||
                       (id === "call-wf" && phase === "call") ||
                       (id === "http" && phase === "http");
      const isComplete = (id === "webhook" && ["call", "sub", "http", "done"].includes(phase)) ||
                         (id === "call-wf" && ["http", "done"].includes(phase)) ||
                         (id === "http" && phase === "done");

      let borderClass = "border-border";
      if (isActive) borderClass = "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]";
      if (isComplete) borderClass = "border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.2)]";

      const Icon = data.icon === "call" ? ArrowRightLeft : Settings;

      return (
        <div className="relative">
          <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
          <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[200px] max-w-[260px] transition-all duration-500 ${borderClass}`}>
            <div className="flex items-center gap-2 min-w-0 mb-1">
              <Icon className={`h-4 w-4 ${data.color} shrink-0`} />
              <span className="font-medium text-sm truncate">{data.title}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
              {isComplete && <div className="h-2 w-2 rounded-full bg-green-500" />}
              <Badge variant="outline" className="text-[9px]">
                {isActive ? "Running..." : isComplete ? "Done" : "Ready"}
              </Badge>
            </div>
          </div>
          <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
        </div>
      );
    },
  }), [phase]);

  const runSimulation = useCallback(async () => {
    // Phase 1: Webhook
    setPhase("webhook");
    await new Promise((r) => setTimeout(r, 1500));

    // Phase 2: Call Workflow — open sub-workflow modal
    setPhase("call");
    await new Promise((r) => setTimeout(r, 600));
    setPhase("sub");
    setSubPhase("input");
    await new Promise((r) => setTimeout(r, 1500));

    // Phase 3: Sub-workflow execution
    setSubPhase("http");
    await new Promise((r) => setTimeout(r, 1500));
    setSubPhase("return");
    await new Promise((r) => setTimeout(r, 1500));
    setSubPhase("done");
    await new Promise((r) => setTimeout(r, 1000));

    // Phase 4: Back to parent — close modal, continue
    setPhase("http");
    await new Promise((r) => setTimeout(r, 1500));

    // Done
    setPhase("done");
  }, []);

  const resetSimulation = useCallback(() => {
    setPhase("idle");
    setSubPhase("input");
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back to docs */}
      <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
        <ChevronLeft className="h-3 w-3" />
        Back to docs
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Reusable Workflows</h1>
        <p className="text-muted-foreground mt-1">
          Use workflows as nodes. Write auth once, call everywhere.
        </p>
      </div>

      {/* Completion banner */}
      {phase === "done" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600 font-medium">You saw how sub-workflows work!</span>
          <Link href="/docs/retry-loop" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            Next: Retry Loops <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Main canvas area */}
      <div className="relative rounded-lg border bg-muted/30">
        {/* Canvas */}
        <div className="h-[440px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.0 }}
            proOptions={{ hideAttribution: true }}
            className="bg-background"
            nodesDraggable={false}
            nodesConnectable={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
          >
            <Background gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Sub-workflow modal */}
        {phase === "sub" && (
          <SubWorkflowModal phase={subPhase} onClose={() => {}} />
        )}

        {/* Debug panel */}
        {phase !== "idle" && phase !== "sub" && (
          <div className="mx-2 mb-2 rounded bg-[#0d1117] text-[#c9d1d9] p-3 font-mono text-[10px] space-y-1 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Terminal className="h-3 w-3" />
              <span>Data Flow</span>
            </div>
            {phase === "webhook" && <p>{'→ Webhook receives: {"credentials": "AKIA..."}'}</p>}
            {phase === "call" && <p>{'→ Call Workflow: passing {"credentials": "{{previousStep.credentials}}"}'}</p>}
            {phase === "http" && <p>{'→ HTTP Request uses {{callWorkflow.token}} = "ASIA..."'}</p>}
            {phase === "done" && <p className="text-green-400">✓ Complete</p>}
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={runSimulation}
            disabled={phase !== "idle"}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5"
          >
            <ArrowRight className="h-3 w-3" />
            Run
          </button>
          {phase !== "idle" && (
            <button
              onClick={resetSimulation}
              className="px-3 py-1.5 rounded bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-xs font-medium">1. Mark as Reusable</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Set workflow type to &quot;Reusable&quot; in settings. It appears in the node palette.
          </p>
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-cyan-500/10 flex items-center justify-center">
              <LogIn className="h-3.5 w-3.5 text-cyan-500" />
            </div>
            <span className="text-xs font-medium">2. Add Input + Return</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Input node receives <code>{'{{input.*}}'}</code>. Return node exports <code>{'{{callWorkflow.*}}'}</code>.
          </p>
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
              <Settings className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <span className="text-xs font-medium">3. Call from Any Workflow</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Use Call Workflow node, select the reusable workflow, pass JSON input.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/conditional-logic" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Conditional Logic
        </Link>
        <Link href="/docs/retry-loop" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Retry Loops
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
