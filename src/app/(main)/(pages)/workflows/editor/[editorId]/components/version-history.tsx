"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { CustomModal } from "@/components/composed/custom-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";

interface VersionSummary {
  id: string;
  version: number;
  name: string;
  description: string;
  type: string;
  status: string;
  source: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
}

interface VersionsResponse {
  versions: VersionSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface VersionHistoryPanelProps {
  workflowId: string;
  currentNodeCount: number;
  currentEdgeCount: number;
  /** Called after a restore succeeds; the drawer reloads the canvas. */
  onRestored?: () => void;
}

const PAGE_SIZE = 10;

/** Compact relative time, so the list stays readable at a glance. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;

  return new Date(iso).toLocaleDateString();
}

export function VersionHistoryPanel({
  workflowId,
  currentNodeCount,
  currentEdgeCount,
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
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number) => {
      const data = await request<VersionsResponse>({
        endpoint: `/api/workflows/${workflowId}/versions?page=${nextPage}&pageSize=${PAGE_SIZE}`,
      });
      if (!data) return;

      setVersions((prev) => (nextPage === 1 ? data.versions : [...prev, ...data.versions]));
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

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchPage(page + 1);
    } catch {
      setError("Could not load more versions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRestore = async (versionId: string) => {
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

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 px-4 pb-2 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">Current</span>
            <Badge variant="secondary" className="text-[10px]">
              live
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {currentNodeCount} nodes · {currentEdgeCount} edges
          </p>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : versions.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No versions yet. Save the workflow to start tracking changes.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="rounded-lg border p-3"
              data-testid={`version-${version.version}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">v{version.version}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(version.createdAt)}
                    </span>
                    {version.source === "restore" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        restored
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] truncate">{version.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {version.nodeCount} nodes · {version.edgeCount} edges
                  </p>
                </div>

                {confirming === version.id ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-right text-[10px] text-muted-foreground">
                      Replaces the canvas. The current state is saved first.
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setConfirming(null)}
                        disabled={restoring === version.id}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleRestore(version.id)}
                        disabled={restoring === version.id}
                      >
                        {restoring === version.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Restore"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 px-2 text-[11px]"
                    onClick={() => setConfirming(version.id)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restore
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {versions.length < total && (
        <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
          {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Load more"}
        </Button>
      )}
    </div>
  );
}

/** Opens the version history in the shared drawer, matching the rest of the app. */
export function VersionHistoryDrawer(props: VersionHistoryPanelProps) {
  return (
    <CustomModal
      title="Version history"
      subheading="Each save stores the state it replaced, so you can always go back."
    >
      <VersionHistoryPanel {...props} />
    </CustomModal>
  );
}
