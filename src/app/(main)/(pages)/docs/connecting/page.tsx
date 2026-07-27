"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import ReactFlow, { Handle, Position, Background, useNodesState, useEdgesState, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, Link2, RotateCcw, ChevronLeft, Check, MessageCircle, Terminal, Play } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

// ── Node data ──────────────────────────────────────────────────────────

interface CardData {
  title: string;
  description: string;
  type: string;
  debug?: string;
}

const HTTP_DATA: CardData = {
  title: "HTTP Request",
  description: "Fetch live weather from open-meteo.com",
  type: "Action",
  debug: "GET request sent — resolved to open-meteo.com. Got 200 OK with live weather data.",
};

const TRANSFORM_DATA: CardData = {
  title: "Transform Data",
  description: "Extract temp, wind, and condition from response",
  type: "Action",
  debug: "Applied expression — read previousStep.body, extracted 3 fields. Output ready.",
};

const HTTP_INPUT = { url: "https://api.open-meteo.com/v1/forecast", method: "GET", params: { latitude: 40.71, longitude: -74.01, current_weather: true } };

const HTTP_OUTPUT = {
  status: 200,
  body: {
    current_weather: { temperature: 22.5, windspeed: 14.3, weathercode: 1, time: "2026-07-27T12:00" },
  },
};

const TRANSFORM_OUTPUT = { temp: 22.5, wind: 14.3, condition: 1 };

const INHERITED_DATA_STEPS = [
  { phase: "idle" as const, title: "Before Linking", explanation: "Each node starts empty — it only receives data when a preceding node finishes and passes its output forward via previousStep.", highlight: "previousStep is undefined" },
  { phase: "http" as const, title: "HTTP Request Runs", explanation: "The HTTP node fetches live weather data. Its output is the full API response: status code, headers, and JSON body. This output is stored for the next node.", highlight: "Output stored → available as previousStep" },
  { phase: "transform" as const, title: "Transform Reads Inherited Data", explanation: "The Transform node accesses the HTTP output via previousStep. It navigates into previousStep.body.current_weather to extract just the fields it needs.", highlight: "previousStep.body.current_weather.temperature → 22.5" },
  { phase: "done" as const, title: "Chain Complete", explanation: "Each node inherited data from the one before it. This is how DevDock workflows pass information — output becomes previousStep for the next node.", highlight: "Full chain: HTTP → Transform → (next node gets Transform output)" },
];

// ── Real EditorCanvasCard ──────────────────────────────────────────────

function DocCanvasCard({ data, isActive, isCompleted }: { data: CardData; isActive: boolean; isCompleted: boolean }) {
  let borderClass = "border-border";
  if (isActive) borderClass = "border-blue-500/60";
  else if (isCompleted) borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-500 ${borderClass}`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="h-5 w-5 text-blue-500 shrink-0" />
            <span className="font-medium text-sm truncate">{data.title}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{data.description}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">{data.type}</Badge>
          <div className="flex items-center gap-1">
            {isCompleted && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
    </div>
  );
}

// ── Debug sidebar ──────────────────────────────────────────────────────

function DebugSidebar({ selectedStep, completedSteps, running, onSelect }: {
  selectedStep: "http" | "transform" | null;
  completedSteps: Set<string>;
  running: boolean;
  onSelect: (step: "http" | "transform") => void;
}) {
  if (!selectedStep && !running) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Terminal className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-xs text-muted-foreground">Connect the nodes and run the workflow to see debug output here.</p>
      </div>
    );
  }

  const steps: { id: "http" | "transform"; label: string }[] = [
    { id: "http", label: "HTTP Request" },
    { id: "transform", label: "Transform Data" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Step tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {steps.map((s) => {
          const isDone = completedSteps.has(s.id);
          const isActive = selectedStep === s.id;
          return (
            <button
              key={s.id}
              onClick={() => isDone && onSelect(s.id)}
              disabled={!isDone}
              className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : isDone
                    ? "text-muted-foreground hover:bg-muted cursor-pointer"
                    : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedStep === "http" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${running && !completedSteps.has("http") ? "bg-blue-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-sm font-medium">HTTP Request</span>
              <Badge variant="outline" className="text-[9px] ml-auto">
                {running && !completedSteps.has("http") ? "Running" : "Done"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-3">
              <MessageCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {HTTP_DATA.debug}
            </p>
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Input</div>
              <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[140px] overflow-y-auto">
                {JSON.stringify(HTTP_INPUT, null, 2)}
              </pre>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output</div>
              <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[140px] overflow-y-auto">
                {JSON.stringify(HTTP_OUTPUT, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {selectedStep === "transform" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${running && !completedSteps.has("transform") ? "bg-purple-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-sm font-medium">Transform Data</span>
              <Badge variant="outline" className="text-[9px] ml-auto">
                {running && !completedSteps.has("transform") ? "Running" : "Done"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-3">
              <MessageCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {TRANSFORM_DATA.debug}
            </p>
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Input (inherited)</div>
              <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[140px] overflow-y-auto">
                {"previousStep = HTTP Request output\n\n" + JSON.stringify(HTTP_OUTPUT, null, 2)}
              </pre>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output</div>
              <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[140px] overflow-y-auto">
                {JSON.stringify(TRANSFORM_OUTPUT, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function ConnectingNodesPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("connecting"); }, [markPage]);

  const [linked, setLinked] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<"idle" | "http" | "transform" | "done">("idle");
  const [hasRun, setHasRun] = useState(false);
  const [debugStep, setDebugStep] = useState<"http" | "transform" | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [selectedDebugStep, setSelectedDebugStep] = useState<"http" | "transform" | null>(null);

  const initialNodes: Node[] = useMemo(() => [
    { id: "http", type: "docCard", position: { x: 200, y: 0 }, data: { ...HTTP_DATA } },
    { id: "transform", type: "docCard", position: { x: 200, y: 200 }, data: { ...TRANSFORM_DATA } },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({
    docCard: ({ data }: { data: CardData }) => (
      <DocCanvasCard
        data={data}
        isActive={
          (data.title === "HTTP Request" && step === "http") ||
          (data.title === "Transform Data" && step === "transform")
        }
        isCompleted={
          (data.title === "HTTP Request" && (step === "transform" || step === "done")) ||
          (data.title === "Transform Data" && step === "done")
        }
      />
    ),
  }), [step]);

  const runLinked = useCallback(async () => {
    setRunning(true);
    setStep("idle");
    setDebugStep(null);
    setCompletedSteps(new Set());

    // Phase 1: activate HTTP node
    await new Promise((r) => setTimeout(r, 600));
    setStep("http");
    setDebugStep("http");
    setSelectedDebugStep("http");

    // Phase 2: complete HTTP, activate Transform
    await new Promise((r) => setTimeout(r, 3000));
    setCompletedSteps((prev) => new Set([...prev, "http"]));
    setStep("transform");
    setDebugStep("transform");
    setSelectedDebugStep("transform");

    // Phase 3: complete Transform
    await new Promise((r) => setTimeout(r, 3000));
    setCompletedSteps((prev) => new Set([...prev, "transform"]));
    setStep("done");
    setRunning(false);
    setHasRun(true);
  }, []);

  const reset = () => {
    setLinked(false);
    setRunning(false);
    setStep("idle");
    setHasRun(false);
    setDebugStep(null);
    setCompletedSteps(new Set());
    setSelectedDebugStep(null);
    setEdges([]);
  };

  const handleLink = () => {
    setLinked(true);
    setEdges([{ id: "e-http-transform", source: "http", target: "transform", animated: true }]);
    setTimeout(() => runLinked(), 300);
  };

  const onConnect = useCallback((connection: { source: string | null; target: string | null }) => {
    if (connection.source === "http" && connection.target === "transform" && !linked && !running) {
      setLinked(true);
      setEdges([{ id: "e-http-transform", source: "http", target: "transform", animated: true }]);
      setTimeout(() => runLinked(), 300);
    }
  }, [linked, running, setEdges, runLinked]);

  const activeData = INHERITED_DATA_STEPS.find((s) => s.phase === step) ?? INHERITED_DATA_STEPS[0];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Connecting Nodes</h1>
        <p className="text-muted-foreground mt-1">
          Link nodes to pass data between them. The output of one node becomes the input of the next.
        </p>
      </div>

      {/* Completion banner */}
      {hasRun && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600 font-medium">You connected your first nodes!</span>
          <Link href="/docs/template-variables" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            Next: Template Variables <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Canvas + Debug split */}
      <div className="flex gap-4 min-h-[420px]">
        {/* Canvas */}
        <div className="flex-1 rounded-xl border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-medium">Canvas</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset} disabled={running} className="h-7 text-xs gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
              {!linked && (
                <Button size="sm" variant="outline" onClick={handleLink} disabled={running} className="h-7 text-xs gap-1">
                  <Link2 className="h-3 w-3" />
                  Auto-Link
                </Button>
              )}
            </div>
          </div>
          <div className="h-[380px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
              proOptions={{ hideAttribution: true }}
              className="bg-background"
              nodesDraggable
              nodesConnectable={!linked && !running}
              defaultEdgeOptions={{ animated: true }}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
            >
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>

        {/* Debug panel */}
        <div className="w-[320px] shrink-0 rounded-xl border bg-background overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Debug</span>
          </div>
          <div className="h-[380px] overflow-y-auto">
            <DebugSidebar
              selectedStep={selectedDebugStep}
              completedSteps={completedSteps}
              running={running}
              onSelect={setSelectedDebugStep}
            />
          </div>
        </div>
      </div>

      {!linked && (
        <p className="text-center text-[11px] text-muted-foreground -mt-2">
          Drag from the bottom handle of HTTP Request to the top handle of Transform Data — or click <strong>Auto-Link</strong>.
        </p>
      )}

      {/* Inherited Data section */}
      <div className="rounded-lg border bg-background p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-sm font-medium">Inherited Data: How Nodes Share Information</h2>
        </div>

        <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {activeData.title}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{activeData.explanation}</p>
          <div className="mt-2 font-mono text-[11px] text-primary bg-primary/5 rounded px-2 py-1 inline-block">
            {activeData.highlight}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Chain</div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className={`rounded px-1.5 py-0.5 ${step === "http" ? "bg-blue-500/10 text-blue-600 border border-blue-500/30" : step !== "idle" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              HTTP output
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className={`rounded px-1.5 py-0.5 ${step === "transform" ? "bg-purple-500/10 text-purple-600 border border-purple-500/30" : step === "done" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              previousStep
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className={`rounded px-1.5 py-0.5 ${step === "done" ? "bg-green-500/10 text-green-600 border border-green-500/30" : "bg-muted text-muted-foreground"}`}>
              Transform output
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/60 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Key concept:</strong> In DevDock, every node can access the output of the node before it
            using <code className="bg-muted px-1 rounded">previousStep</code>. This is how data flows through
            your workflow — each node inherits everything the previous node produced. You can
            reference <code className="bg-muted px-1 rounded">previousStep.body</code>,{" "}
            <code className="bg-muted px-1 rounded">previousStep.status</code>, or any field in the
            output. If you have 5 nodes in a chain, the 5th node can access outputs from all 4 previous
            nodes via <code className="bg-muted px-1 rounded">previousStep</code> (which is always the
            immediate predecessor).
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border/60 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Output Name:</strong> You can give any node a custom output name in its settings.
            When set, the output is wrapped under that name — so instead of{" "}
            <code className="bg-muted px-1 rounded">previousStep.body.temperature</code>, you can
            access it as <code className="bg-muted px-1 rounded">weather.temperature</code> directly.
            Named outputs are available as top-level keys in any downstream node, making expressions
            shorter and easier to read.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/workflow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Interactive Workflow
        </Link>
        <Link href="/docs/template-variables" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Template Variables
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
