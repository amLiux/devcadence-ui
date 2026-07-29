"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactFlow, { Handle, Position, Background, useNodesState, useEdgesState, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ChevronLeft, RotateCcw, Zap, Check, X, Clock, Settings } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

// ── Scenarios ──────────────────────────────────────────────────────────

interface RetryScenario {
  id: string;
  title: string;
  description: string;
  url: string;
  method: string;
  condition: string;
  maxRetries: number;
  delay: number;
  attempts: { status: number; body: unknown; delayMs: number }[];
  finalOutcome: "success" | "failure";
}

const SCENARIOS: RetryScenario[] = [
  {
    id: "poll-job",
    title: "Poll async job",
    description: "A background job takes a few seconds to complete. We poll until it's done.",
    url: "https://api.example.com/jobs/abc-123",
    method: "GET",
    condition: "response.body.done === true",
    maxRetries: 5,
    delay: 2,
    attempts: [
      { status: 200, body: { done: false, progress: 20 }, delayMs: 2000 },
      { status: 200, body: { done: false, progress: 60 }, delayMs: 2000 },
      { status: 200, body: { done: true, progress: 100 }, delayMs: 0 },
    ],
    finalOutcome: "success",
  },
  {
    id: "rate-limit",
    title: "Retry on 429",
    description: "API rate-limited us. Wait and retry until we get a 200.",
    url: "https://api.github.com/repos/org/repo/issues",
    method: "GET",
    condition: "response.status === 200",
    maxRetries: 3,
    delay: 5,
    attempts: [
      { status: 429, body: { error: "rate limit" }, delayMs: 5000 },
      { status: 200, body: [{ id: 1, title: "Bug report" }], delayMs: 0 },
    ],
    finalOutcome: "success",
  },
  {
    id: "deploy-wait",
    title: "Wait for deploy",
    description: "Trigger a deploy, then poll until the status is 'active'.",
    url: "https://api.example.com/deployments/depl-456",
    method: "GET",
    condition: "response.body.status === 'active'",
    maxRetries: 10,
    delay: 3,
    attempts: [
      { status: 200, body: { status: "building" }, delayMs: 3000 },
      { status: 200, body: { status: "building" }, delayMs: 3000 },
      { status: 200, body: { status: "deploying" }, delayMs: 3000 },
      { status: 200, body: { status: "active" }, delayMs: 0 },
    ],
    finalOutcome: "success",
  },
  {
    id: "max-retries-exhausted",
    title: "Max retries exhausted",
    description: "Server keeps returning 500. After 3 attempts, we give up.",
    url: "https://api.example.com/flaky",
    method: "GET",
    condition: "response.status === 200",
    maxRetries: 3,
    delay: 1,
    attempts: [
      { status: 500, body: { error: "internal error" }, delayMs: 1000 },
      { status: 500, body: { error: "internal error" }, delayMs: 1000 },
      { status: 500, body: { error: "internal error" }, delayMs: 0 },
    ],
    finalOutcome: "failure",
  },
];

// ── Flow canvas ────────────────────────────────────────────────────────

function RetryNode({ data }: { data: { title: string; description: string; type: string; isActive: boolean; isCompleted: boolean; icon?: React.ReactNode } }) {
  let borderClass = "border-border";
  if (data.isActive) borderClass = "border-blue-500/60";
  else if (data.isCompleted && data.type === "Success") borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  else if (data.isCompleted && data.type === "Failed") borderClass = "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  else if (data.isCompleted) borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";

  const badgeClass = data.type === "Failed"
    ? "border-red-500/50 text-red-600"
    : data.type === "Success"
      ? "border-green-500/50 text-green-600"
      : "";

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-500 ${borderClass}`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {data.icon || <Settings className="h-5 w-5 text-blue-500 shrink-0" />}
            <span className="font-medium text-sm truncate">{data.title}</span>
          </div>
        </div>
        {data.description && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{data.description}</p>}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>{data.type}</Badge>
          <div className="flex items-center gap-1">
            {data.isCompleted && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {data.isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
    </div>
  );
}

const nodeTypes = { retryDoc: RetryNode };

function RetryFlowCanvas({ scenario, running, attemptIndex, finished }: { scenario: RetryScenario; running: boolean; attemptIndex: number; finished: boolean }) {
  const nodes: Node[] = [
    {
      id: "start",
      type: "retryDoc",
      position: { x: 50, y: 20 },
      data: { title: "Trigger", description: "", type: "Trigger", isActive: false, isCompleted: true },
    },
    {
      id: "http",
      type: "retryDoc",
      position: { x: 50, y: 130 },
      data: {
        title: "Retry Loop",
        description: `${scenario.method} ${scenario.url.split("/").pop()}`,
        type: "Action",
        isActive: running,
        isCompleted: finished,
        icon: <RotateCcw className={`h-5 w-5 text-orange-500 shrink-0 ${running ? "animate-spin" : ""}`} />,
      },
    },
    {
      id: "next",
      type: "retryDoc",
      position: { x: 50, y: 240 },
      data: {
        title: scenario.finalOutcome === "success" ? "Condition met" : "Retries exhausted",
        description: scenario.finalOutcome === "success" ? "Passing response downstream" : "Workflow fails — on failure: error",
        type: scenario.finalOutcome === "success" ? "Success" : "Failed",
        isActive: false,
        isCompleted: finished,
      },
    },
  ];

  const edges: Edge[] = [
    { id: "e-start-http", source: "start", target: "http", animated: true },
    {
      id: "e-http-next",
      source: "http",
      target: "next",
      animated: false,
    },
  ];

  return (
    <div className="h-[320px] rounded-lg border bg-muted/20 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

// ── Attempt log ────────────────────────────────────────────────────────

function AttemptLog({ scenario, attemptIndex, running }: { scenario: RetryScenario; attemptIndex: number; running: boolean }) {
  return (
    <div className="space-y-1.5">
      {scenario.attempts.map((attempt, i) => {
        const isCurrent = i === attemptIndex;
        const isDone = i < attemptIndex;
        const isPending = i > attemptIndex;
        const isSuccessAttempt = i === scenario.attempts.length - 1 && scenario.finalOutcome === "success";

        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono transition-all duration-300 ${
              isCurrent
                ? "bg-primary/10 border border-primary/30"
                : isDone
                  ? "bg-muted/50 opacity-60"
                  : "bg-muted/20 opacity-40"
            }`}
          >
            <span className="text-muted-foreground w-16 shrink-0">
              Attempt {i + 1}
            </span>
            {isDone || isCurrent ? (
              <>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    attempt.status === 200
                      ? "border-green-500/50 text-green-600"
                      : "border-red-500/50 text-red-600"
                  }`}
                >
                  {attempt.status}
                </Badge>
                <span className="text-muted-foreground truncate flex-1">
                  {JSON.stringify(attempt.body).slice(0, 60)}
                </span>
                {isDone && attempt.delayMs > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {attempt.delayMs / 1000}s
                  </span>
                )}
                {isCurrent && (
                  <RotateCcw className="h-3 w-3 animate-spin text-primary shrink-0" />
                )}
              </>
            ) : (
              <span className="text-muted-foreground">waiting...</span>
            )}
          </div>
        );
      })}
      {!running && attemptIndex >= scenario.attempts.length && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
            scenario.finalOutcome === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/30"
              : "bg-red-500/10 text-red-600 border border-red-500/30"
          }`}
        >
          {scenario.finalOutcome === "success" ? (
            <><Check className="h-3.5 w-3.5" /> Condition met — passing response downstream</>
          ) : (
            <><X className="h-3.5 w-3.5" /> Max retries ({scenario.maxRetries}) exhausted — workflow fails</>
          )}
        </div>
      )}
    </div>
  );
}

// ── Condition tester ───────────────────────────────────────────────────

function ConditionTester() {
  const [expr, setExpr] = useState("response.body.done === true");
  const [responseBody, setResponseBody] = useState('{"done": true, "progress": 100}');
  const [responseStatus, setResponseStatus] = useState("200");
  const [result, setResult] = useState<boolean | null>(null);

  const evaluate = useCallback(() => {
    try {
      const parsedBody = JSON.parse(responseBody);
      const input = { response: { status: Number(responseStatus), body: parsedBody } };
      const keys = Object.keys(input);
      const fn = new Function(`const {${keys.join(", ")}} = arguments[0]; return (${expr})`);
      setResult(Boolean(fn(input)));
    } catch {
      setResult(null);
    }
  }, [expr, responseBody, responseStatus]);

  useEffect(() => { evaluate(); }, [evaluate]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">response.status</label>
          <Input
            className="h-8 text-xs font-mono"
            value={responseStatus}
            onChange={(e) => setResponseStatus(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">response.body (JSON)</label>
          <Input
            className="h-8 text-xs font-mono"
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Condition expression</label>
        <Input
          className="h-8 text-xs font-mono"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="response.body.done === true"
        />
      </div>
      {result !== null && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
            result
              ? "bg-green-500/10 text-green-600 border border-green-500/30"
              : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
          }`}
        >
          {result ? (
            <><Check className="h-3.5 w-3.5" /> Condition is true — retry stops</>
          ) : (
            <><RotateCcw className="h-3.5 w-3.5" /> Condition is false — will retry</>
          )}
        </div>
      )}
      {result === null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/30">
          <X className="h-3.5 w-3.5" /> Invalid expression
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function RetryLoopDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("retry-loop"); }, [markPage]);

  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [running, setRunning] = useState(false);
  const [attemptIndex, setAttemptIndex] = useState(-1);

  const runScenario = useCallback(() => {
    setRunning(true);
    setAttemptIndex(0);
    let i = 0;
    const step = () => {
      const attempt = selectedScenario.attempts[i];
      const wait = attempt?.delayMs || 800;
      setTimeout(() => {
        i++;
        if (i >= selectedScenario.attempts.length) {
          setAttemptIndex(i);
          setTimeout(() => setRunning(false), 500);
        } else {
          setAttemptIndex(i);
          step();
        }
      }, wait);
    };
    step();
  }, [selectedScenario]);

  const resetScenario = useCallback(() => {
    setRunning(false);
    setAttemptIndex(-1);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Retry Loop</h1>
        <p className="text-muted-foreground mt-1">
          Make an HTTP request and retry until a condition is met. Poll async jobs, wait for deploys, or handle rate limits.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          How it works
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <span className="text-xs font-bold text-blue-600">1</span>
            </div>
            <p className="text-xs font-medium">Make request</p>
            <p className="text-[10px] text-muted-foreground">HTTP call with URL, method, headers, body</p>
          </div>
          <div className="space-y-1">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <span className="text-xs font-bold text-amber-600">2</span>
            </div>
            <p className="text-xs font-medium">Check condition</p>
            <p className="text-[10px] text-muted-foreground">Evaluate expression against response</p>
          </div>
          <div className="space-y-1">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <span className="text-xs font-bold text-green-600">3</span>
            </div>
            <p className="text-xs font-medium">Retry or pass</p>
            <p className="text-[10px] text-muted-foreground">If false: wait and retry. If true: done.</p>
          </div>
        </div>
      </div>

      {/* Interactive scenarios */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Try it: Pick a scenario</h2>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedScenario(s); resetScenario(); }}
              className={`text-left p-3 rounded-lg border text-xs transition-all ${
                selectedScenario.id === s.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="font-medium">{s.title}</div>
              <div className="text-muted-foreground mt-0.5">{s.description}</div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              {selectedScenario.method} {selectedScenario.url}
              <span className="ml-2 text-foreground">— condition:</span>{" "}
              <code className="bg-muted px-1 rounded">{selectedScenario.condition}</code>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetScenario} disabled={running}>
                Reset
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={runScenario} disabled={running}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Run
              </Button>
            </div>
          </div>

          <RetryFlowCanvas scenario={selectedScenario} running={running} attemptIndex={attemptIndex} finished={!running && attemptIndex >= selectedScenario.attempts.length} />
          <AttemptLog scenario={selectedScenario} attemptIndex={attemptIndex} running={running} />
        </div>
      </div>

      {/* Condition tester */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Expression tester</h2>
        <p className="text-xs text-muted-foreground">
          Write a condition against <code className="bg-muted px-1 rounded">response.status</code> and{" "}
          <code className="bg-muted px-1 rounded">response.body</code>. The expression must return{" "}
          <code className="bg-muted px-1 rounded">true</code> to stop retrying.
        </p>
        <div className="rounded-lg border p-4">
          <ConditionTester />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/reusable-workflows" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Reusable Workflows
        </Link>
        <Link href="/docs/nodes" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Node Types
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
