"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiffView } from "./diff-view";
import { VersionListItem } from "./version-list-item";
import { useVersionHistory } from "./use-version-history";
import type { VersionHistoryPanelProps } from "./types";

export function VersionHistoryPanel(props: VersionHistoryPanelProps) {
  const history = useVersionHistory(props);
  const comparison = history.comparison;

  if (comparison) {
    return (
      <DiffView
        version={comparison.version}
        diff={comparison.diff}
        onBack={history.closeComparison}
        onRestore={() => history.restore(comparison.version.id)}
        restoring={history.restoring === comparison.version.id}
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
            {history.currentCounts.nodeCount} nodes · {history.currentCounts.edgeCount} edges
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">Compare any version</p>
      </div>

      {history.error && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {history.error}
        </p>
      )}

      {history.loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : history.versions.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No versions yet. Save the workflow to start tracking changes.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.versions.map((version) => (
            <VersionListItem
              key={version.id}
              version={version}
              confirming={history.confirming === version.id}
              restoring={history.restoring === version.id}
              comparing={history.comparing === version.id}
              onCompare={() => history.compare(version)}
              onRestore={() => history.restore(version.id)}
              onConfirm={() => history.confirm(version.id)}
              onCancel={history.cancelConfirm}
            />
          ))}
        </ul>
      )}

      {history.versions.length < history.total && (
        <Button
          variant="ghost"
          size="sm"
          onClick={history.loadMore}
          disabled={history.loadingMore}
        >
          {history.loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Load more"}
        </Button>
      )}
    </div>
  );
}
