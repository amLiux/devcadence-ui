"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "./format-relative-time";
import type { VersionSummary } from "./types";

export function VersionListItem({
  version,
  confirming,
  restoring,
  comparing,
  onCompare,
  onRestore,
  onConfirm,
  onCancel,
}: {
  version: VersionSummary;
  confirming: boolean;
  restoring: boolean;
  comparing: boolean;
  onCompare: () => void;
  onRestore: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <li className="rounded-lg border p-3" data-testid={`version-${version.version}`}>
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

        {confirming ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-right text-[10px] text-muted-foreground">
              Replaces the canvas. The current state is saved first.
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={onCancel}
                disabled={restoring}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={onRestore}
                disabled={restoring}
              >
                {restoring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={onCompare}
              disabled={comparing}
            >
              {comparing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Compare"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={onConfirm}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Restore
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
