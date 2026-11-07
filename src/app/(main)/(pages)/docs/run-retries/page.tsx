"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

const ENTRY_POINTS = [
  {
    name: "Webhook",
    path: "src/app/api/webhooks/[connectionId]/route.ts",
    execution: "Inline in the request",
    retries: "Yes, queued after failure",
    worker: "Only for retries",
  },
  {
    name: "Schedule",
    path: "src/lib/scheduler.ts",
    execution: "BullMQ job",
    retries: "Yes, queued after failure",
    worker: "Required",
  },
  {
    name: "Listen Discord Messages",
    path: "src/lib/scheduler.ts",
    execution: "BullMQ job",
    retries: "Yes, queued after failure",
    worker: "Required",
  },
  {
    name: "Manual retry",
    path: "src/app/api/workflows/[id]/runs/[runId]/retry/route.ts",
    execution: "Inline in the request",
    retries: "Follows the policy",
    worker: "Not required",
  },
  {
    name: "Test node / test workflow",
    path: "src/app/api/workflows/test-node, test-workflow",
    execution: "Inline, streaming",
    retries: "No",
    worker: "Not required",
  },
  {
    name: "Sub-workflow",
    path: "src/app/api/workflows/execute-sub-workflow/route.ts",
    execution: "Inline in the parent run",
    retries: "No",
    worker: "Not required",
  },
];

const RETRYABLE = [
  "HTTP 408, 425, 429",
  "HTTP 5xx",
  "ECONNRESET, ECONNREFUSED, ETIMEDOUT, EAI_AGAIN, ENOTFOUND, EPIPE",
  "Messages that describe a timeout, network problem or rate limit",
];

const PERMANENT = [
  "HTTP 4xx other than 408, 425, 429",
  "Validation, schema, template and parse errors",
  "Missing credentials, tokens or connections",
  "Anything unknown",
];

const BACKOFF = [
  { attempt: 2, delay: "2s" },
  { attempt: 3, delay: "8s" },
  { attempt: 4, delay: "32s" },
  { attempt: "5+", delay: "capped at 5 min" },
];

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{children}</code>;
}

export default function RunRetriesDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => {
    markPage("run-retries");
  }, [markPage]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <SubpageHeader
        backHref="/docs"
        backLabel="Documentation"
        title="Triggers, Queues & Run Retries"
        description="How a trigger becomes a run, what BullMQ actually does, and when a failed run is retried."
      />

      {/* Path of a run */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">The path of a run</h2>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-blue-600">
              <Zap className="h-3 w-3" /> Trigger
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1 text-purple-600">
              <Database className="h-3 w-3" /> WorkflowRun
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-amber-600">
              <Server className="h-3 w-3" /> Execute nodes
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Success
            </span>
            <span className="text-muted-foreground">or</span>
            <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-red-600">
              <XCircle className="h-3 w-3" /> Error
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 rounded bg-orange-500/10 px-2 py-1 text-orange-600">
              <RefreshCw className="h-3 w-3" /> Retry chain
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Every execution writes one <Code>WorkflowRun</Code>. A retry never mutates that row: it
            creates a new run linked with <Code>retryOfRunId</Code>. History stays append-only.
          </p>
        </div>
      </div>

      {/* Entry points */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Entry points</h2>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-4 gap-2 bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Trigger</span>
            <span>Execution</span>
            <span>Retries</span>
            <span>Worker</span>
          </div>
          {ENTRY_POINTS.map((entry) => (
            <div key={entry.name} className="grid grid-cols-4 gap-2 px-3 py-2 border-t text-[11px]">
              <span className="font-medium">{entry.name}</span>
              <span className="text-muted-foreground">{entry.execution}</span>
              <span className="text-muted-foreground">{entry.retries}</span>
              <span className="text-muted-foreground">{entry.worker}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Webhooks and sub-workflows run inline so they never depend on Redis. Only queued triggers
          and automatic retries need <Code>make worker</Code>.
        </p>
      </div>

      {/* BullMQ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">What BullMQ does — and does not do</h2>
        <Card>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2">
              <Server className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p>
                BullMQ is the <strong>transport</strong>. Queue name{" "}
                <Code>workflow-execution</Code>, Redis via <Code>REDIS_URL</Code>. The worker lives
                in <Code>src/lib/queue-worker.ts</Code> and is started by{" "}
                <Code>src/worker.ts</Code>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p>
                <strong>Node failures do not retry at the queue level.</strong> The processor
                resolves with a result; it does not throw. BullMQ only retries thrown jobs. Before
                this change the queue was configured with <Code>attempts: 3</Code>, but that policy
                never ran.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p>
                The retry policy lives in application code:{" "}
                <Code>src/lib/workflows/retry.ts</Code> decides,{" "}
                <Code>src/lib/workflows/run-retries.ts</Code> creates the linked run, and the queue
                only carries the job. Job-level attempts still cover unexpected transport
                exceptions.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
              <p>
                <Code>src/lib/queue.ts</Code> is a lazy client: importing it does not open Redis and
                does not start a worker. That is why route handlers can enqueue safely.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Automatic retry policy</h2>
        <p className="text-xs text-muted-foreground">
          Three attempts in total: the original run plus two retries. Each attempt is a new run with
          an incremented <Code>attempt</Code>.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Retryable</span>
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
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium">Permanent</span>
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

        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">Backoff</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {BACKOFF.map((row) => (
              <Badge key={row.attempt} variant="outline" className="text-[10px] font-normal">
                attempt {row.attempt} → {row.delay}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Exponential, base 2s, factor 4, capped at 5 minutes, with ±20% jitter so many runs do not
            retry at the same instant. Unknown failures are treated as permanent: retrying blindly is
            how a broken workflow becomes an unbounded loop.
          </p>
        </div>
      </div>

      {/* Manual retry */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Manual retry</h2>
        <div className="rounded-lg border p-4 space-y-2 text-xs">
          <p>
            A failed run can be retried from the run history. Manual retries run{" "}
            <strong>inline</strong>, so they work without the worker.
          </p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            <li>• Not gated by the failure class: you may have fixed the configuration.</li>
            <li>• One retry per run every 30 seconds.</li>
            <li>• Maximum chain of 10 runs, so a click loop cannot create unbounded runs.</li>
            <li>• Creates a linked run; the original stays untouched.</li>
          </ul>
          <p className="text-[10px] text-amber-600">
            The retry replays the payload stored on the original run. Webhook payloads are stored
            sanitized, so a retry that depended on a redacted secret in the body must be re-triggered
            from the source.
          </p>
        </div>
      </div>

      {/* Data model */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">What the run records</h2>
        <div className="rounded-lg border p-4 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <Database className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>
                <Code>attempt</Code> — 1 for the original, N for the Nth attempt.
              </p>
              <p>
                <Code>retryOfRunId</Code> — the run this one retries, empty for originals.
              </p>
              <p>
                <Code>nextRetryAt</Code> — when the next automatic attempt is due.
              </p>
              <p>
                <Code>status</Code> — <Code>queued</Code> while a retry waits for the worker, then{" "}
                <Code>running</Code>, <Code>success</Code> or <Code>error</Code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UI */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">What you see in the editor</h2>
        <div className="rounded-lg border p-4 space-y-2 text-xs text-muted-foreground">
          <p>Run history shows the attempt badge, the full error and a retry-of link.</p>
          <p>
            Failed runs get a <strong>Retry</strong> button with idle, loading and throttled states.
            Sub-workflow and test runs do not show it.
          </p>
        </div>
      </div>

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
