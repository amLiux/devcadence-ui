import type { FieldDiff } from "@/lib/workflows/diff";

export function FieldRow({ field }: { field: FieldDiff }) {
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
