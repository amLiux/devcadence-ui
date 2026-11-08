import { SummaryChip } from "./summary-chip";
import type { WorkflowDiff } from "@/lib/workflows/diff";

export function DiffSummary({ summary }: { summary: WorkflowDiff["summary"] }) {
  return (
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
  );
}
