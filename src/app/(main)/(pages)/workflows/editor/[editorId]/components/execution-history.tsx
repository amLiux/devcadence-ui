"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebugModal } from "@/components/composed/debug-modal";
import { logToDebug } from "@/hooks/use-debug-logs";
import type { NodeDebugLog } from "@/lib/types";

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface WorkflowLog {
  id: string;
  nodeId: string;
  nodeType: string;
  stepNr: number;
  status: string;
  error: string | null;
  elapsedMs: number;
  startedAt: string;
  finishedAt: string;
  meta: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  input: Record<string, unknown> | null;
  controlFlow: Record<string, unknown> | null;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    error: "bg-red-500/10 text-red-600 border-red-500/30",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse",
    cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors[status] || colors.error}`}>
      {status}
    </span>
  );
}

function SourceLabel({ source }: { source: string }) {
  const labels: Record<string, string> = {
    test: "Test",
    webhook: "Webhook",
    manual: "Manual",
    schedule: "Schedule",
    subWorkflow: "Sub-workflow",
  };
  return <span className="text-[10px] text-muted-foreground">{labels[source] || source}</span>;
}


function RunRow({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<WorkflowLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailSteps, setDetailSteps] = useState<NodeDebugLog[] | null>(null);

  const fetchLogs = async () => {
    if (logs) return logs;
    setLoading(true);
    try {
      const r = await fetch(`/api/workflows/${run.workflowId}/runs/${run.id}`);
      const data = await r.json();
      const l = data.logs || [];
      setLogs(l);
      setLoading(false);
      return l;
    } catch {
      setLoading(false);
      return [];
    }
  };

  useEffect(() => {
    if (expanded && !logs && !loading) {
      fetchLogs();
    }
  }, [expanded]);

  const handleDetails = async () => {
    const l = await fetchLogs();
    if (l.length > 0) {
      setDetailSteps(l.map(logToDebug));
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
          {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <StatusBadge status={run.status} />
          <span className="text-xs font-medium flex-1">
            {run.status === "error"
              ? run.error?.slice(0, 50) ?? "Failed"
              : run.status === "running"
                ? "Running..."
                : "Completed"}
            {logs && <span className="text-muted-foreground font-normal ml-1">· {logs.length} step(s)</span>}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
                  <span>{formatDuration(new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime())}</span>
                </>
              )}
              <button
                onClick={handleDetails}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Details
              </button>
            </div>

            {loading && <p className="text-[10px] text-muted-foreground animate-pulse">Loading logs...</p>}

            {logs && logs.length > 0 && (
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
                      <span className="text-[10px] text-purple-500">{(log.meta as Record<string, unknown>).ai_tokens as number}tok</span>
                    )}
                    <button
                      onClick={() => setDetailSteps([logToDebug(log)])}
                      className="ml-auto text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      Details
                    </button>
                  </div>
                ))}
              </div>
            )}

            {logs && logs.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No step logs recorded.</p>
            )}
          </div>
        )}
      </div>
      {detailSteps && (
        <DebugModal
          open
          onOpenChange={() => setDetailSteps(null)}
          title={`Step ${detailSteps[0]?.title ?? "Detail"}`}
          steps={detailSteps}
        />
      )}
    </>
  );
}

export function ExecutionHistory({ workflowId }: { workflowId: string }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = () => {
    setLoading(true);
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json())
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, [workflowId]);

  return (
    <div className="p-2 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Run History</p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchRuns} disabled={loading}>
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
            <p className="text-[10px] text-muted-foreground/60">Run or test this workflow<br />to see execution history</p>
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-1.5 flex-1 overflow-auto">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
