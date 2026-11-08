import type { WorkflowDiff } from "@/lib/workflows/diff";
import { FieldRow } from "./field-row";
import type { VersionSummary } from "./types";

export function DiffSections({
  version,
  diff,
}: {
  version: VersionSummary;
  diff: WorkflowDiff;
}) {
  return (
    <>
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
    </>
  );
}
