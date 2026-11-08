import { Badge } from "@/components/ui/badge";

const TONES = {
  added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  removed: "border-destructive/30 bg-destructive/10 text-destructive",
  changed: "border-amber-500/30 bg-amber-500/10 text-amber-600",
} as const;

export function SummaryChip({
  label,
  tone,
}: {
  label: string;
  tone: "added" | "removed" | "changed";
}) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TONES[tone]}`}>
      {label}
    </Badge>
  );
}
