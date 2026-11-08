"use client";

import type { WorkflowLog } from "./run-types";

export function RunLogs({
  logs,
  loading,
  onDetails,
}: {
  logs: WorkflowLog[] | null;
  loading: boolean;
  onDetails: (log: WorkflowLog) => void;
}) {
  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading logs...</p>;
  }
  if (logs === null) return null;
  if (logs.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No step logs recorded.</p>;
  }

  return (
    <div className="space-y-0.5">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-2 text-[11px] py-1 px-1.5 rounded hover:bg-muted/50 group"
        >
          <span className="text-muted-foreground w-4 shrink-0 text-right">{log.stepNr}</span>
          {log.status === "success" ? (
            <span className="text-emerald-500">✓</span>
          ) : log.status === "error" ? (
            <span className="text-red-500">✗</span>
          ) : (
            <span className="text-muted-foreground">○</span>
          )}
          <span className="font-medium">{log.nodeType}</span>
          <span className="text-muted-foreground">{log.elapsedMs}ms</span>
          {log.error && <span className="text-red-500 truncate max-w-[120px]">{log.error}</span>}
          {(log.meta as Record<string, unknown> | null)?.ai_tokens != null && (
            <span className="text-[10px] text-purple-500">
              {(log.meta as Record<string, unknown>).ai_tokens as number}tok
            </span>
          )}
          <button
            onClick={() => onDetails(log)}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            Details
          </button>
        </div>
      ))}
    </div>
  );
}
