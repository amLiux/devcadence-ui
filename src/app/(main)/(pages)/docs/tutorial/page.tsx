"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, GripVertical, Zap, Settings, Sparkles,
  Globe, GitBranch, Check, RotateCcw, ArrowRight, Database,
  MessageCircle, Rocket,
} from "lucide-react";
import { useTutorialProgress } from "@/hooks/use-tutorial-progress";

// ── Lightweight node card ────────────────────────────────────────────

const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-5 w-5 text-yellow-500" />,
  Action: <Settings className="h-5 w-5 text-blue-500" />,
  GitHub: <GitBranch className="h-5 w-5 text-foreground" />,
  AI: <Sparkles className="h-5 w-5 text-purple-500" />,
  PostgreSQL: <Database className="h-5 w-5 text-green-500" />,
};

interface TutorialCardData {
  title: string;
  description: string;
  type: string;
}

function TutorialCard({ data }: NodeProps) {
  const { title, description, type } = data as TutorialCardData;
  const isConditional = title === "Conditional";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className="rounded-lg border border-border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-200">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {iconMap[type] || <Settings className="h-5 w-5 text-muted-foreground shrink-0" />}
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
        </div>
        {description && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{description}</p>}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">{type}</Badge>
        </div>
      </div>
      {isConditional ? (
        <>
          <Handle type="source" position={Position.Bottom} id="success" className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-1/4" />
          <span className="absolute -bottom-5 left-[25%] -translate-x-1/2 text-[9px] text-green-600 font-medium pointer-events-none select-none">Yes</span>
          <Handle type="source" position={Position.Bottom} id="failure" className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-3/4" />
          <span className="absolute -bottom-5 left-[75%] -translate-x-1/2 text-[9px] text-red-600 font-medium pointer-events-none select-none">No</span>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      )}
    </div>
  );
}

const nodeTypes = { tutorialNode: TutorialCard };

// ── Sidebar nodes ────────────────────────────────────────────────────

interface NodeDef { type: string; title: string; description: string; }

const TUTORIAL_NODES: NodeDef[] = [
  { type: "Trigger", title: "Webhook", description: "Trigger on incoming webhook event" },
  { type: "Action", title: "HTTP Request", description: "Make an HTTP request to an API" },
  { type: "Action", title: "Transform Data", description: "Map, filter, or transform data" },
  { type: "Action", title: "Conditional", description: "Branch based on a condition" },
];

// ── Steps ────────────────────────────────────────────────────────────

interface Step {
  title: string;
  instruction: string;
  hint: string;
  coachPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  check: (nodes: Node[], edges: Edge[]) => boolean;
}

const STEPS: Step[] = [
  {
    title: "Step 1",
    instruction: "Drag a Webhook node from the sidebar onto the canvas.",
    hint: "Triggers start every workflow. They receive data from external services.",
    coachPosition: "top-left",
    check: (nodes) => nodes.some((n) => n.data.type === "Trigger"),
  },
  {
    title: "Step 2",
    instruction: "Now drag an HTTP Request node below the Webhook.",
    hint: "Actions process data. HTTP Request fetches from any URL.",
    coachPosition: "top-left",
    check: (nodes) => nodes.some((n) => n.data.type === "Trigger") && nodes.some((n) => n.data.title === "HTTP Request"),
  },
  {
    title: "Step 3",
    instruction: "Connect them — drag from the Webhook's bottom circle to the HTTP Request's top circle.",
    hint: "Hover the bottom of Webhook → circle appears → drag to top of HTTP Request.",
    coachPosition: "bottom-left",
    check: (_nodes, edges) => edges.length > 0,
  },
  {
    title: "Step 4",
    instruction: "Add a Transform Data node and connect it after HTTP Request.",
    hint: "Transform reshapes the previous step's output.",
    coachPosition: "bottom-left",
    check: (nodes, edges) => nodes.length >= 3 && edges.length >= 2,
  },
];

// ── Draggable card ───────────────────────────────────────────────────

function DraggableNode({ node, isActive }: { node: NodeDef; isActive: boolean }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow-type", node.type);
    event.dataTransfer.setData("application/reactflow-title", node.title);
    event.dataTransfer.setData("application/reactflow-description", node.description);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card
      size="sm"
      draggable
      onDragStart={onDragStart}
      className={`cursor-grab active:cursor-grabbing transition-all duration-300 py-1.5 ${
        isActive
          ? "border-primary/60 bg-primary/5 shadow-[0_0_12px_rgba(var(--primary)/0.2)] scale-[1.02]"
          : "hover:border-primary/50"
      }`}
    >
      <CardContent className="px-2 py-0 flex items-center gap-1.5">
        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
        <div className={`h-5 w-5 rounded flex items-center justify-center shrink-0 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
          {iconMap[node.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium leading-tight truncate">{node.title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Coach panel (floating guide) ─────────────────────────────────────

function CoachPanel({ step, stepIndex, totalSteps, isDone, isTransitioning }: {
  step: Step;
  stepIndex: number;
  totalSteps: number;
  isDone: boolean;
  isTransitioning: boolean;
}) {
  const posClass = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
  }[step.coachPosition];

  return (
    <div className={`absolute ${posClass} z-10 animate-in slide-in-from-top-2 duration-300`}>
      <div className={`rounded-xl border shadow-lg p-3 max-w-[260px] transition-all duration-500 ${
        isDone
          ? "border-green-500/50 bg-green-500/10"
          : isTransitioning
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-background"
      }`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isDone ? "bg-green-500" : "bg-primary"
          }`}>
            {isDone ? (
              <Check className="h-3.5 w-3.5 text-white" />
            ) : (
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {isDone ? "Complete" : `Step ${stepIndex + 1} of ${totalSteps}`}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          {isDone ? (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-green-600">Nice work!</div>
              <Rocket className="h-4 w-4 text-green-500" />
            </div>
          ) : isTransitioning ? (
            <div className="text-sm font-medium text-primary">Moving to next step...</div>
          ) : (
            <>
              <p className="text-sm font-medium">{step.instruction}</p>
              <p className="text-[11px] text-muted-foreground">{step.hint}</p>
            </>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-2.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < stepIndex || isDone ? "bg-green-500" :
                i === stepIndex && !isDone ? "bg-primary" :
                "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function TutorialPage() {
  const { markComplete } = useTutorialProgress();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDone, setStepDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

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

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `tutorial-${type}-${Date.now()}`,
        type: "tutorialNode",
        position,
        data: { title, description, type },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  // Auto-advance logic
  const step = STEPS[currentStep];
  const isStepDone = step?.check(nodes, edges) ?? false;
  const allDone = currentStep >= STEPS.length;
  const completedStepRef = useRef(-1);

  // Mark tutorial complete when done
  useEffect(() => {
    if (allDone) markComplete();
  }, [allDone, markComplete]);

  useEffect(() => {
    if (allDone || transitioning || stepDone) return;
    if (!step || !isStepDone) return;
    if (completedStepRef.current === currentStep) return;

    completedStepRef.current = currentStep;
    setStepDone(true);

    const t1 = setTimeout(() => {
      setTransitioning(true);
      const t2 = setTimeout(() => {
        setStepDone(false);
        setTransitioning(false);
        setCurrentStep((s) => s + 1);
      }, 800);
      timeoutRef.current = t2;
    }, 600);
    timeoutRef.current = t1;
  }, [isStepDone, allDone, transitioning, stepDone, step, currentStep]);

  const handleReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    completedStepRef.current = -1;
    setNodes([]);
    setEdges([]);
    setCurrentStep(0);
    setStepDone(false);
    setTransitioning(false);
  };

  // Which sidebar node should glow
  const activeSidebarNode = allDone ? null : currentStep === 0 ? "Webhook" : currentStep === 1 ? "HTTP Request" : currentStep === 3 ? "Transform Data" : null;

  return (
    <div className="p-6 h-full flex flex-col max-w-full">
      <div className="max-w-3xl mb-4">
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Build Your First Workflow</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Follow the guide. Drag, connect, and watch it come together.
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col min-h-0">
          <div ref={reactFlowWrapper} className="flex-1 rounded-lg border border-border overflow-hidden relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
              deleteKeyCode="Delete"
            >
              <Controls className="!bg-background !border-border !rounded-lg" />
              <Background gap={12} size={1} />
            </ReactFlow>

            {/* Floating coach */}
            {step && !allDone && (
              <CoachPanel
                step={step}
                stepIndex={currentStep}
                totalSteps={STEPS.length}
                isDone={stepDone}
                isTransitioning={transitioning}
              />
            )}
          </div>

          {/* Bottom bar */}
          <div className="mt-3 shrink-0">
            {allDone ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Tutorial complete! You&apos;re ready to build real workflows.</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/docs/workflow">
                    <Button size="sm" className="text-xs gap-1">
                      Next: Interactive Workflow
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Link href="/workflows">
                    <Button size="sm" variant="outline" className="text-xs">
                      Open Real Editor
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                      i < currentStep ? "bg-green-500" :
                      i === currentStep ? "bg-primary" :
                      "bg-muted"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[200px] shrink-0 space-y-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nodes</div>
          {TUTORIAL_NODES.map((n) => (
            <DraggableNode key={n.title} node={n} isActive={activeSidebarNode === n.title} />
          ))}
          <div className="pt-4 border-t">
            <Button size="sm" variant="ghost" onClick={handleReset} className="w-full text-xs gap-1 h-7">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
