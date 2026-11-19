import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-10 place-items-center rounded-xl bg-zinc-950 text-white shadow-lg ring-1 ring-white/10",
        className,
      )}
    >
      <span className="text-lg font-bold tracking-tight">dd</span>
    </div>
  );
}
