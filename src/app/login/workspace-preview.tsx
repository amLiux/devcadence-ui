"use client";

import { useEffect, useState } from "react";
import { Clock, GitBranch, Mail, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PreviewStep {
  node: string;
  ms: string;
}

interface PreviewWorkflow {
  name: string;
  trigger: string;
  project: string;
  icon: LucideIcon;
  iconColor: string;
  runId: string;
  duration: string;
  steps: PreviewStep[];
}

const WORKFLOWS: PreviewWorkflow[] = [
  {
    name: "nightly-digest",
    trigger: "Schedule",
    project: "devcadence-ui",
    icon: Clock,
    iconColor: "text-yellow-500",
    runId: "#4821",
    duration: "2.8s",
    steps: [
      { node: "Schedule", ms: "0ms" },
      { node: "PostgreSQL Query", ms: "1.9s" },
      { node: "Transform Data", ms: "90ms" },
      { node: "Send Slack Message", ms: "780ms" },
    ],
  },
  {
    name: "push-to-deploy",
    trigger: "Listen Commits",
    project: "infra",
    icon: GitBranch,
    iconColor: "text-foreground",
    runId: "#4822",
    duration: "4.1s",
    steps: [
      { node: "Listen Commits", ms: "0ms" },
      { node: "HTTP Request", ms: "2.6s" },
      { node: "PostgreSQL Insert", ms: "90ms" },
      { node: "Send Discord Message", ms: "1.4s" },
    ],
  },
  {
    name: "inbox-triage",
    trigger: "Watch Emails",
    project: "support",
    icon: Mail,
    iconColor: "text-red-500",
    runId: "#4823",
    duration: "3.2s",
    steps: [
      { node: "Watch Emails", ms: "0ms" },
      { node: "Classify", ms: "1.4s" },
      { node: "HTTP Request", ms: "220ms" },
      { node: "Send Slack Message", ms: "1.6s" },
    ],
  },
];

const STEP_MS = 800;
const HOLD_MS = 1600;
const EXIT_MS = 450;

export function WorkspacePreview() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(1);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const showAll = window.setTimeout(() => setVisible(WORKFLOWS[0].steps.length), 0);
      return () => window.clearTimeout(showAll);
    }

    const timers: number[] = [];
    let cancelled = false;

    const start = (workflowIndex: number) => {
      if (cancelled) return;
      const workflow = WORKFLOWS[workflowIndex];
      setIndex(workflowIndex);
      setVisible(1);
      setLeaving(false);

      for (let step = 2; step <= workflow.steps.length; step += 1) {
        timers.push(window.setTimeout(() => setVisible(step), (step - 1) * STEP_MS));
      }

      const exitAt = (workflow.steps.length - 1) * STEP_MS + HOLD_MS;
      timers.push(window.setTimeout(() => setLeaving(true), exitAt));
      timers.push(
        window.setTimeout(
          () => start((workflowIndex + 1) % WORKFLOWS.length),
          exitAt + EXIT_MS,
        ),
      );
    };

    timers.push(window.setTimeout(() => start(0), 250));
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const workflow = WORKFLOWS[index];
  const Icon = workflow.icon;

  return (
    <div className="mt-20 w-full max-w-md space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        in your workspace
      </p>

      <div
        className={cn(
          "space-y-3 transition-all duration-500",
          leaving ? "-translate-x-8 opacity-0" : "translate-x-0 opacity-100",
        )}
      >
        <div
          key={workflow.name}
          className="animate-in space-y-3 fade-in slide-in-from-right-4 duration-500"
        >
          <Card size="sm" className="bg-card/80">
            <div className="flex items-center gap-3 px-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                <Icon className={cn("size-4", workflow.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{workflow.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge className="gap-0.5 px-1.5 py-0 text-[10px]">Active</Badge>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {workflow.trigger}
                  </Badge>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {workflow.project}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card size="sm" className="bg-card/80">
            <div className="flex items-center justify-between px-3 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  success
                </span>
                <span className="font-medium">run {workflow.runId}</span>
              </div>
              <span className="text-muted-foreground">{workflow.duration}</span>
            </div>

            <div className="space-y-0.5 px-2" aria-hidden>
              {workflow.steps.map((step, stepIndex) => {
                const shown = stepIndex < visible;
                return (
                  <div
                    key={step.node}
                    className={cn(
                      "flex items-center gap-2 rounded px-1.5 py-1 text-[11px] transition-all duration-500",
                      shown
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-3 opacity-0",
                    )}
                  >
                    <span className="w-4 shrink-0 text-right text-muted-foreground">
                      {stepIndex + 1}
                    </span>
                    <span className={shown ? "text-emerald-500" : "text-muted-foreground"}>✓</span>
                    <span className="font-medium">{step.node}</span>
                    <span className="text-muted-foreground">{step.ms}</span>
                    {shown && stepIndex === visible - 1 && visible < workflow.steps.length ? (
                      <span className="ml-auto animate-pulse font-mono text-emerald-500">▍</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
