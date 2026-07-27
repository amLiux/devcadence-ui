"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import ReactFlow, { Handle, Position, Background, useNodesState, useEdgesState, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Settings, RotateCcw, ChevronLeft, Check, X, MessageCircle, Terminal, Zap, Lightbulb } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

// ── Quiz data ──────────────────────────────────────────────────────────

interface QuizQuestion {
  parentData: Record<string, unknown>;
  parentTitle: string;
  question: string;
  hint: string;
  answers: string[];
  explanation: string;
}

const QUESTIONS: QuizQuestion[] = [
  {
    parentData: { status: 200, body: { name: "Alice", role: "admin" } },
    parentTitle: "HTTP Request",
    question: "How do you access the status code from the previous step?",
    hint: "Use previousStep to reference the parent node's output.",
    answers: ["previousStep.status"],
    explanation: "previousStep.status gives you 200. The status code is a top-level field in the HTTP response.",
  },
  {
    parentData: { status: 200, body: { name: "Alice", role: "admin" } },
    parentTitle: "HTTP Request",
    question: "How do you access the user's name inside the body?",
    hint: "Navigate into previousStep.body to reach nested fields.",
    answers: ["previousStep.body.name"],
    explanation: "previousStep.body.name gives you \"Alice\". You chain property access to go deeper into the JSON.",
  },
  {
    parentData: { status: 200, body: { user: { email: "alice@example.com", settings: { theme: "dark" } } } },
    parentTitle: "HTTP Request",
    question: "How do you access the user's email?",
    hint: "Go two levels deep: body → user → email.",
    answers: ["previousStep.body.user.email"],
    explanation: "previousStep.body.user.email gives you \"alice@example.com\". Each dot accesses the next level.",
  },
  {
    parentData: { status: 200, body: { commits: [{ sha: "abc123", message: "feat: add auth" }, { sha: "def456", message: "fix: typo" }] } },
    parentTitle: "GitHub API",
    question: "How do you access the first commit's message?",
    hint: "Arrays use [0] for the first element.",
    answers: ["previousStep.body.commits[0].message", "previousStep.body.commits[0][\"message\"]"],
    explanation: "previousStep.body.commits[0].message gives you \"feat: add auth\". Array indexing with [0] gets the first element.",
  },
  {
    parentData: { status: 200, body: { current_weather: { temperature: 22.5, windspeed: 14.3, weathercode: 1 } } },
    parentTitle: "Weather API",
    question: "Write a template to display: \"Temperature is 22.5°C\"",
    hint: "Wrap the expression in {{}} and combine with text.",
    answers: ["Temperature is {{previousStep.body.current_weather.temperature}}°C"],
    explanation: "The {{}} syntax resolves the expression inside and inserts the value into the string. The rest of the text stays as-is.",
  },
];

// ── Node card ──────────────────────────────────────────────────────────

function DocCanvasCard({ title, subtitle, icon, isActive, isCompleted }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
}) {
  let borderClass = "border-border";
  if (isActive) borderClass = "border-blue-500/60";
  else if (isCompleted) borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      <div className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-500 ${borderClass}`}>
        <div className="flex items-center gap-2 min-w-0 mb-1">
          {icon}
          <span className="font-medium text-sm truncate">{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono truncate">{subtitle}</p>
        <div className="flex items-center justify-between mt-1.5">
          <Badge variant="outline" className="text-[9px]">Action</Badge>
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

// ── Main page ──────────────────────────────────────────────────────────

export default function TemplateVariablesPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("template-variables" as never); }, [markPage]);

  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const q = QUESTIONS[currentQ];

  const initialNodes: Node[] = useMemo(() => [
    { id: "parent", type: "docCard", position: { x: 200, y: 0 }, data: {} },
    { id: "child", type: "docCard", position: { x: 200, y: 200 }, data: {} },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: "e-parent-child", source: "parent", target: "child", animated: true },
  ]);

  const nodeTypes = useMemo(() => ({
    docCard: ({ id }: { id: string }) => {
      if (id === "parent") {
        return (
          <DocCanvasCard
            title={q.parentTitle}
            subtitle="parent output"
            icon={<Settings className="h-5 w-5 text-blue-500" />}
            isActive={result === null}
            isCompleted={result === "correct"}
          />
        );
      }
      return (
        <DocCanvasCard
          title="Next Node"
          subtitle="uses previousStep.*"
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
          isActive={result === "correct"}
          isCompleted={allDone}
        />
      );
    },
  }), [q.parentTitle, result, allDone]);

  const checkAnswer = useCallback(() => {
    const normalized = answer.trim().replace(/\s+/g, "");
    // Strip {{ }} wrapper if present
    const expr = normalized.replace(/^\{\{|\}\}$/g, "");

    // Check against accepted answers (normalized)
    const isCorrect = q.answers.some((a) => expr === a.replace(/\s+/g, ""));

    if (isCorrect) {
      setResult("correct");
      setCompletedCount((c) => c + 1);
    } else {
      setResult("wrong");
    }
  }, [answer, q.answers]);

  const nextQuestion = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((c) => c + 1);
      setAnswer("");
      setResult(null);
    } else {
      setAllDone(true);
      setResult(null);
    }
  };

  const reset = () => {
    setCurrentQ(0);
    setAnswer("");
    setResult(null);
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
        <h1 className="text-2xl font-bold">Template Variables</h1>
        <p className="text-muted-foreground mt-1">
          Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> to reference data from previous nodes in any text field.
        </p>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600 font-medium">You answered all {QUESTIONS.length} questions correctly!</span>
          <Link href="/docs/conditional-logic" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            Next: Conditional Logic <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Canvas + Quiz split */}
      <div className="flex gap-4 min-h-[420px]">
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
          <div className="h-[380px]">
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
                  <pre className="text-[11px] font-mono bg-[#0d1117] text-[#c9d1d9] rounded-md p-2 border border-border/50 max-h-[120px] overflow-y-auto">
                    {JSON.stringify(q.parentData, null, 2)}
                  </pre>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6">{q.hint}</p>
                </div>

                {/* Input */}
                <div className="space-y-2">
                  <Input
                    value={answer}
                    onChange={(e) => { setAnswer(e.target.value); setResult(null); }}
                    placeholder="previousStep.field"
                    className="font-mono text-xs"
                    onKeyDown={(e) => e.key === "Enter" && answer.trim() && checkAnswer()}
                    disabled={result === "correct"}
                  />
                  {result === "wrong" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                      <X className="h-3 w-3 shrink-0" />
                      <span>Not quite. Try: <code className="bg-red-500/10 px-1 rounded">{q.answers[0]}</code></span>
                    </div>
                  )}
                  {result === "correct" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-green-600">
                      <Check className="h-3 w-3 shrink-0" />
                      <span>Correct!</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {result !== "correct" && (
                    <Button size="sm" onClick={checkAnswer} disabled={!answer.trim()} className="h-7 text-xs">
                      Check Answer
                    </Button>
                  )}
                  {result === "correct" && (
                    <Button size="sm" onClick={nextQuestion} className="h-7 text-xs">
                      {currentQ < QUESTIONS.length - 1 ? "Next Question" : "See Results"}
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                {result && (
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
                    <strong>Remember:</strong> Use <code className="bg-muted px-1 rounded">{"{{previousStep.field}}"}</code> in any text field
                    (URLs, headers, body, subject lines). The expression inside{" "}
                    <code className="bg-muted px-1 rounded">{"{{}}"}</code> is evaluated at runtime and replaced with the actual value.
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
        <Link href="/docs/connecting" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Connecting Nodes
        </Link>
        <Link href="/docs/conditional-logic" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Conditional Logic
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
