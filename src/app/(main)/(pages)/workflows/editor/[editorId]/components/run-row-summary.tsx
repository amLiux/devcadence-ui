"use client";

import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { formatDuration, runTitle, timeAgo } from "./run-utils";
import type { WorkflowLog, WorkflowRun } from "./run-types";

export function RunRowSummary({
  run,
  expanded,
  logs,
  totalMs,
  onToggle,
}: {
  run: WorkflowRun;
  expanded: boolean;
  logs: WorkflowLog[] | null;
  totalMs: number | null;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
    >
      {expanded ? (
        <ChevronDown className="h-3 w-3 shrink-0" />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0" />
      )}
      <StatusBadge status={run.status} />
      <span className="text-xs font-medium flex-1">
        {runTitle(run)}
        {logs && (
          <span className="text-muted-foreground font-normal ml-1">· {logs.length} step(s)</span>
        )}
      </span>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {run.attempt && run.attempt > 1 && (
          <span className="rounded border px-1 py-0.5">attempt {run.attempt}</span>
        )}
        {totalMs !== null && <span>{formatDuration(totalMs)}</span>}
        <Clock className="h-3 w-3" />
        <span>{timeAgo(run.startedAt)}</span>
      </div>
    </button>
  );
}
