"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import ReactFlow, { Handle, Position, Background, useNodesState, useEdgesState, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Settings, RotateCcw, ChevronLeft, Check, X, Terminal, Zap, Lightbulb, GitBranch } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

// ── Quiz data ──────────────────────────────────────────────────────────

interface QuizQuestion {
  parentData: Record<string, unknown>;
  parentTitle: string;
  question: string;
  hint: string;
  correctExpr: string;
  expectedRoute: "yes" | "no";
  explanation: string;
}

const QUESTIONS: QuizQuestion[] = [
  {
    parentData: { status: 200, body: { name: "Alice" } },
    parentTitle: "HTTP Request",
    question: "Route to Yes when status is exactly 200",
    hint: "Use === for strict equality comparison.",
    correctExpr: "previousStep.status === 200",
    expectedRoute: "yes",
    explanation: "previousStep.status === 200 evaluates to true, so the workflow takes the Yes (green) path.",
  },
  {
    parentData: { status: 404, body: { error: "Not found" } },
    parentTitle: "HTTP Request",
    question: "Route to No when status is 404",
    hint: "You can check if status equals 404 and route to the failure path.",
    correctExpr: "previousStep.status === 404",
    expectedRoute: "no",
    explanation: "previousStep.status === 404 evaluates to true, but since we asked to route to No, the condition should be false for the success path. The No handle fires when the condition is false — or you can write the inverse: previousStep.status !== 404 for the Yes path.",
  },
  {
    parentData: { temperature: 22.5, windspeed: 14.3 },
    parentTitle: "Weather API",
    question: "Route to Yes when temperature is greater than 20",
    hint: "Use the > operator for greater-than comparison.",
    correctExpr: "previousStep.temperature > 20",
    expectedRoute: "yes",
    explanation: "previousStep.temperature > 20 evaluates to true (22.5 > 20), so the Yes path is taken.",
  },
  {
    parentData: { status: 200, body: { commits: [{ sha: "abc" }, { sha: "def" }] } },
    parentTitle: "GitHub API",
    question: "Route to Yes when there are commits (array is not empty)",
    hint: "Check the length of the commits array.",
    correctExpr: "previousStep.body.commits.length > 0",
    expectedRoute: "yes",
    explanation: "previousStep.body.commits.length > 0 evaluates to true (2 > 0). The Yes path handles the case where commits exist.",
  },
  {
    parentData: { status: 200, body: { user: { role: "admin" } } },
    parentTitle: "Auth Service",
    question: "Route to Yes when the user is an admin",
    hint: "Compare the role string with ===.",
    correctExpr: "previousStep.body.user.role === \"admin\"",
    expectedRoute: "yes",
    explanation: "previousStep.body.user.role === \"admin\" evaluates to true. The workflow branches to the admin path.",
  },
];

// ── Conditional node card ──────────────────────────────────────────────

function ConditionalCard({ isActive, route }: { isActive: boolean; route: "yes" | "no" | null }) {
  let borderClass = "border-amber-500/60";
  if (isActive && route === "yes") borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  else if (isActive && route === "no") borderClass = "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-500 ${borderClass}`}>
        <div className="flex items-center gap-2 min-w-0 mb-1">
          <GitBranch className="h-5 w-5 text-amber-500 shrink-0" />
          <span className="font-medium text-sm truncate">Conditional</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono truncate">Yes / No branching</p>
        <div className="flex items-center justify-between mt-1.5">
          <Badge variant="outline" className="text-[9px]">Condition</Badge>
          <div className="flex items-center gap-1">
            {isActive && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="success" className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-1/4" />
      <span className="absolute -bottom-5 left-[25%] -translate-x-1/2 text-[9px] text-green-600 font-medium pointer-events-none select-none">Yes</span>
      <Handle type="source" position={Position.Bottom} id="failure" className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-3/4" />
      <span className="absolute -bottom-5 left-[75%] -translate-x-1/2 text-[9px] text-red-600 font-medium pointer-events-none select-none">No</span>
    </div>
  );
}

function EndCard({ label, color, active }: { label: string; color: string; active: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[160px] transition-all duration-500 ${
        active ? `${color} shadow-[0_0_8px] shadow-current/20` : "border-border"
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-xs">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function ConditionalLogicPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("conditional-logic" as never); }, [markPage]);

  const [currentQ, setCurrentQ] = useState(0);
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<"yes" | "no" | "error" | null>(null);
  const [evalValue, setEvalValue] = useState<boolean | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const q = QUESTIONS[currentQ];

  // Canvas nodes
  const initialNodes: Node[] = useMemo(() => [
    { id: "parent", type: "parentCard", position: { x: 200, y: 0 }, data: {} },
    { id: "conditional", type: "condCard", position: { x: 200, y: 180 }, data: {} },
    { id: "yes-path", type: "endCard", position: { x: 60, y: 380 }, data: {} },
    { id: "no-path", type: "endCard", position: { x: 340, y: 380 }, data: {} },
  ], []);

  const initialEdges: Edge[] = useMemo(() => [
    { id: "e-parent-cond", source: "parent", target: "conditional", animated: true },
    { id: "e-cond-yes", source: "conditional", sourceHandle: "success", target: "yes-path", animated: true, style: { stroke: "#22c55e" } },
    { id: "e-cond-no", source: "conditional", sourceHandle: "failure", target: "no-path", animated: true, style: { stroke: "#ef4444" } },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({
    parentCard: () => (
      <div className="relative">
        <div className="rounded-lg border border-border bg-background p-3 shadow-sm w-fit min-w-[220px]">
          <div className="flex items-center gap-2 min-w-0 mb-1">
            <Settings className="h-5 w-5 text-blue-500 shrink-0" />
            <span className="font-medium text-sm truncate">{q.parentTitle}</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono truncate">parent output</p>
        </div>
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      </div>
    ),
    condCard: () => (
      <ConditionalCard
        isActive={result !== null}
        route={result === "error" ? null : result}
      />
    ),
    endCard: ({ id }: { id: string }) => {
      const isYes = id === "yes-path";
      const active = (isYes && result === "yes") || (!isYes && result === "no");
      return <EndCard label={isYes ? "Success Path" : "Failure Path"} color={isYes ? "border-green-500" : "border-red-500"} active={active} />;
    },
  }), [q.parentTitle, result]);

  const evaluate = useCallback(() => {
    try {
      const input = { previousStep: q.parentData };
      const keys = Object.keys(input);
      const fn = new Function(`const {${keys.join(", ")}} = arguments[0]; return (${expression})`);
      const val = fn(input);
      const boolResult = Boolean(val);
      setEvalValue(boolResult);
      setResult(boolResult ? "yes" : "no");

      // Check if the route matches what we expected
      const isCorrect = (boolResult ? "yes" : "no") === q.expectedRoute;
      if (isCorrect) {
        setCompletedCount((c) => c + 1);
      }
    } catch {
      setResult("error");
      setEvalValue(null);
    }
  }, [expression, q.parentData, q.expectedRoute]);

  const nextQuestion = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((c) => c + 1);
      setExpression("");
      setResult(null);
      setEvalValue(null);
    } else {
      setAllDone(true);
      setResult(null);
    }
  };

  const reset = () => {
    setCurrentQ(0);
    setExpression("");
    setResult(null);
    setEvalValue(null);
    setCompletedCount(0);
    setAllDone(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Conditional Logic</h1>
        <p className="text-muted-foreground mt-1">
          Branch your workflow with Yes/No paths based on expressions that evaluate to true or false.
        </p>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600 font-medium">You completed all conditional logic questions!</span>
          <Link href="/docs/reusable-workflows" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            Next: Reusable Workflows <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Canvas + Quiz split */}
      <div className="flex gap-4 min-h-[480px]">
        {/* Canvas */}
        <div className="flex-1 rounded-xl border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-medium">Canvas</span>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-muted-foreground">
                {allDone ? `${completedCount}/${QUESTIONS.length} correct` : `Question ${currentQ + 1} of ${QUESTIONS.length}`}
              </span>
              <Button size="sm" variant="outline" onClick={reset} className="h-7 text-xs gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
          <div className="h-[440px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
              proOptions={{ hideAttribution: true }}
              className="bg-background"
              nodesDraggable={false}
              nodesConnectable={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
            >
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>

        {/* Quiz panel */}
        <div className="w-[380px] shrink-0 rounded-xl border bg-background overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Quiz</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!allDone ? (
              <>
                {/* Parent data */}
                <div className="space-y-2">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {q.parentTitle} Output
                  </div>
                  <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[100px] overflow-y-auto">
                    {JSON.stringify(q.parentData, null, 2)}
                  </pre>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6">{q.hint}</p>
                </div>

                {/* Input */}
                <div className="space-y-2">
                  <Input
                    value={expression}
                    onChange={(e) => { setExpression(e.target.value); setResult(null); setEvalValue(null); }}
                    placeholder="previousStep.field === value"
                    className="font-mono text-xs"
                    onKeyDown={(e) => e.key === "Enter" && expression.trim() && evaluate()}
                    disabled={result !== null && result !== "error"}
                  />
                  {result === "error" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                      <X className="h-3 w-3 shrink-0" />
                      <span>Invalid expression. Check your syntax.</span>
                    </div>
                  )}
                  {result !== null && result !== "error" && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                        result === "yes"
                          ? "bg-green-500/10 text-green-600 border border-green-500/30"
                          : "bg-red-500/10 text-red-600 border border-red-500/30"
                      }`}>
                        <span className="font-medium">Result:</span> {evalValue ? "true" : "false"}
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <span className={`font-medium ${result === "yes" ? "text-green-600" : "text-red-600"}`}>
                        {result === "yes" ? "Yes path" : "No path"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {result === null || result === "error" ? (
                    <Button size="sm" onClick={evaluate} disabled={!expression.trim()} className="h-7 text-xs">
                      Test Expression
                    </Button>
                  ) : (
                    <Button size="sm" onClick={nextQuestion} className="h-7 text-xs">
                      {currentQ < QUESTIONS.length - 1 ? "Next Question" : "See Results"}
                    </Button>
                  )}
                  {result === "error" && (
                    <Button size="sm" variant="ghost" onClick={() => { setResult(null); setExpression(""); }} className="h-7 text-xs">
                      Clear
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                {result !== null && result !== "error" && (
                  <div className="rounded-lg bg-muted/40 border border-border/50 p-3 animate-in fade-in duration-200">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <strong>Why:</strong> {q.explanation}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">All done!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You answered {completedCount} of {QUESTIONS.length} correctly.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-left w-full">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Remember:</strong> Conditional nodes evaluate an expression and return true or false.
                    Connect the <span className="text-green-600 font-medium">green Yes handle</span> for the success path
                    and the <span className="text-red-600 font-medium">red No handle</span> for the failure path.
                    Use <code className="bg-muted px-1 rounded">previousStep</code> to access parent data in expressions.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={reset} className="text-xs gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/template-variables" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Template Variables
        </Link>
        <Link href="/docs/reusable-workflows" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Reusable Workflows
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
