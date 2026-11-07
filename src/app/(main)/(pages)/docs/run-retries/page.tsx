"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Database,
  MousePointerClick,
  RefreshCw,
  Repeat,
  Server,
  Timer,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

const TRIGGERS = [
  {
    name: "Webhook",
    icon: Webhook,
    mode: "inline",
    text: "Runs as soon as the payload arrives.",
    tone: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  {
    name: "Schedule",
    icon: CalendarClock,
    mode: "queue",
    text: "The worker picks it up at the scheduled time.",
    tone: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  },
  {
    name: "Channel listener",
    icon: Repeat,
    mode: "queue",
    text: "Watches a channel and runs when new messages arrive.",
    tone: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
  },
  {
    name: "Manual retry",
    icon: MousePointerClick,
    mode: "inline",
    text: "Replays a failed run from the run history.",
    tone: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  },
];

const RETRYABLE = [
  "Rate limits (429)",
  "Server errors (5xx)",
  "Timeouts and network drops",
];

const PERMANENT = [
  "Most client errors (4xx)",
  "Invalid templates or schemas",
  "Missing credentials",
];

const BACKOFF = [
  { attempt: "2", delay: "2s", width: "w-[12%]" },
  { attempt: "3", delay: "8s", width: "w-[35%]" },
  { attempt: "4", delay: "32s", width: "w-[65%]" },
  { attempt: "5+", delay: "5 min", width: "w-full" },
];

function Arrow() {
  return (
    <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
  );
}

export default function RunRetriesDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => {
    markPage("run-retries");
  }, [markPage]);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <SubpageHeader
        backHref="/docs"
        backLabel="Documentation"
        title="Triggers, Queues & Run Retries"
        description="How a trigger becomes a run, what the queue actually does, and when a failed run is retried."
      />

      {/* The path of a run */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">The path of a run</h2>
        <div className="rounded-xl border bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 p-4">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs font-medium">Trigger</p>
                <p className="text-[10px] text-muted-foreground">Something happens</p>
              </div>
            </div>
            <Arrow />
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2">
              <Database className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs font-medium">Run</p>
                <p className="text-[10px] text-muted-foreground">A record is created</p>
              </div>
            </div>
            <Arrow />
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <Server className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs font-medium">Execute</p>
                <p className="text-[10px] text-muted-foreground">Nodes run in order</p>
              </div>
            </div>
            <Arrow />
            <div className="flex flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Success
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-600">
                <XCircle className="h-3.5 w-3.5" /> Error
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Every execution writes its own run. A retry never edits that record: it creates a new
            run linked to the previous one. History stays append-only.
          </p>
        </div>
      </section>

      {/* Where runs start */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Where runs start</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRIGGERS.map((trigger) => {
            const Icon = trigger.icon;
            return (
              <div key={trigger.name} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md border ${trigger.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium">{trigger.name}</span>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-[9px] font-normal ${
                      trigger.mode === "queue"
                        ? "border-purple-500/40 text-purple-600"
                        : "border-blue-500/40 text-blue-600"
                    }`}
                  >
                    {trigger.mode}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{trigger.text}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[11px] text-muted-foreground">
            Test runs and sub-workflows never retry. Tests are interactive, and a sub-workflow
            failure belongs to the parent run.
          </p>
        </div>
      </section>

      {/* Queue vs policy */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Queue vs. policy</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-blue-500/30">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">The queue moves work</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Redis holds pending jobs. A worker takes them and executes the workflow. It does not
                decide whether a failed run deserves another attempt.
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium">The policy decides retries</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                It looks at the failure, the attempt number and the time since the last try. Then it
                creates the next run and schedules it.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Why it matters:</span> a failed node does
            not crash the queue job. Before, the queue was configured to retry but never saw a
            failure. The policy had to move to the run itself.
          </p>
        </div>
      </section>

      {/* Automatic retry */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Automatic retry</h2>
        <p className="text-xs text-muted-foreground">
          Three attempts in total: the original run plus two retries. Each attempt is a new run.
        </p>

        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-600">
              <XCircle className="h-3 w-3" /> Run 1
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-muted-foreground">
              <Timer className="h-3 w-3" /> 2s
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-600">
              <XCircle className="h-3 w-3" /> Run 2
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-muted-foreground">
              <Timer className="h-3 w-3" /> 8s
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-600">
              <XCircle className="h-3 w-3" /> Run 3
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border px-2 py-1 font-medium">
              stop
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Retry</span>
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {RETRYABLE.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span className="text-emerald-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-red-500/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium">Do not retry</span>
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {PERMANENT.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span className="text-red-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">Wait grows with every attempt</span>
          </div>
          <div className="space-y-1.5">
            {BACKOFF.map((row) => (
              <div key={row.attempt} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 shrink-0 text-muted-foreground">attempt {row.attempt}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className={`h-full rounded-full bg-blue-500/60 ${row.width}`} />
                </div>
                <span className="w-10 shrink-0 text-right font-medium">{row.delay}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Exponential, capped at five minutes, with a small random jitter so many runs do not
            retry at the same instant. Unknown failures count as permanent: retrying blindly turns
            a broken workflow into an endless loop.
          </p>
        </div>
      </section>

      {/* Manual retry */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Manual retry</h2>
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-600">
              <XCircle className="h-3 w-3" /> Failed run
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-orange-600">
              <MousePointerClick className="h-3 w-3" /> Retry
            </span>
            <Arrow />
            <span className="flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-600">
              <RefreshCw className="h-3 w-3" /> Linked run
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">30s</p>
              <p className="text-[10px] text-muted-foreground">between retries of the same run</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">10 runs</p>
              <p className="text-[10px] text-muted-foreground">maximum retry chain</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">Inline</p>
              <p className="text-[10px] text-muted-foreground">works without the worker</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Manual retries are not blocked by the failure type: you may have fixed the
            configuration. They replay the payload stored on the original run. Webhook payloads are
            stored sanitized, so if the retry depended on a redacted secret in the body, trigger it
            again from the source.
          </p>
        </div>
      </section>

      {/* Run record */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">What a run remembers</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium">Identity</span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                <span className="text-foreground">Attempt</span> — 1 for the original, N for the Nth
                try.
              </p>
              <p>
                <span className="text-foreground">Retry of</span> — the run it replays, empty for
                originals.
              </p>
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Timing and state</span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                <span className="text-foreground">Next retry</span> — when the next automatic
                attempt is due.
              </p>
              <p>
                <span className="text-foreground">Status</span> — queued, running, success or
                error.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UI */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">In the editor</h2>
        <div className="rounded-xl border p-4 space-y-2 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">
              attempt 2
            </Badge>
            Run history shows which attempt you are looking at.
          </p>
          <p className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
            Failed runs get a Retry button with idle, loading and throttled states.
          </p>
          <p className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            The full error is shown before the step logs.
          </p>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link
          href="/docs/retry-loop"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ArrowRight className="h-3 w-3 rotate-180" />
          Retry Loop node
        </Link>
        <Link
          href="/docs/nodes"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Next: Node Types
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
