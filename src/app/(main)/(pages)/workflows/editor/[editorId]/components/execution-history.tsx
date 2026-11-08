"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunRow } from "./run-row";
import { useRunHistory } from "./use-run-history";

export function ExecutionHistory({
  workflowId,
  initialRunId,
}: {
  workflowId: string;
  initialRunId?: string | null;
}) {
  const { runs, sortedRuns, loading, refresh } = useRunHistory(workflowId);

  return (
    <div className="p-2 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Run History
        </p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && runs.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">No runs yet</p>
            <p className="text-[10px] text-muted-foreground/60">
              Run or test this workflow
              <br />
              to see execution history
            </p>
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-1.5 flex-1 overflow-auto">
          {sortedRuns.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              defaultExpanded={run.id === initialRunId}
              onRetried={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
