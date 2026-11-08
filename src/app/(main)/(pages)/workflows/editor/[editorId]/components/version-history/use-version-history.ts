"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { countGraph } from "@/lib/workflows/graph";
import { diffWorkflows, type WorkflowDiff } from "@/lib/workflows/diff";
import type {
  VersionDetail,
  VersionHistoryPanelProps,
  VersionsResponse,
  VersionSummary,
} from "./types";

const PAGE_SIZE = 10;

export function useVersionHistory({
  workflowId,
  currentNodes,
  currentEdges,
  onRestored,
}: VersionHistoryPanelProps) {
  const { request } = useApi();
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [comparing, setComparing] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    version: VersionSummary;
    diff: WorkflowDiff;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentCounts = useMemo(
    () => countGraph({ nodes: currentNodes, edges: currentEdges }),
    [currentNodes, currentEdges],
  );

  const fetchPage = useCallback(
    async (nextPage: number) => {
      const data = await request<VersionsResponse>({
        endpoint: `/api/workflows/${workflowId}/versions?page=${nextPage}&pageSize=${PAGE_SIZE}`,
      });
      if (!data) return;

      setVersions((previous) =>
        nextPage === 1 ? data.versions : [...previous, ...data.versions],
      );
      setTotal(data.total);
      setPage(data.page);
    },
    [request, workflowId],
  );

  useEffect(() => {
    let cancelled = false;
    // The state update happens after the request resolves, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(1)
      .catch(() => {
        if (!cancelled) setError("Could not load the version history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchPage(page + 1);
    } catch {
      setError("Could not load more versions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const compare = async (version: VersionSummary) => {
    setComparing(version.id);
    setError(null);
    try {
      const detail = await request<VersionDetail>({
        endpoint: `/api/workflows/${workflowId}/versions/${version.id}`,
      });
      if (!detail) return;

      setComparison({
        version,
        diff: diffWorkflows(detail, { nodes: currentNodes, edges: currentEdges }),
      });
    } catch {
      setError("Could not load this version.");
    } finally {
      setComparing(null);
    }
  };

  const restore = async (versionId: string) => {
    setRestoring(versionId);
    setError(null);
    try {
      await request({
        endpoint: `/api/workflows/${workflowId}/versions/${versionId}/restore`,
        method: "POST",
      });
      setConfirming(null);
      onRestored?.();
    } catch {
      setError("Could not restore this version.");
    } finally {
      setRestoring(null);
    }
  };

  return {
    versions,
    total,
    loading,
    loadingMore,
    restoring,
    confirming,
    comparing,
    comparison,
    error,
    currentCounts,
    loadMore,
    compare,
    restore,
    confirm: setConfirming,
    cancelConfirm: () => setConfirming(null),
    closeComparison: () => setComparison(null),
  };
}
