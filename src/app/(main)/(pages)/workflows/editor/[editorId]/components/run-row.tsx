"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Loader2, RotateCcw } from "lucide-react";
import { DebugModal } from "@/components/composed/debug-modal";
import { RunLogs } from "./run-logs";
import { SourceLabel } from "./source-label";
import { StatusBadge } from "./status-badge";
import { formatDuration, timeAgo } from "./run-utils";
import { useRunLogs } from "./use-run-logs";
import type { WorkflowRun } from "./run-types";

export function RunRow({
  run,
  defaultExpanded,
  onRetried,
}: {
  run: WorkflowRun;
  defaultExpanded?: boolean;
  onRetried?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { logs, loading, detailSteps, showDetails, showAllDetails, clearDetails } = useRunLogs(
    run,
    expanded,
  );

  const canRetry = run.status === "error" && run.source !== "subWorkflow" && run.source !== "test";

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/workflows/${run.workflowId}/runs/${run.id}/retry`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setRetryError(data.error ?? "Retry failed");
        return;
      }
      onRetried?.();
    } catch {
      setRetryError("Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  const totalMs = run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null;

  return (
    <>
      <div className="border rounded-lg">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <StatusBadge status={run.status} />
          <span className="text-xs font-medium flex-1">
            {run.status === "error"
              ? (run.error?.slice(0, 50) ?? "Failed")
              : run.status === "running"
                ? "Running..."
                : "Completed"}
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

        {expanded && (
          <div className="border-t px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <SourceLabel source={run.source} />
              <span>·</span>
              <span>{new Date(run.startedAt).toLocaleString()}</span>
              {run.finishedAt && (
                <>
                  <span>·</span>
                  <span>
                    {formatDuration(
                      new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime(),
                    )}
                  </span>
                </>
              )}
              {run.retryOfRunId && (
                <>
                  <span>·</span>
                  <span>retry of {run.retryOfRunId.slice(0, 8)}</span>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {retrying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    {retrying ? "Retrying..." : "Retry"}
                  </button>
                )}
                <button
                  onClick={showAllDetails}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Details
                </button>
              </div>
            </div>

            {run.error && <p className="text-[10px] text-red-500 break-words">{run.error}</p>}

            {retryError && <p className="text-[10px] text-amber-600">{retryError}</p>}

            <RunLogs logs={logs} loading={loading} onDetails={showDetails} />
          </div>
        )}
      </div>
      {detailSteps && (
        <DebugModal
          open
          onOpenChange={clearDetails}
          title={`Step ${detailSteps[0]?.title ?? "Detail"}`}
          steps={detailSteps}
        />
      )}
    </>
  );
}
