"use client";

import { useCallback, useEffect, useState } from "react";
import { logToDebug } from "@/hooks/use-debug-logs";
import type { NodeDebugLog } from "@/lib/types";
import type { WorkflowLog, WorkflowRun } from "./run-types";

/** Fetches the step logs for one run the first time the row expands. */
export function useRunLogs(run: WorkflowRun, expanded: boolean) {
  const [logs, setLogs] = useState<WorkflowLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailSteps, setDetailSteps] = useState<NodeDebugLog[] | null>(null);

  const fetchLogs = useCallback(async () => {
    if (logs) return logs;
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/${run.workflowId}/runs/${run.id}`);
      const data = await response.json();
      const next = (data.logs || []) as WorkflowLog[];
      setLogs(next);
      return next;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [logs, run.id, run.workflowId]);

  useEffect(() => {
    if (expanded && !logs && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load logs when row expands
      void fetchLogs();
    }
  }, [expanded, fetchLogs, loading, logs]);

  const showDetails = useCallback((log: WorkflowLog) => {
    setDetailSteps([logToDebug(log)]);
  }, []);

  const showAllDetails = useCallback(async () => {
    const next = await fetchLogs();
    if (next.length > 0) setDetailSteps(next.map(logToDebug));
  }, [fetchLogs]);

  const clearDetails = useCallback(() => setDetailSteps(null), []);

  return { logs, loading, detailSteps, showDetails, showAllDetails, clearDetails };
}
