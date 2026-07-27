"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, Play, Zap, Globe, Sparkles, RotateCcw, ChevronLeft, Check, MessageCircle } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

interface SimNode {
  id: string;
  title: string;
  type: string;
  icon: React.ReactNode;
  color: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  description: string;
  debug: string;
}

const SIM_NODES: SimNode[] = [
  {
    id: "webhook",
    title: "Webhook Trigger",
    type: "Trigger",
    icon: <Zap className="h-5 w-5 text-yellow-500" />,
    color: "border-yellow-500/60",
    input: {
      url: "https://api.devdock.com/webhook/wh_abc123",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    output: {
      event: "push",
      repository: "devdock/devdock",
      commits: [{ message: "feat: add AI nodes", author: "user" }],
    },
    description: "Receives incoming webhook POST and starts the workflow.",
    debug: "Received POST request — parsed JSON body with 1 commit. Passing full payload to next step.",
  },
  {
    id: "http",
    title: "HTTP Request",
    type: "Action",
    icon: <Globe className="h-5 w-5 text-blue-500" />,
    color: "border-blue-500/60",
    input: {
      url: "https://api.github.com/repos/devdock/devdock/commits",
      method: "GET",
      headers: '{"Authorization": "Bearer {{previousStep.token}}"}',
    },
    output: {
      status: 200,
      body: [
        { sha: "abc123", commit: { message: "feat: add AI nodes" } },
        { sha: "def456", commit: { message: "fix: webhook verify" } },
      ],
    },
    description: "Fetches data from an external API with template variables.",
    debug: "GET request sent — resolved {{previousStep.token}} to actual value. Got 200 OK with 2 commits.",
  },
  {
    id: "transform",
    title: "Transform Data",
    type: "Action",
    icon: <Sparkles className="h-5 w-5 text-purple-500" />,
    color: "border-purple-500/60",
    input: {
      expression: "previousStep.body.map(c => c.commit.message)",
    },
    output: { messages: ["feat: add AI nodes", "fix: webhook verify"] },
    description: "Extracts commit messages from the API response.",
    debug: "Applied expression — mapped body array to extract commit messages. Output: 2 strings.",
  },
];

function SimulatedNode({ node, isActive, isCompleted, onClick }: {
  node: SimNode;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-lg border-2 bg-background p-3 transition-all duration-300 ${
        isActive ? `${node.color} shadow-lg scale-[1.02]` :
        isCompleted ? "border-green-500/60 shadow-[0_0_6px_rgba(34,197,94,0.2)]" :
        "border-border hover:border-border/80 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {node.icon}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{node.title}</div>
          <div className="text-[10px] text-muted-foreground">{node.description}</div>
        </div>
        <Badge variant="outline" className="text-[9px] shrink-0">{node.type}</Badge>
        {isCompleted && <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
        {isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
      </div>
      {isActive && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-current/20 text-[11px] text-muted-foreground flex items-start gap-1.5">
          <MessageCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{node.debug}</span>
        </div>
      )}
    </button>
  );
}

function ExecutionPanel({ node, visible }: { node: SimNode; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="mt-2 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium">Input</span>
      </div>
      <pre className="text-[11px] font-mono bg-background rounded-md p-2 overflow-x-auto border border-border/50 max-h-[120px] overflow-y-auto">
        {JSON.stringify(node.input, null, 2)}
      </pre>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3 text-green-500" />
        <span className="font-medium">Output</span>
      </div>
      <pre className="text-[11px] font-mono bg-background rounded-md p-2 overflow-x-auto border border-border/50 max-h-[120px] overflow-y-auto">
        {JSON.stringify(node.output, null, 2)}
      </pre>
    </div>
  );
}

export default function WorkflowDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("workflow"); }, [markPage]);

  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setCompletedNodes(new Set());
    setActiveNode(null);

    for (const node of SIM_NODES) {
      setActiveNode(node.id);
      await new Promise((r) => setTimeout(r, 2000));
      setCompletedNodes((prev) => new Set([...prev, node.id]));
    }
    setActiveNode(null);
    setIsRunning(false);
    setHasRun(true);
  }, []);

  const reset = () => {
    setActiveNode(null);
    setCompletedNodes(new Set());
    setIsRunning(false);
    setHasRun(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Interactive Workflow</h1>
        <p className="text-muted-foreground mt-1">
          A workflow is a chain of nodes. Each node receives output from the previous step.
        </p>
      </div>

      {hasRun && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600 font-medium">You ran your first workflow!</span>
          <Link href="/docs/connecting" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            Next: Connecting Nodes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <Card className="overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Try it</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset} disabled={isRunning} className="h-7 text-xs gap-1">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button size="sm" onClick={runSimulation} disabled={isRunning} className="h-7 text-xs">
              <Play className="h-3 w-3 mr-1" />
              {isRunning ? "Running..." : "Run"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground mb-3">
            Click <strong>Run</strong> to simulate execution, or click any node to inspect its input/output.
          </p>
          {SIM_NODES.map((node, i) => (
            <React.Fragment key={node.id}>
              <SimulatedNode
                node={node}
                isActive={activeNode === node.id}
                isCompleted={completedNodes.has(node.id)}
                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
              />
              <ExecutionPanel node={node} visible={activeNode === node.id} />
              {i < SIM_NODES.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 rotate-90" />
                </div>
              )}
            </React.Fragment>
          ))}
          {completedNodes.size === SIM_NODES.length && (
            <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-xs text-green-600 font-medium">Workflow complete. All nodes executed successfully.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-border/60 p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          <strong>How it works:</strong> The webhook trigger receives data, passes it to the HTTP Request node
          via <code className="bg-muted px-1 rounded">{"{{previousStep.*}}"}</code> template variables, which
          fetches commits from GitHub. The Transform Data node then extracts just the commit messages.
        </p>
        <Link href="/docs/connecting" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Connecting Nodes
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
