"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { DebugModal } from "@/components/composed/debug-modal";
import { RunLogs } from "./run-logs";
import { RunRowSummary } from "./run-row-summary";
import { SourceLabel } from "./source-label";
import { canRetryRun, formatDuration } from "./run-utils";
import { useRunLogs } from "./use-run-logs";
import { useRunRetry } from "./use-run-retry";
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
  const { retrying, retryError, retry } = useRunRetry(run, onRetried);
  const { logs, loading, detailSteps, showDetails, showAllDetails, clearDetails } = useRunLogs(
    run,
    expanded,
  );

  const totalMs = run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null;

  return (
    <>
      <div className="border rounded-lg">
        <RunRowSummary
          run={run}
          expanded={expanded}
          logs={logs}
          totalMs={totalMs}
          onToggle={() => setExpanded(!expanded)}
        />

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
                {canRetryRun(run) && (
                  <button
                    onClick={retry}
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
