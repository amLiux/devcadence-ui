"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowDiff } from "@/lib/workflows/diff";
import { DiffSections } from "./diff-sections";
import { DiffSummary } from "./diff-summary";
import type { VersionSummary } from "./types";

export function DiffView({
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
        <DiffSummary summary={diff.summary} />
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No differences between v{version.version} and the current canvas.
        </p>
      )}

      <DiffSections version={version} diff={diff} />

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
