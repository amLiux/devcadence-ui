"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkflowRun } from "./run-types";

/** Loads the run list and keeps the running runs first, then newest first. */
export function useRunHistory(workflowId: string) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((response) => response.json())
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workflowId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load of run history
    refresh();
  }, [refresh]);

  const sortedRuns = [...runs].sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return { runs, sortedRuns, loading, refresh };
}
