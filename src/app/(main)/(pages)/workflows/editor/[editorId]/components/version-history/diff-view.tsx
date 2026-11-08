"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowDiff } from "@/lib/workflows/diff";
import { FieldRow } from "./field-row";
import { SummaryChip } from "./summary-chip";
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
