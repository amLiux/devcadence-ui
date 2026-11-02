"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { CustomModal } from "@/components/composed/custom-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { countGraph } from "@/lib/workflows/graph";
import { diffWorkflows, type FieldDiff, type WorkflowDiff } from "@/lib/workflows/diff";

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

interface VersionDetail {
  id: string;
  version: number;
  nodes: string | null;
  edges: string | null;
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
  /** Serialized nodes of the live canvas, so the diff reflects unsaved edits. */
  currentNodes: string;
  /** Serialized edges of the live canvas. */
  currentEdges: string;
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

function FieldRow({ field }: { field: FieldDiff }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]">
      <span className="font-mono text-muted-foreground">{field.key}</span>
      <span className="text-muted-foreground">:</span>
      <span className="rounded bg-destructive/10 px-1 font-mono text-destructive line-through decoration-destructive/40">
        {field.before ?? "(empty)"}
      </span>
      <span className="text-muted-foreground">→</span>
      <span className="rounded bg-emerald-500/10 px-1 font-mono text-emerald-600">
        {field.after ?? "(empty)"}
      </span>
    </div>
  );
}

function SummaryChip({ label, tone }: { label: string; tone: "added" | "removed" | "changed" }) {
  const tones = {
    added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    removed: "border-destructive/30 bg-destructive/10 text-destructive",
    changed: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  } as const;

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tones[tone]}`}>
      {label}
    </Badge>
  );
}

function DiffView({
  version,
  diff,
  onBack,
  onRestore,
  restoring,
}: {
  version: VersionSummary;
  diff: WorkflowDiff;
  onBack: () => void;
  onRestore: () => void;
  restoring: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const { summary } = diff;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2 max-h-[60vh]">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3 w-3" />
          All versions
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">
          v{version.version} → Current
        </span>
      </div>

      {diff.hasChanges ? (
        <div className="flex flex-wrap gap-1">
          {summary.nodesAdded > 0 && (
            <SummaryChip label={`+${summary.nodesAdded} nodes`} tone="added" />
          )}
          {summary.nodesRemoved > 0 && (
            <SummaryChip label={`-${summary.nodesRemoved} nodes`} tone="removed" />
          )}
          {summary.nodesChanged > 0 && (
            <SummaryChip label={`~${summary.nodesChanged} nodes`} tone="changed" />
          )}
          {summary.edgesAdded > 0 && (
            <SummaryChip label={`+${summary.edgesAdded} edges`} tone="added" />
          )}
          {summary.edgesRemoved > 0 && (
            <SummaryChip label={`-${summary.edgesRemoved} edges`} tone="removed" />
          )}
          {summary.edgesChanged > 0 && (
            <SummaryChip label={`~${summary.edgesChanged} edges`} tone="changed" />
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No differences between v{version.version} and the current canvas.
        </p>
      )}

      {diff.hasChanges && (
        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-lg border p-2" data-testid="diff-before">
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Before · v{version.version}
            </h4>
            <ul className="space-y-1">
              {diff.nodes.removed.map((node) => (
                <li key={`node-${node.id}`} className="truncate text-[11px] text-destructive">
                  − {node.title}
                </li>
              ))}
              {diff.edges.removed.map((edge) => (
                <li key={`edge-${edge.id}`} className="truncate text-[10px] text-destructive">
                  − {edge.label}
                </li>
              ))}
              {diff.nodes.removed.length === 0 && diff.edges.removed.length === 0 && (
                <li className="text-[10px] text-muted-foreground">Nothing removed</li>
              )}
            </ul>
          </section>

          <section className="rounded-lg border p-2" data-testid="diff-after">
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              After · Current
            </h4>
            <ul className="space-y-1">
              {diff.nodes.added.map((node) => (
                <li key={`node-${node.id}`} className="truncate text-[11px] text-emerald-600">
                  + {node.title}
                </li>
              ))}
              {diff.edges.added.map((edge) => (
                <li key={`edge-${edge.id}`} className="truncate text-[10px] text-emerald-600">
                  + {edge.label}
                </li>
              ))}
              {diff.nodes.added.length === 0 && diff.edges.added.length === 0 && (
                <li className="text-[10px] text-muted-foreground">Nothing added</li>
              )}
            </ul>
          </section>
        </div>
      )}

      {diff.nodes.changed.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-[10px] font-semibold uppercase text-muted-foreground">
            Changed nodes
          </h4>
          {diff.nodes.changed.map((node) => (
            <div
              key={node.id}
              className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2"
              data-testid={`changed-${node.id}`}
            >
              <p className="text-[11px] font-medium">{node.title}</p>
              {node.fields.map((field) => (
                <FieldRow key={field.key} field={field} />
              ))}
            </div>
          ))}
        </section>
      )}

      {diff.edges.changed.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-[10px] font-semibold uppercase text-muted-foreground">
            Changed edges
          </h4>
          {diff.edges.changed.map((edge) => (
            <div key={edge.id} className="space-y-1 rounded-lg border p-2">
              <p className="font-mono text-[10px]">{edge.label}</p>
              {edge.fields.map((field) => (
                <FieldRow key={field.key} field={field} />
              ))}
            </div>
          ))}
        </section>
      )}

      <div className="mt-auto space-y-1 border-t pt-2">
        {confirming ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Replaces the canvas. The current state is saved first.
            </p>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => setConfirming(false)}
                disabled={restoring}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-7 px-2 text-[11px]" onClick={onRestore} disabled={restoring}>
                {restoring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-[11px]"
            onClick={() => setConfirming(true)}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Restore v{version.version}
          </Button>
        )}
      </div>
    </div>
  );
}

export function VersionHistoryPanel({
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

  const handleCompare = async (version: VersionSummary) => {
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

  if (comparison) {
    return (
      <DiffView
        version={comparison.version}
        diff={comparison.diff}
        onBack={() => setComparison(null)}
        onRestore={() => handleRestore(comparison.version.id)}
        restoring={restoring === comparison.version.id}
      />
    );
  }

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
            {currentCounts.nodeCount} nodes · {currentCounts.edgeCount} edges
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">Compare any version</p>
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
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleCompare(version)}
                      disabled={comparing === version.id}
                    >
                      {comparing === version.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Compare"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setConfirming(version.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Restore
                    </Button>
                  </div>
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
      subheading="Each save stores the state it replaced. Compare any version with the current canvas."
    >
      <VersionHistoryPanel {...props} />
    </CustomModal>
  );
}
